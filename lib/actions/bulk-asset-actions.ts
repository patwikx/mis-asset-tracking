// lib/actions/bulk-asset-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DepreciationMethod, Prisma, AssetHistoryAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  BulkAssetCreationData,
  BulkAssetCreationOptions,
  BulkAssetCreationResult,
  BulkAssetValidationError,
  BulkAssetPreview
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

// Function to generate next item code for bulk creation
async function generateNextItemCodeForBulk(
  businessUnitId: string, 
  categoryId: string, 
  startingIndex: number = 0
): Promise<string> {
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

    // Add the starting index for bulk creation
    nextNumber += startingIndex;

    // Format with leading zeros (3 digits)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${businessUnitCode}-${categoryCode}-${formattedNumber}`;
    
  } catch (error) {
    console.error('Error generating item code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `GEN-AST-${timestamp}-${startingIndex}`;
  }
}

// Function to generate sequential serial numbers
function generateSequentialSerialNumber(
  prefix: string,
  startNumber: number,
  index: number,
  padding: number = 3
): string {
  const number = startNumber + index;
  const paddedNumber = number.toString().padStart(padding, '0');
  return `${prefix}${paddedNumber}`;
}

// Function to validate bulk asset data
async function validateBulkAssetData(
  assetsData: BulkAssetCreationData[],
  businessUnitId: string
): Promise<BulkAssetValidationError[]> {
  const errors: BulkAssetValidationError[] = [];

  // Get all category IDs to validate
  const categoryIds = [...new Set(assetsData.map(asset => asset.categoryId))];
  const categories = await prisma.assetCategory.findMany({
    where: { id: { in: categoryIds }, isActive: true }
  });
  const validCategoryIds = new Set(categories.map(cat => cat.id));

  // Validate business unit exists
  const businessUnit = await prisma.businessUnit.findUnique({
    where: { id: businessUnitId, isActive: true }
  });

  if (!businessUnit) {
    errors.push({
      row: 0,
      field: 'businessUnitId',
      message: 'Invalid business unit'
    });
    return errors;
  }

  // Validate each asset
  assetsData.forEach((asset, index) => {
    const rowNumber = index + 1;

    // Required field validations
    if (!asset.description || asset.description.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'description',
        message: 'Description is required',
        value: asset.description
      });
    }

    if (!asset.categoryId) {
      errors.push({
        row: rowNumber,
        field: 'categoryId',
        message: 'Category is required'
      });
    } else if (!validCategoryIds.has(asset.categoryId)) {
      errors.push({
        row: rowNumber,
        field: 'categoryId',
        message: 'Invalid category ID',
        value: asset.categoryId
      });
    }

    if (!asset.quantity || asset.quantity < 1) {
      errors.push({
        row: rowNumber,
        field: 'quantity',
        message: 'Quantity must be at least 1',
        value: asset.quantity?.toString()
      });
    }

    // Validate purchase price if provided
    if (asset.purchasePrice !== undefined && asset.purchasePrice < 0) {
      errors.push({
        row: rowNumber,
        field: 'purchasePrice',
        message: 'Purchase price cannot be negative',
        value: asset.purchasePrice.toString()
      });
    }

    // Validate salvage value if provided
    if (asset.salvageValue !== undefined && asset.salvageValue < 0) {
      errors.push({
        row: rowNumber,
        field: 'salvageValue',
        message: 'Salvage value cannot be negative',
        value: asset.salvageValue.toString()
      });
    }

    // Validate useful life
    if (asset.usefulLifeYears !== undefined && asset.usefulLifeYears <= 0) {
      errors.push({
        row: rowNumber,
        field: 'usefulLifeYears',
        message: 'Useful life must be greater than 0',
        value: asset.usefulLifeYears.toString()
      });
    }

    if (asset.usefulLifeMonths !== undefined && asset.usefulLifeMonths <= 0) {
      errors.push({
        row: rowNumber,
        field: 'usefulLifeMonths',
        message: 'Useful life in months must be greater than 0',
        value: asset.usefulLifeMonths.toString()
      });
    }

    // Validate depreciation rate for declining balance
    if (asset.depreciationMethod === DepreciationMethod.DECLINING_BALANCE) {
      if (asset.depreciationRate === undefined || asset.depreciationRate <= 0 || asset.depreciationRate > 100) {
        errors.push({
          row: rowNumber,
          field: 'depreciationRate',
          message: 'Depreciation rate must be between 0 and 100 for declining balance method',
          value: asset.depreciationRate?.toString()
        });
      }
    }

    // Validate total expected units for units of production
    if (asset.depreciationMethod === DepreciationMethod.UNITS_OF_PRODUCTION) {
      if (asset.totalExpectedUnits === undefined || asset.totalExpectedUnits <= 0) {
        errors.push({
          row: rowNumber,
          field: 'totalExpectedUnits',
          message: 'Total expected units is required for units of production method',
          value: asset.totalExpectedUnits?.toString()
        });
      }
    }
  });

  return errors;
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

// Main function to preview bulk asset creation
export async function previewBulkAssetCreation(
  assetsData: BulkAssetCreationData[],
  options: BulkAssetCreationOptions,
  businessUnitId: string
): Promise<BulkAssetPreview> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Validate the data
    const errors = await validateBulkAssetData(assetsData, businessUnitId);

    // Get category names for preview
    const categoryIds = [...new Set(assetsData.map(asset => asset.categoryId))];
    const categories = await prisma.assetCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

    // Generate preview data
    const previewData = await Promise.all(
      assetsData.map(async (asset, index) => {
        const rowNumber = index + 1;
        
        // Generate item code if auto-generation is enabled
        let itemCode: string | undefined;
        if (options.autoGenerateItemCodes && asset.categoryId) {
          try {
            itemCode = await generateNextItemCodeForBulk(businessUnitId, asset.categoryId, index);
          } catch (error) {
            itemCode = `Error generating code for row ${rowNumber}`;
          }
        }

        // Generate serial number if sequential generation is enabled
        let serialNumber = asset.serialNumber;
        if (options.generateSequentialSerialNumbers && options.serialNumberPrefix) {
          serialNumber = generateSequentialSerialNumber(
            options.serialNumberPrefix,
            options.serialNumberStartNumber || 1,
            index,
            options.serialNumberPadding || 3
          );
        }

        return {
          row: rowNumber,
          description: asset.description,
          serialNumber,
          itemCode,
          purchasePrice: asset.purchasePrice,
          categoryName: categoryMap.get(asset.categoryId)
        };
      })
    );

    return serializeForClient({
      isValid: errors.length === 0,
      totalRows: assetsData.length,
      validRows: assetsData.length - errors.length,
      errors,
      previewData
    });

  } catch (error) {
    console.error('Error previewing bulk asset creation:', error);
    throw new Error('Failed to preview bulk asset creation');
  }
}

// Main function to create bulk assets
export async function createBulkAssets(
  assetsData: BulkAssetCreationData[],
  options: BulkAssetCreationOptions,
  businessUnitId: string
): Promise<BulkAssetCreationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        createdCount: 0,
        failedCount: assetsData.length,
        createdAssetIds: [],
        errors: [{ row: 0, message: 'Unauthorized access' }]
      };
    }

    // Validate the data first
    const validationErrors = await validateBulkAssetData(assetsData, businessUnitId);
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: `Validation failed: ${validationErrors.length} errors found`,
        createdCount: 0,
        failedCount: assetsData.length,
        createdAssetIds: [],
        errors: validationErrors.map(err => ({
          row: err.row,
          field: err.field,
          message: err.message
        }))
      };
    }

    const createdAssetIds: string[] = [];
    const errors: Array<{ row: number; field?: string; message: string }> = [];
    let createdCount = 0;

    // Process assets in transaction
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < assetsData.length; i++) {
        const asset = assetsData[i];
        const rowNumber = i + 1;

        try {
          // Generate item code if needed
          let itemCode: string;
          if (options.autoGenerateItemCodes) {
            itemCode = await generateNextItemCodeForBulk(businessUnitId, asset.categoryId, i);
          } else {
            // Use a fallback if no item code generation
            itemCode = `BULK-${Date.now()}-${i}`;
          }

          // Generate serial number if needed
          let serialNumber = asset.serialNumber;
          if (options.generateSequentialSerialNumbers && options.serialNumberPrefix) {
            serialNumber = generateSequentialSerialNumber(
              options.serialNumberPrefix,
              options.serialNumberStartNumber || 1,
              i,
              options.serialNumberPadding || 3
            );
          }

          // Calculate useful life months
          const usefulLifeMonths = asset.usefulLifeMonths || (asset.usefulLifeYears ? asset.usefulLifeYears * 12 : null);

          // Parse depreciation method
          let depreciationMethod: DepreciationMethod = DepreciationMethod.STRAIGHT_LINE;
          if (asset.depreciationMethod) {
            depreciationMethod = asset.depreciationMethod as DepreciationMethod;
          }

          // Prepare asset data
          const assetData: Prisma.AssetCreateInput = {
            itemCode,
            description: asset.description,
            serialNumber,
            modelNumber: asset.modelNumber,
            brand: asset.brand,
            specifications: asset.specifications 
              ? asset.specifications as Prisma.InputJsonValue 
              : Prisma.JsonNull,
            purchaseDate: asset.purchaseDate,
            purchasePrice: asset.purchasePrice ? new Prisma.Decimal(asset.purchasePrice) : null,
            warrantyExpiry: asset.warrantyExpiry,
            quantity: asset.quantity,
            status: asset.status || AssetStatus.AVAILABLE,
            location: asset.location,
            notes: asset.notes,
            
            // Depreciation fields
            depreciationMethod,
            usefulLifeYears: asset.usefulLifeYears,
            usefulLifeMonths,
            salvageValue: asset.salvageValue ? new Prisma.Decimal(asset.salvageValue) : new Prisma.Decimal(0),
            depreciationRate: asset.depreciationRate ? new Prisma.Decimal(asset.depreciationRate) : null,
            totalExpectedUnits: asset.totalExpectedUnits,
            
            category: {
              connect: { id: asset.categoryId }
            },
            businessUnit: {
              connect: { id: businessUnitId }
            },
            createdBy: {
              connect: { id: user.id }
            }
          };

          // Create the asset
          const createdAsset = await tx.asset.create({
            data: assetData
          });

          createdAssetIds.push(createdAsset.id);
          createdCount++;

          // Initialize depreciation if needed
          if (asset.purchasePrice && usefulLifeMonths && asset.startDepreciationImmediately) {
            await initializeAssetDepreciation(
              createdAsset.id,
              asset.purchasePrice,
              depreciationMethod,
              usefulLifeMonths,
              asset.salvageValue || 0,
              asset.purchaseDate || new Date(),
              asset.depreciationRate,
              asset.totalExpectedUnits
            );
          }

          // Create asset history entry
          await tx.assetHistory.create({
            data: {
              assetId: createdAsset.id,
              action: AssetHistoryAction.CREATED,
              businessUnitId,
              newStatus: asset.status || AssetStatus.AVAILABLE,
              notes: `Asset created via bulk import - Row ${rowNumber}`,
              performedById: user.id,
              metadata: {
                bulkImport: true,
                rowNumber,
                originalData: {
                  description: asset.description,
                  serialNumber,
                  purchasePrice: asset.purchasePrice
                }
              } as Prisma.InputJsonValue
            }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'CREATE',
            tableName: 'Asset',
            recordId: createdAsset.id,
            newValues: {
              itemCode,
              description: asset.description,
              serialNumber,
              purchasePrice: asset.purchasePrice,
              bulkImport: true,
              rowNumber
            } as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({
            data: auditData
          });

        } catch (error) {
          console.error(`Error creating asset for row ${rowNumber}:`, error);
          errors.push({
            row: rowNumber,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const failedCount = assetsData.length - createdCount;
    const success = createdCount > 0 && failedCount === 0;

    revalidatePath('/assets');
    
    return serializeForClient({
      success,
      message: success 
        ? `Successfully created ${createdCount} assets`
        : `Created ${createdCount} assets, ${failedCount} failed`,
      createdCount,
      failedCount,
      createdAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk asset creation:', error);
    return {
      success: false,
      message: 'Failed to create bulk assets',
      createdCount: 0,
      failedCount: assetsData.length,
      createdAssetIds: [],
      errors: [{ row: 0, message: 'System error occurred' }]
    };
  }
}

// Helper function to get asset categories for bulk creation
export async function getAssetCategoriesForBulk() {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    return serializeForClient(categories);
  } catch (error) {
    console.error('Error fetching categories for bulk creation:', error);
    throw new Error('Failed to fetch categories');
  }
}