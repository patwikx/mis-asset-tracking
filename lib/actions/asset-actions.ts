// lib/actions/asset-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DeploymentStatus, Prisma, DepreciationMethod, AssetHistoryAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AssetWithRelations,
  CreateAssetData,
  UpdateAssetData,
  AssetFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/asset-types';

// Type for audit log data
type AuditLogData = {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
};

// Extended types for depreciation
interface CreateAssetWithDepreciationData extends Omit<CreateAssetData, 'itemCode'> {
  itemCode?: string;
  // Depreciation fields
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  usefulLifeMonths?: number;
  salvageValue?: number;
  depreciationRate?: number; // For declining balance
  totalExpectedUnits?: number; // For units of production
  startDepreciationImmediately?: boolean;
}

interface UpdateAssetWithDepreciationData extends UpdateAssetData {
  // Depreciation fields
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  usefulLifeMonths?: number;
  salvageValue?: number;
  depreciationRate?: number;
  totalExpectedUnits?: number;
  currentUnits?: number;
}

interface DepreciationCalculationResult {
  success: boolean;
  message: string;
  calculatedAmount?: number;
  newBookValue?: number;
  isFullyDepreciated?: boolean;
}

interface DepreciationSummary {
  totalAssets: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  fullyDepreciatedAssets: number;
  assetsDueForDepreciation: number;
}

// Function to generate next item code
async function generateNextItemCode(businessUnitId: string, categoryId: string): Promise<string> {
  try {
    // Get category code
    const category = await prisma.assetCategory.findUnique({
      where: { id: categoryId },
      select: { code: true }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Get business unit code
    const businessUnit = await prisma.businessUnit.findUnique({
      where: { id: businessUnitId },
      select: { code: true }
    });

    const businessUnitCode = businessUnit?.code || 'GEN';
    const categoryCode = category.code;
    
    // Find the latest item code for this category and business unit
    const latestAsset = await prisma.asset.findFirst({
      where: {
        categoryId,
        businessUnitId,
        itemCode: {
          startsWith: `${businessUnitCode}-${categoryCode}-`
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let nextNumber = 1;
    
    if (latestAsset) {
      // Extract the number from the latest item code
      // Format: BU-CAT-001
      const parts = latestAsset.itemCode.split('-');
      if (parts.length >= 3) {
        const numberPart = parts[parts.length - 1];
        const currentNumber = parseInt(numberPart, 10);
        if (!isNaN(currentNumber)) {
          nextNumber = currentNumber + 1;
        }
      }
    }

    // Format with leading zeros (3 digits)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${businessUnitCode}-${categoryCode}-${formattedNumber}`;
    
  } catch (error) {
    console.error('Error generating item code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `GEN-AST-${timestamp}`;
  }
}

// Function to calculate depreciation amount based on method
function calculateDepreciationAmount(
  purchasePrice: number,
  salvageValue: number,
  method: DepreciationMethod,
  usefulLifeMonths: number,
  currentBookValue: number,
  depreciationRate?: number,
  totalExpectedUnits?: number,
  unitsInPeriod?: number
): number {
  switch (method) {
    case DepreciationMethod.STRAIGHT_LINE:
      return (purchasePrice - salvageValue) / usefulLifeMonths;
    
    case DepreciationMethod.DECLINING_BALANCE:
      if (!depreciationRate) return 0;
      return currentBookValue * (depreciationRate / 12); // Monthly rate
    
    case DepreciationMethod.UNITS_OF_PRODUCTION:
      if (!totalExpectedUnits || !unitsInPeriod) return 0;
      const depreciationPerUnit = (purchasePrice - salvageValue) / totalExpectedUnits;
      return depreciationPerUnit * unitsInPeriod;
    
    case DepreciationMethod.SUM_OF_YEARS_DIGITS:
      const yearsRemaining = Math.ceil(usefulLifeMonths / 12);
      const totalYears = Math.ceil(usefulLifeMonths / 12);
      const sumOfYears = (totalYears * (totalYears + 1)) / 2;
      const yearlyDepreciation = ((purchasePrice - salvageValue) * yearsRemaining) / sumOfYears;
      return yearlyDepreciation / 12; // Monthly amount
    
    default:
      return 0;
  }
}

// Function to initialize depreciation for new asset
async function initializeAssetDepreciation(
  assetId: string,
  purchasePrice: number,
  depreciationMethod: DepreciationMethod,
  usefulLifeMonths: number,
  salvageValue: number,
  startDate: Date,
  depreciationRate?: number,
  totalExpectedUnits?: number
): Promise<void> {
  const monthlyDepreciation = calculateDepreciationAmount(
    purchasePrice,
    salvageValue,
    depreciationMethod,
    usefulLifeMonths,
    purchasePrice, // Initial book value
    depreciationRate,
    totalExpectedUnits
  );

  const nextDepreciationDate = new Date(startDate);
  nextDepreciationDate.setMonth(nextDepreciationDate.getMonth() + 1);

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      currentBookValue: new Prisma.Decimal(purchasePrice),
      monthlyDepreciation: new Prisma.Decimal(monthlyDepreciation),
      depreciationStartDate: startDate,
      nextDepreciationDate,
      depreciationPerUnit: totalExpectedUnits 
        ? new Prisma.Decimal((purchasePrice - salvageValue) / totalExpectedUnits)
        : null
    }
  });
}

// New function to get next available item code for preview
export async function getNextItemCode(businessUnitId: string, categoryId: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    if (!categoryId) {
      return 'Select category first';
    }

    return await generateNextItemCode(businessUnitId, categoryId);
  } catch (error) {
    console.error('Error getting next item code:', error);
    return 'Error generating code';
  }
}

export async function getAssets(
  businessUnitId: string,
  filters: AssetFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, categoryId, status, minPrice, maxPrice } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build the where clause with proper typing
    const baseWhere: Prisma.AssetWhereInput = {
      isActive: true,
      businessUnitId,
    };

    if (categoryId) {
      baseWhere.categoryId = categoryId;
    }

    if (status) {
      baseWhere.status = status;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      baseWhere.purchasePrice = {};
      if (minPrice !== undefined) {
        baseWhere.purchasePrice.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        baseWhere.purchasePrice.lte = new Prisma.Decimal(maxPrice);
      }
    }

    if (search) {
      baseWhere.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: baseWhere,
        include: {
          category: true,
          businessUnit: true,
          deployments: {
            where: { status: DeploymentStatus.DEPLOYED },
            take: 1
          },
          createdBy: true,
          depreciationHistory: {
            orderBy: { depreciationDate: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.asset.count({ where: baseWhere })
    ]);

    return serializeForClient({
      data: assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw new Error('Failed to fetch assets');
  }
}

export async function getAssetById(id: string): Promise<AssetWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const asset = await prisma.asset.findUnique({
      where: { id, isActive: true },
      include: {
        category: true,
        businessUnit: true,
        deployments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        createdBy: true,
        depreciationHistory: {
          orderBy: { depreciationDate: 'desc' },
          take: 10 // Get last 10 depreciation entries
        }
      }
    });

    return asset ? serializeForClient(asset) : null;
  } catch (error) {
    console.error('Error fetching asset:', error);
    throw new Error('Failed to fetch asset');
  }
}

export async function createAsset(data: CreateAssetWithDepreciationData): Promise<{ success: boolean; message: string; assetId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Generate item code if not provided
    const itemCode = data.itemCode || await generateNextItemCode(data.businessUnitId, data.categoryId);

    // Check if generated item code already exists
    const existingAsset = await prisma.asset.findFirst({
      where: { 
        itemCode,
        isActive: true
      }
    });

    if (existingAsset) {
      return { success: false, message: 'Generated item code already exists. Please try again.' };
    }

    // Prepare depreciation fields
    const usefulLifeMonths = data.usefulLifeMonths || (data.usefulLifeYears ? data.usefulLifeYears * 12 : null);

    // Prepare asset data with proper types
    const assetData: Prisma.AssetCreateInput = {
      itemCode,
      description: data.description,
      serialNumber: data.serialNumber,
      modelNumber: data.modelNumber,
      brand: data.brand,
      specifications: data.specifications 
        ? data.specifications as Prisma.InputJsonValue 
        : Prisma.JsonNull,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice ? new Prisma.Decimal(data.purchasePrice) : null,
      warrantyExpiry: data.warrantyExpiry,
      quantity: data.quantity,
      status: data.status || AssetStatus.AVAILABLE,
      location: data.location,
      notes: data.notes,
      
      // Depreciation fields
      depreciationMethod: data.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      usefulLifeYears: data.usefulLifeYears,
      usefulLifeMonths,
      salvageValue: data.salvageValue ? new Prisma.Decimal(data.salvageValue) : new Prisma.Decimal(0),
      depreciationRate: data.depreciationRate ? new Prisma.Decimal(data.depreciationRate) : null,
      totalExpectedUnits: data.totalExpectedUnits,
      
      category: {
        connect: { id: data.categoryId }
      },
      businessUnit: {
        connect: { id: data.businessUnitId }
      },
      createdBy: {
        connect: { id: user.id }
      }
    };

    const asset = await prisma.asset.create({
      data: assetData
    });

    // Initialize depreciation if purchase price exists and should start immediately
    if (data.purchasePrice && usefulLifeMonths && data.startDepreciationImmediately) {
      await initializeAssetDepreciation(
        asset.id,
        data.purchasePrice,
        data.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        usefulLifeMonths,
        data.salvageValue || 0,
        data.purchaseDate || new Date(),
        data.depreciationRate,
        data.totalExpectedUnits
      );
    }

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'CREATE',
      tableName: 'Asset',
      recordId: asset.id,
      newValues: {
        itemCode,
        description: data.description,
        purchasePrice: data.purchasePrice,
        depreciationMethod: data.depreciationMethod,
        usefulLifeYears: data.usefulLifeYears,
        salvageValue: data.salvageValue
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets');
    return { success: true, message: 'Asset created successfully', assetId: asset.id };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { success: false, message: 'Failed to create asset' };
  }
}

export async function updateAsset(data: UpdateAssetWithDepreciationData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current asset for audit trail
    const currentAsset = await prisma.asset.findUnique({
      where: { id, isActive: true }
    });

    if (!currentAsset) {
      return { success: false, message: 'Asset not found' };
    }

    // Remove itemCode from updateData if it exists (prevent changing item codes)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { itemCode, ...sanitizedUpdateData } = updateData as UpdateAssetWithDepreciationData & { itemCode?: string };

    // Calculate useful life months if years provided
    const usefulLifeMonths = sanitizedUpdateData.usefulLifeMonths || 
      (sanitizedUpdateData.usefulLifeYears ? sanitizedUpdateData.usefulLifeYears * 12 : undefined);

    // Prepare update data with proper types
    const assetUpdateData: Prisma.AssetUpdateInput = {
      ...sanitizedUpdateData,
      specifications: sanitizedUpdateData.specifications !== undefined
        ? (sanitizedUpdateData.specifications 
          ? sanitizedUpdateData.specifications as Prisma.InputJsonValue 
          : Prisma.JsonNull)
        : undefined,
      purchasePrice: sanitizedUpdateData.purchasePrice 
        ? new Prisma.Decimal(sanitizedUpdateData.purchasePrice) 
        : undefined,
      salvageValue: sanitizedUpdateData.salvageValue !== undefined
        ? new Prisma.Decimal(sanitizedUpdateData.salvageValue)
        : undefined,
      depreciationRate: sanitizedUpdateData.depreciationRate !== undefined
        ? (sanitizedUpdateData.depreciationRate ? new Prisma.Decimal(sanitizedUpdateData.depreciationRate) : null)
        : undefined,
      usefulLifeMonths,
      updatedAt: new Date()
    };

    await prisma.asset.update({
      where: { id },
      data: assetUpdateData
    });

    // Recalculate depreciation if depreciation-related fields changed
    if (sanitizedUpdateData.depreciationMethod || 
        sanitizedUpdateData.usefulLifeYears || 
        sanitizedUpdateData.usefulLifeMonths ||
        sanitizedUpdateData.salvageValue ||
        sanitizedUpdateData.depreciationRate) {
      
      const updatedAsset = await prisma.asset.findUnique({
        where: { id }
      });
      
      if (updatedAsset?.purchasePrice && updatedAsset.usefulLifeMonths) {
        const monthlyDepreciation = calculateDepreciationAmount(
          updatedAsset.purchasePrice.toNumber(),
          updatedAsset.salvageValue?.toNumber() || 0,
          updatedAsset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
          updatedAsset.usefulLifeMonths,
          updatedAsset.currentBookValue?.toNumber() || updatedAsset.purchasePrice.toNumber(),
          updatedAsset.depreciationRate?.toNumber(),
          updatedAsset.totalExpectedUnits || undefined
        );

        await prisma.asset.update({
          where: { id },
          data: {
            monthlyDepreciation: new Prisma.Decimal(monthlyDepreciation)
          }
        });
      }
    }

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'Asset',
      recordId: id,
      oldValues: {
        depreciationMethod: currentAsset.depreciationMethod,
        usefulLifeYears: currentAsset.usefulLifeYears,
        salvageValue: currentAsset.salvageValue?.toNumber(),
        currentBookValue: currentAsset.currentBookValue?.toNumber()
      } as Prisma.InputJsonValue,
      newValues: sanitizedUpdateData as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets');
    revalidatePath(`/assets/${id}`);
    return { success: true, message: 'Asset updated successfully' };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { success: false, message: 'Failed to update asset' };
  }
}

// New function: Calculate depreciation for a single asset
export async function calculateAssetDepreciation(
  assetId: string,
  unitsInPeriod?: number
): Promise<DepreciationCalculationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true },
      include: { businessUnit: true }
    });

    if (!asset || !asset.purchasePrice || !asset.usefulLifeMonths) {
      return { success: false, message: 'Asset not found or missing depreciation data' };
    }

    if (asset.isFullyDepreciated) {
      return { success: false, message: 'Asset is already fully depreciated' };
    }

    const currentBookValue = asset.currentBookValue?.toNumber() || asset.purchasePrice.toNumber();
    const salvageValue = asset.salvageValue?.toNumber() || 0;

    if (currentBookValue <= salvageValue) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { isFullyDepreciated: true }
      });
      return { success: false, message: 'Asset has reached its salvage value' };
    }

    const depreciationAmount = calculateDepreciationAmount(
      asset.purchasePrice.toNumber(),
      salvageValue,
      asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      asset.usefulLifeMonths,
      currentBookValue,
      asset.depreciationRate?.toNumber(),
      asset.totalExpectedUnits || undefined,
      unitsInPeriod
    );

    const newBookValue = Math.max(currentBookValue - depreciationAmount, salvageValue);
    const actualDepreciation = currentBookValue - newBookValue;
    const isFullyDepreciated = newBookValue <= salvageValue;

    // Create depreciation record
    const periodStart = asset.lastDepreciationDate || asset.depreciationStartDate || asset.purchaseDate || new Date();
    const periodEnd = new Date();

    await prisma.assetDepreciation.create({
      data: {
        assetId,
        businessUnitId: asset.businessUnitId,
        depreciationDate: periodEnd,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        bookValueStart: new Prisma.Decimal(currentBookValue),
        depreciationAmount: new Prisma.Decimal(actualDepreciation),
        bookValueEnd: new Prisma.Decimal(newBookValue),
        accumulatedDepreciation: new Prisma.Decimal(
          (asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation
        ),
        method: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        calculationBasis: {
          originalCost: asset.purchasePrice.toNumber(),
          salvageValue,
          usefulLifeMonths: asset.usefulLifeMonths,
          unitsInPeriod
        } as Prisma.InputJsonValue,
        unitsStart: unitsInPeriod ? asset.currentUnits : null,
        unitsEnd: unitsInPeriod ? asset.currentUnits + unitsInPeriod : null,
        unitsInPeriod,
        calculatedBy: user.id
      }
    });

    // Update asset
    const nextDepreciationDate = new Date(periodEnd);
    nextDepreciationDate.setMonth(nextDepreciationDate.getMonth() + 1);

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        currentBookValue: new Prisma.Decimal(newBookValue),
        accumulatedDepreciation: new Prisma.Decimal(
          (asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation
        ),
        lastDepreciationDate: periodEnd,
        nextDepreciationDate: isFullyDepreciated ? null : nextDepreciationDate,
        isFullyDepreciated,
        currentUnits: unitsInPeriod ? asset.currentUnits + unitsInPeriod : asset.currentUnits,
        status: isFullyDepreciated ? AssetStatus.FULLY_DEPRECIATED : asset.status
      }
    });

    // Create asset history entry
    await prisma.assetHistory.create({
      data: {
        assetId,
        action: AssetHistoryAction.DEPRECIATION_CALCULATED,
        businessUnitId: asset.businessUnitId,
        previousBookValue: new Prisma.Decimal(currentBookValue),
        newBookValue: new Prisma.Decimal(newBookValue),
        depreciationAmount: new Prisma.Decimal(actualDepreciation),
        notes: `Depreciation calculated: ${asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE}`,
        performedById: user.id,
        metadata: {
          method: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          unitsInPeriod
        } as Prisma.InputJsonValue
      }
    });

    return {
      success: true,
      message: `Depreciation calculated successfully`,
      calculatedAmount: actualDepreciation,
      newBookValue,
      isFullyDepreciated
    };

  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return { success: false, message: 'Failed to calculate depreciation' };
  }
}

// New function: Batch calculate depreciation for assets due
export async function calculateBatchDepreciation(businessUnitId?: string): Promise<{
  success: boolean;
  message: string;
  processedAssets: number;
  totalDepreciation: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized', processedAssets: 0, totalDepreciation: 0 };
    }

    const whereClause: Prisma.AssetWhereInput = {
      isActive: true,
      isFullyDepreciated: false,
      nextDepreciationDate: {
        lte: new Date()
      },
      purchasePrice: { not: null },
      usefulLifeMonths: { not: null }
    };

    if (businessUnitId) {
      whereClause.businessUnitId = businessUnitId;
    }

    const assetsDue = await prisma.asset.findMany({
      where: whereClause,
      include: { businessUnit: true }
    });

    let processedAssets = 0;
    let totalDepreciation = 0;

    for (const asset of assetsDue) {
      const result = await calculateAssetDepreciation(asset.id);
      if (result.success && result.calculatedAmount) {
        processedAssets++;
        totalDepreciation += result.calculatedAmount;
      }
    }

    revalidatePath('/assets');
    revalidatePath('/reports/depreciation');

    return {
      success: true,
      message: `Processed ${processedAssets} assets for depreciation`,
      processedAssets,
      totalDepreciation
    };

  } catch (error) {
    console.error('Error in batch depreciation:', error);
    return { 
      success: false, 
      message: 'Failed to process batch depreciation',
      processedAssets: 0,
      totalDepreciation: 0
    };
  }
}

// New function: Get depreciation summary
export async function getDepreciationSummary(businessUnitId: string): Promise<DepreciationSummary> {
  try {
    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        businessUnitId,
        purchasePrice: { not: null }
      }
    });

    const totalAssets = assets.length;
    const totalOriginalValue = assets.reduce((sum, asset) => 
      sum + (asset.purchasePrice?.toNumber() || 0), 0
    );
    const totalCurrentValue = assets.reduce((sum, asset) => 
      sum + (asset.currentBookValue?.toNumber() || asset.purchasePrice?.toNumber() || 0), 0
    );
    const totalDepreciation = assets.reduce((sum, asset) => 
      sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0
    );
    const fullyDepreciatedAssets = assets.filter(asset => asset.isFullyDepreciated).length;
    const assetsDueForDepreciation = assets.filter(asset => 
      asset.nextDepreciationDate && asset.nextDepreciationDate <= new Date()
    ).length;

    return {
      totalAssets,
      totalOriginalValue,
      totalCurrentValue,
      totalDepreciation,
      fullyDepreciatedAssets,
      assetsDueForDepreciation
    };

  } catch (error) {
    console.error('Error getting depreciation summary:', error);
    throw new Error('Failed to get depreciation summary');
  }
}

// New function: Get assets due for depreciation
export async function getAssetsDueForDepreciation(businessUnitId?: string): Promise<Array<AssetWithRelations & {
  depreciationHistory: Array<{
    id: string;
    depreciationDate: Date;
    depreciationAmount: Prisma.Decimal;
    bookValueEnd: Prisma.Decimal;
  }>;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const whereClause: Prisma.AssetWhereInput = {
      isActive: true,
      isFullyDepreciated: false,
      nextDepreciationDate: {
        lte: new Date()
      }
    };

    if (businessUnitId) {
      whereClause.businessUnitId = businessUnitId;
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        businessUnit: true,
        createdBy: true,
        deployments: {
          where: { status: DeploymentStatus.DEPLOYED },
          take: 1
        },
        depreciationHistory: {
          orderBy: { depreciationDate: 'desc' },
          take: 1
        }
      },
      orderBy: { nextDepreciationDate: 'asc' }
    });

    return serializeForClient(assets);

  } catch (error) {
    console.error('Error fetching assets due for depreciation:', error);
    throw new Error('Failed to fetch assets due for depreciation');
  }
}

export async function deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if asset has active deployments
    const activeDeployments = await prisma.assetDeployment.count({
      where: {
        assetId: id,
        status: DeploymentStatus.DEPLOYED,
        returnedDate: null
      }
    });

    if (activeDeployments > 0) {
      return { success: false, message: 'Cannot delete asset with active deployments' };
    }

    // Soft delete
    await prisma.asset.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'DELETE',
      tableName: 'Asset',
      recordId: id,
      newValues: { isActive: false } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets');
    return { success: true, message: 'Asset deleted successfully' };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, message: 'Failed to delete asset' };
  }
}

export async function getAssetCategories() {
  try {
    const categories = await prisma.assetCategory.findMany({
      include: {
        _count: {
          select: {
            assets: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return serializeForClient(categories);
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    throw new Error('Failed to fetch asset categories');
  }
}

export async function getBusinessUnits() {
  try {
    const businessUnits = await prisma.businessUnit.findMany({
      orderBy: { name: 'asc' }
    });

    return serializeForClient(businessUnits);
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}

export async function getAssetStatuses(): Promise<AssetStatus[]> {
  return Object.values(AssetStatus);
}

export async function getDepreciationMethods(): Promise<DepreciationMethod[]> {
  return Object.values(DepreciationMethod);
}

// New function: Get asset depreciation history
export async function getAssetDepreciationHistory(assetId: string): Promise<Prisma.AssetDepreciationGetPayload<{
  include: {
    asset: {
      select: {
        itemCode: true;
        description: true;
      }
    };
    businessUnit: {
      select: {
        name: true;
        code: true;
      }
    };
  }
}>[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const history = await prisma.assetDepreciation.findMany({
      where: { assetId },
      include: {
        asset: {
          select: {
            itemCode: true,
            description: true
          }
        },
        businessUnit: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: { depreciationDate: 'desc' }
    });

    return serializeForClient(history);
  } catch (error) {
    console.error('Error fetching depreciation history:', error);
    throw new Error('Failed to fetch depreciation history');
  }
}

// New function: Preview depreciation calculation without saving
export async function previewDepreciationCalculation(
  assetId: string,
  unitsInPeriod?: number
): Promise<{
  success: boolean;
  message: string;
  preview?: {
    currentBookValue: number;
    depreciationAmount: number;
    newBookValue: number;
    remainingValue: number;
    percentageDepreciated: number;
  }
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset || !asset.purchasePrice || !asset.usefulLifeMonths) {
      return { success: false, message: 'Asset not found or missing depreciation data' };
    }

    if (asset.isFullyDepreciated) {
      return { success: false, message: 'Asset is already fully depreciated' };
    }

    const currentBookValue = asset.currentBookValue?.toNumber() || asset.purchasePrice.toNumber();
    const salvageValue = asset.salvageValue?.toNumber() || 0;

    if (currentBookValue <= salvageValue) {
      return { success: false, message: 'Asset has reached its salvage value' };
    }

    const depreciationAmount = calculateDepreciationAmount(
      asset.purchasePrice.toNumber(),
      salvageValue,
      asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      asset.usefulLifeMonths,
      currentBookValue,
      asset.depreciationRate?.toNumber(),
      asset.totalExpectedUnits || undefined,
      unitsInPeriod
    );

    const newBookValue = Math.max(currentBookValue - depreciationAmount, salvageValue);
    const actualDepreciation = currentBookValue - newBookValue;
    const remainingValue = newBookValue - salvageValue;
    const totalDepreciableAmount = asset.purchasePrice.toNumber() - salvageValue;
    const percentageDepreciated = totalDepreciableAmount > 0 
      ? ((asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation) / totalDepreciableAmount * 100
      : 100;

    return {
      success: true,
      message: 'Depreciation preview calculated',
      preview: {
        currentBookValue,
        depreciationAmount: actualDepreciation,
        newBookValue,
        remainingValue,
        percentageDepreciated: Math.round(percentageDepreciated * 100) / 100
      }
    };

  } catch (error) {
    console.error('Error previewing depreciation:', error);
    return { success: false, message: 'Failed to preview depreciation calculation' };
  }
}

// New function: Update asset units (for units of production depreciation)
export async function updateAssetUnits(
  assetId: string,
  unitsProduced: number
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    if (asset.depreciationMethod !== DepreciationMethod.UNITS_OF_PRODUCTION) {
      return { success: false, message: 'Asset does not use units of production depreciation method' };
    }

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        currentUnits: asset.currentUnits + unitsProduced
      }
    });

    // Create history entry
    await prisma.assetHistory.create({
      data: {
        assetId,
        action: AssetHistoryAction.UPDATED,
        businessUnitId: asset.businessUnitId,
        notes: `Units updated: +${unitsProduced} (Total: ${asset.currentUnits + unitsProduced})`,
        performedById: user.id,
        metadata: {
          unitsAdded: unitsProduced,
          previousUnits: asset.currentUnits,
          newUnits: asset.currentUnits + unitsProduced
        } as Prisma.InputJsonValue
      }
    });

    // If asset has accumulated enough units, trigger depreciation calculation
    if (asset.depreciationPerUnit && unitsProduced > 0) {
      await calculateAssetDepreciation(assetId, unitsProduced);
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${assetId}`);
    return { success: true, message: 'Asset units updated successfully' };

  } catch (error) {
    console.error('Error updating asset units:', error);
    return { success: false, message: 'Failed to update asset units' };
  }
}

// New function: Get depreciation schedule for an asset
export async function getAssetDepreciationSchedule(assetId: string): Promise<{
  success: boolean;
  message: string;
  schedule?: Array<{
    period: number;
    date: Date;
    bookValueStart: number;
    depreciationAmount: number;
    bookValueEnd: number;
    accumulatedDepreciation: number;
  }>;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset || !asset.purchasePrice || !asset.usefulLifeMonths) {
      return { success: false, message: 'Asset not found or missing depreciation data' };
    }

    const schedule: Array<{
      period: number;
      date: Date;
      bookValueStart: number;
      depreciationAmount: number;
      bookValueEnd: number;
      accumulatedDepreciation: number;
    }> = [];

    const purchasePrice = asset.purchasePrice.toNumber();
    const salvageValue = asset.salvageValue?.toNumber() || 0;
    const usefulLifeMonths = asset.usefulLifeMonths;
    const startDate = asset.depreciationStartDate || asset.purchaseDate || new Date();

    let currentBookValue = purchasePrice;
    let accumulatedDepreciation = 0;

    for (let period = 1; period <= usefulLifeMonths; period++) {
      const periodDate = new Date(startDate);
      periodDate.setMonth(periodDate.getMonth() + period - 1);

      let depreciationAmount = 0;

      switch (asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE) {
        case DepreciationMethod.STRAIGHT_LINE:
          depreciationAmount = (purchasePrice - salvageValue) / usefulLifeMonths;
          break;
        
        case DepreciationMethod.DECLINING_BALANCE:
          if (asset.depreciationRate) {
            const monthlyRate = asset.depreciationRate.toNumber() / 12;
            depreciationAmount = currentBookValue * monthlyRate;
          }
          break;
        
        case DepreciationMethod.SUM_OF_YEARS_DIGITS:
          const totalYears = Math.ceil(usefulLifeMonths / 12);
          const currentYear = Math.ceil(period / 12);
          const remainingYears = totalYears - currentYear + 1;
          const sumOfYears = (totalYears * (totalYears + 1)) / 2;
          const yearlyDepreciation = ((purchasePrice - salvageValue) * remainingYears) / sumOfYears;
          depreciationAmount = yearlyDepreciation / 12;
          break;
        
        default:
          depreciationAmount = (purchasePrice - salvageValue) / usefulLifeMonths;
      }

      // Ensure we don't depreciate below salvage value
      const maxDepreciation = currentBookValue - salvageValue;
      depreciationAmount = Math.min(depreciationAmount, maxDepreciation);

      const bookValueEnd = currentBookValue - depreciationAmount;
      accumulatedDepreciation += depreciationAmount;

      schedule.push({
        period,
        date: periodDate,
        bookValueStart: Math.round(currentBookValue * 100) / 100,
        depreciationAmount: Math.round(depreciationAmount * 100) / 100,
        bookValueEnd: Math.round(bookValueEnd * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100
      });

      currentBookValue = bookValueEnd;

      // Stop if we've reached salvage value
      if (currentBookValue <= salvageValue) {
        break;
      }
    }

    return {
      success: true,
      message: 'Depreciation schedule calculated',
      schedule
    };

  } catch (error) {
    console.error('Error calculating depreciation schedule:', error);
    return { success: false, message: 'Failed to calculate depreciation schedule' };
  }
}