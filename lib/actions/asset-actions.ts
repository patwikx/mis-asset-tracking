// lib/actions/asset-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DeploymentStatus, Prisma } from '@prisma/client';
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
          createdBy: true
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
        createdBy: true
      }
    });

    return asset ? serializeForClient(asset) : null;
  } catch (error) {
    console.error('Error fetching asset:', error);
    throw new Error('Failed to fetch asset');
  }
}

// Modified CreateAssetData type to make itemCode optional
type CreateAssetDataWithoutItemCode = Omit<CreateAssetData, 'itemCode'> & {
  itemCode?: string;
};

export async function createAsset(data: CreateAssetDataWithoutItemCode): Promise<{ success: boolean; message: string; assetId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Generate item code if not provided
    const itemCode = data.itemCode || await generateNextItemCode(data.businessUnitId, data.categoryId);

    // Check if generated item code already exists (very unlikely but safety check)
    const existingAsset = await prisma.asset.findFirst({
      where: { 
        itemCode,
        isActive: true
      }
    });

    if (existingAsset) {
      return { success: false, message: 'Generated item code already exists. Please try again.' };
    }

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

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'CREATE',
      tableName: 'Asset',
      recordId: asset.id,
      newValues: {
        itemCode,
        description: data.description,
        serialNumber: data.serialNumber,
        modelNumber: data.modelNumber,
        brand: data.brand,
        specifications: data.specifications,
        purchaseDate: data.purchaseDate?.toISOString(),
        purchasePrice: data.purchasePrice,
        warrantyExpiry: data.warrantyExpiry?.toISOString(),
        categoryId: data.categoryId,
        businessUnitId: data.businessUnitId,
        quantity: data.quantity,
        status: data.status,
        location: data.location,
        notes: data.notes
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

export async function updateAsset(data: UpdateAssetData): Promise<{ success: boolean; message: string }> {
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

    // For updates, we don't allow changing item codes
    // Remove itemCode from updateData if it exists
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { itemCode, ...sanitizedUpdateData } = updateData as UpdateAssetData & { itemCode?: string };

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
      updatedAt: new Date()
    };

    await prisma.asset.update({
      where: { id },
      data: assetUpdateData
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'Asset',
      recordId: id,
      oldValues: {
        itemCode: currentAsset.itemCode,
        description: currentAsset.description,
        serialNumber: currentAsset.serialNumber,
        modelNumber: currentAsset.modelNumber,
        brand: currentAsset.brand,
        specifications: currentAsset.specifications,
        purchaseDate: currentAsset.purchaseDate?.toISOString(),
        purchasePrice: currentAsset.purchasePrice?.toNumber(),
        warrantyExpiry: currentAsset.warrantyExpiry?.toISOString(),
        categoryId: currentAsset.categoryId,
        businessUnitId: currentAsset.businessUnitId,
        quantity: currentAsset.quantity,
        status: currentAsset.status,
        location: currentAsset.location,
        notes: currentAsset.notes
      } as Prisma.InputJsonValue,
      newValues: {
        ...sanitizedUpdateData,
        specifications: sanitizedUpdateData.specifications,
        purchaseDate: sanitizedUpdateData.purchaseDate?.toISOString(),
        purchasePrice: sanitizedUpdateData.purchasePrice,
        warrantyExpiry: sanitizedUpdateData.warrantyExpiry?.toISOString()
      } as Prisma.InputJsonValue,
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