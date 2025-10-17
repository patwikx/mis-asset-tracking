// lib/actions/bulk-operations-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DeploymentStatus, Prisma, AssetHistoryAction, DepreciationMethod } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  BulkAssetUpdateData,
  BulkAssetOperationResult,
  BulkDeploymentCreationData,
  BulkReturnData,
  AssetSelectionCriteria,
  BulkOperationPreview,
  AssetWithRelations
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

// Function to generate next transmittal number for bulk deployments
async function generateBulkTransmittalNumbers(count: number): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const prefix = `TN-${currentYear}-`;
  
  // Get the latest transmittal number for the current year
  const latestDeployment = await prisma.assetDeployment.findFirst({
    where: {
      transmittalNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      transmittalNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (latestDeployment) {
    const numberPart = latestDeployment.transmittalNumber.replace(prefix, '');
    nextNumber = parseInt(numberPart) + 1;
  }

  // Generate sequential transmittal numbers
  const transmittalNumbers: string[] = [];
  for (let i = 0; i < count; i++) {
    const transmittalNumber = `${prefix}${(nextNumber + i).toString().padStart(4, '0')}`;
    transmittalNumbers.push(transmittalNumber);
  }

  return transmittalNumbers;
}

// Get assets based on selection criteria
export async function getAssetsBySelection(
  businessUnitId: string,
  criteria: AssetSelectionCriteria
): Promise<AssetWithRelations[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Build where clause
    const whereClause: Prisma.AssetWhereInput = {
      isActive: true,
      businessUnitId
    };

    if (criteria.categoryIds && criteria.categoryIds.length > 0) {
      whereClause.categoryId = { in: criteria.categoryIds };
    }

    if (criteria.statuses && criteria.statuses.length > 0) {
      whereClause.status = { in: criteria.statuses };
    }

    if (criteria.locationPattern) {
      whereClause.location = {
        contains: criteria.locationPattern,
        mode: 'insensitive'
      };
    }

    if (criteria.purchaseDateRange) {
      whereClause.purchaseDate = {
        gte: criteria.purchaseDateRange.from,
        lte: criteria.purchaseDateRange.to
      };
    }

    if (criteria.priceRange) {
      whereClause.purchasePrice = {
        gte: new Prisma.Decimal(criteria.priceRange.min),
        lte: new Prisma.Decimal(criteria.priceRange.max)
      };
    }

    if (criteria.searchTerm) {
      whereClause.OR = [
        { itemCode: { contains: criteria.searchTerm, mode: 'insensitive' } },
        { description: { contains: criteria.searchTerm, mode: 'insensitive' } },
        { serialNumber: { contains: criteria.searchTerm, mode: 'insensitive' } },
        { brand: { contains: criteria.searchTerm, mode: 'insensitive' } }
      ];
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        businessUnit: true,
        deployments: {
          where: { status: DeploymentStatus.DEPLOYED },
          take: 1
        },
        createdBy: true
      },
      orderBy: { itemCode: 'asc' }
    });

    return serializeForClient(assets);
  } catch (error) {
    console.error('Error fetching assets by selection:', error);
    throw new Error('Failed to fetch assets');
  }
}

// Preview bulk operation
export async function previewBulkOperation(
  businessUnitId: string,
  operation: 'UPDATE' | 'DEPLOY' | 'RETURN' | 'DELETE',
  assetIds: string[],
  additionalData?: Record<string, unknown>
): Promise<BulkOperationPreview> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get assets to be affected
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        isActive: true,
        businessUnitId
      },
      include: {
        deployments: {
          where: { status: DeploymentStatus.DEPLOYED },
          take: 1
        }
      }
    });

    const affectedAssets = assets.map(asset => ({
      id: asset.id,
      itemCode: asset.itemCode,
      description: asset.description,
      currentStatus: asset.status,
      currentLocation: asset.location || undefined,
      serialNumber: asset.serialNumber || undefined
    }));

    const warnings: string[] = [];
    let canProceed = true;

    // Operation-specific validation
    switch (operation) {
      case 'DEPLOY':
        const availableAssets = assets.filter(asset => asset.status === AssetStatus.AVAILABLE);
        if (availableAssets.length !== assets.length) {
          const unavailableCount = assets.length - availableAssets.length;
          warnings.push(`${unavailableCount} assets are not available for deployment`);
          canProceed = false;
        }
        break;

      case 'RETURN':
        const deployedAssets = assets.filter(asset => 
          asset.status === AssetStatus.DEPLOYED && asset.deployments.length > 0
        );
        if (deployedAssets.length !== assets.length) {
          const notDeployedCount = assets.length - deployedAssets.length;
          warnings.push(`${notDeployedCount} assets are not currently deployed`);
          canProceed = false;
        }
        break;

      case 'DELETE':
        const assetsWithDeployments = assets.filter(asset => asset.deployments.length > 0);
        if (assetsWithDeployments.length > 0) {
          warnings.push(`${assetsWithDeployments.length} assets have active deployments and cannot be deleted`);
          canProceed = false;
        }
        break;

      case 'UPDATE':
        // General update validation can be added here
        break;
    }

    return serializeForClient({
      operation,
      affectedAssets,
      totalCount: assets.length,
      warnings,
      canProceed
    });

  } catch (error) {
    console.error('Error previewing bulk operation:', error);
    throw new Error('Failed to preview bulk operation');
  }
}

// Bulk update assets
export async function bulkUpdateAssets(
  businessUnitId: string,
  data: BulkAssetUpdateData
): Promise<BulkAssetOperationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Unauthorized access' }]
      };
    }

    const processedAssetIds: string[] = [];
    const errors: Array<{ assetId: string; itemCode?: string; message: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const assetId of data.assetIds) {
        try {
          // Get current asset for audit trail
          const currentAsset = await tx.asset.findUnique({
            where: { id: assetId, isActive: true, businessUnitId }
          });

          if (!currentAsset) {
            errors.push({
              assetId,
              message: 'Asset not found or not accessible'
            });
            continue;
          }

          // Prepare update data
          const updateData: Prisma.AssetUpdateInput = {
            updatedAt: new Date()
          };

          if (data.updates.status !== undefined) {
            updateData.status = data.updates.status;
          }

          if (data.updates.location !== undefined) {
            updateData.location = data.updates.location;
          }

          if (data.updates.notes !== undefined) {
            updateData.notes = data.updates.notes;
          }

          if (data.updates.categoryId !== undefined) {
            updateData.category = { connect: { id: data.updates.categoryId } };
          }

          // Depreciation updates
          if (data.updates.depreciationMethod !== undefined) {
            updateData.depreciationMethod = data.updates.depreciationMethod as DepreciationMethod;
          }

          if (data.updates.usefulLifeYears !== undefined) {
            updateData.usefulLifeYears = data.updates.usefulLifeYears;
            updateData.usefulLifeMonths = data.updates.usefulLifeYears * 12;
          }

          if (data.updates.usefulLifeMonths !== undefined) {
            updateData.usefulLifeMonths = data.updates.usefulLifeMonths;
          }

          if (data.updates.salvageValue !== undefined) {
            updateData.salvageValue = new Prisma.Decimal(data.updates.salvageValue);
          }

          if (data.updates.depreciationRate !== undefined) {
            updateData.depreciationRate = new Prisma.Decimal(data.updates.depreciationRate);
          }

          // Update the asset
          await tx.asset.update({
            where: { id: assetId },
            data: updateData
          });

          // Create asset history entry
          await tx.assetHistory.create({
            data: {
              assetId,
              action: AssetHistoryAction.UPDATED,
              businessUnitId,
              previousStatus: currentAsset.status,
              newStatus: data.updates.status || currentAsset.status,
              previousLocation: currentAsset.location,
              newLocation: data.updates.location || currentAsset.location,
              notes: `Bulk update operation`,
              performedById: user.id,
              metadata: {
                bulkOperation: true,
                updates: data.updates
              } as Prisma.InputJsonValue
            }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'UPDATE',
            tableName: 'Asset',
            recordId: assetId,
            oldValues: {
              status: currentAsset.status,
              location: currentAsset.location,
              notes: currentAsset.notes
            } as Prisma.InputJsonValue,
            newValues: data.updates as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({ data: auditData });

          processedAssetIds.push(assetId);

        } catch (error) {
          console.error(`Error updating asset ${assetId}:`, error);
          errors.push({
            assetId,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const processedCount = processedAssetIds.length;
    const failedCount = data.assetIds.length - processedCount;
    const success = processedCount > 0 && failedCount === 0;

    revalidatePath('/assets');

    return serializeForClient({
      success,
      message: success 
        ? `Successfully updated ${processedCount} assets`
        : `Updated ${processedCount} assets, ${failedCount} failed`,
      processedCount,
      failedCount,
      processedAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk asset update:', error);
    return {
      success: false,
      message: 'Failed to update assets',
      processedCount: 0,
      failedCount: data.assetIds.length,
      processedAssetIds: [],
      errors: [{ assetId: '', message: 'System error occurred' }]
    };
  }
}

// Bulk create deployments
export async function bulkCreateDeployments(
  data: BulkDeploymentCreationData
): Promise<BulkAssetOperationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Unauthorized access' }]
      };
    }

    // Validate employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId, isActive: true }
    });

    if (!employee) {
      return {
        success: false,
        message: 'Employee not found or inactive',
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Invalid employee' }]
      };
    }

    // Validate all assets are available
    const assets = await prisma.asset.findMany({
      where: { 
        id: { in: data.assetIds },
        status: AssetStatus.AVAILABLE,
        businessUnitId: data.businessUnitId
      }
    });

    if (assets.length !== data.assetIds.length) {
      const unavailableAssets = data.assetIds.filter(id => !assets.find(a => a.id === id));
      return {
        success: false,
        message: `Some assets are not available for deployment`,
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: unavailableAssets.map(assetId => ({
          assetId,
          message: 'Asset not available for deployment'
        }))
      };
    }

    // Generate transmittal numbers
    const transmittalNumbers = await generateBulkTransmittalNumbers(data.assetIds.length);

    const processedAssetIds: string[] = [];
    const errors: Array<{ assetId: string; itemCode?: string; message: string }> = [];

    // Create deployments in transaction
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.assetIds.length; i++) {
        const assetId = data.assetIds[i];
        const transmittalNumber = transmittalNumbers[i];

        try {
          // Create deployment
          const deployment = await tx.assetDeployment.create({
            data: {
              transmittalNumber,
              assetId,
              employeeId: data.employeeId,
              businessUnitId: data.businessUnitId,
              expectedReturnDate: data.expectedReturnDate,
              deploymentNotes: data.deploymentNotes,
              deploymentCondition: data.deploymentCondition,
              status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
            }
          });

          // Create asset history
          await tx.assetHistory.create({
            data: {
              assetId,
              action: AssetHistoryAction.DEPLOYED,
              businessUnitId: data.businessUnitId,
              employeeId: data.employeeId,
              deploymentId: deployment.id,
              previousStatus: AssetStatus.AVAILABLE,
              newStatus: AssetStatus.AVAILABLE, // Will be updated when approved
              notes: `Bulk deployment created - ${transmittalNumber}`,
              performedById: user.id,
              metadata: {
                bulkOperation: true,
                transmittalNumber
              } as Prisma.InputJsonValue
            }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'CREATE',
            tableName: 'AssetDeployment',
            recordId: deployment.id,
            newValues: {
              transmittalNumber,
              assetId,
              employeeId: data.employeeId,
              bulkOperation: true
            } as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({ data: auditData });

          processedAssetIds.push(assetId);

        } catch (error) {
          console.error(`Error creating deployment for asset ${assetId}:`, error);
          errors.push({
            assetId,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const processedCount = processedAssetIds.length;
    const failedCount = data.assetIds.length - processedCount;
    const success = processedCount > 0 && failedCount === 0;

    revalidatePath('/deployments');
    revalidatePath('/assets');

    return serializeForClient({
      success,
      message: success 
        ? `Successfully created ${processedCount} deployments`
        : `Created ${processedCount} deployments, ${failedCount} failed`,
      processedCount,
      failedCount,
      processedAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk deployment creation:', error);
    return {
      success: false,
      message: 'Failed to create deployments',
      processedCount: 0,
      failedCount: data.assetIds.length,
      processedAssetIds: [],
      errors: [{ assetId: '', message: 'System error occurred' }]
    };
  }
}

// Bulk return assets
export async function bulkReturnAssets(
  businessUnitId: string,
  data: BulkReturnData
): Promise<BulkAssetOperationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        processedCount: 0,
        failedCount: data.deploymentIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Unauthorized access' }]
      };
    }

    // Get deployments to return
    const deployments = await prisma.assetDeployment.findMany({
      where: {
        id: { in: data.deploymentIds },
        status: DeploymentStatus.DEPLOYED,
        businessUnitId
      },
      include: {
        asset: true
      }
    });

    if (deployments.length !== data.deploymentIds.length) {
      return {
        success: false,
        message: 'Some deployments are not found or not returnable',
        processedCount: 0,
        failedCount: data.deploymentIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Invalid deployment IDs' }]
      };
    }

    const processedAssetIds: string[] = [];
    const errors: Array<{ assetId: string; itemCode?: string; message: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const deployment of deployments) {
        try {
          // Update deployment
          await tx.assetDeployment.update({
            where: { id: deployment.id },
            data: {
              status: DeploymentStatus.RETURNED,
              returnedDate: data.returnDate || new Date(),
              returnCondition: data.returnCondition,
              returnNotes: data.returnNotes
            }
          });

          // Update asset status
          await tx.asset.update({
            where: { id: deployment.assetId },
            data: { status: AssetStatus.AVAILABLE }
          });

          // Create asset history
          await tx.assetHistory.create({
            data: {
              assetId: deployment.assetId,
              action: AssetHistoryAction.RETURNED,
              businessUnitId,
              employeeId: deployment.employeeId,
              deploymentId: deployment.id,
              previousStatus: AssetStatus.DEPLOYED,
              newStatus: AssetStatus.AVAILABLE,
              notes: `Bulk return operation`,
              performedById: user.id,
              metadata: {
                bulkOperation: true,
                returnCondition: data.returnCondition,
                returnNotes: data.returnNotes
              } as Prisma.InputJsonValue
            }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'UPDATE',
            tableName: 'AssetDeployment',
            recordId: deployment.id,
            oldValues: { status: DeploymentStatus.DEPLOYED } as Prisma.InputJsonValue,
            newValues: { 
              status: DeploymentStatus.RETURNED,
              returnedDate: data.returnDate || new Date(),
              bulkOperation: true
            } as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({ data: auditData });

          processedAssetIds.push(deployment.assetId);

        } catch (error) {
          console.error(`Error returning deployment ${deployment.id}:`, error);
          errors.push({
            assetId: deployment.assetId,
            itemCode: deployment.asset.itemCode,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const processedCount = processedAssetIds.length;
    const failedCount = data.deploymentIds.length - processedCount;
    const success = processedCount > 0 && failedCount === 0;

    revalidatePath('/deployments');
    revalidatePath('/assets');

    return serializeForClient({
      success,
      message: success 
        ? `Successfully returned ${processedCount} assets`
        : `Returned ${processedCount} assets, ${failedCount} failed`,
      processedCount,
      failedCount,
      processedAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk asset return:', error);
    return {
      success: false,
      message: 'Failed to return assets',
      processedCount: 0,
      failedCount: data.deploymentIds.length,
      processedAssetIds: [],
      errors: [{ assetId: '', message: 'System error occurred' }]
    };
  }
}

// Bulk delete assets (soft delete)
export async function bulkDeleteAssets(
  businessUnitId: string,
  assetIds: string[]
): Promise<BulkAssetOperationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        processedCount: 0,
        failedCount: assetIds.length,
        processedAssetIds: [],
        errors: [{ assetId: '', message: 'Unauthorized access' }]
      };
    }

    // Check for active deployments
    const assetsWithDeployments = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        businessUnitId,
        deployments: {
          some: {
            status: DeploymentStatus.DEPLOYED,
            returnedDate: null
          }
        }
      }
    });

    if (assetsWithDeployments.length > 0) {
      return {
        success: false,
        message: 'Cannot delete assets with active deployments',
        processedCount: 0,
        failedCount: assetIds.length,
        processedAssetIds: [],
        errors: assetsWithDeployments.map(asset => ({
          assetId: asset.id,
          itemCode: asset.itemCode,
          message: 'Asset has active deployments'
        }))
      };
    }

    const processedAssetIds: string[] = [];
    const errors: Array<{ assetId: string; itemCode?: string; message: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const assetId of assetIds) {
        try {
          // Soft delete asset
          await tx.asset.update({
            where: { id: assetId, businessUnitId },
            data: { isActive: false, updatedAt: new Date() }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'DELETE',
            tableName: 'Asset',
            recordId: assetId,
            newValues: { 
              isActive: false,
              bulkOperation: true
            } as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({ data: auditData });

          processedAssetIds.push(assetId);

        } catch (error) {
          console.error(`Error deleting asset ${assetId}:`, error);
          errors.push({
            assetId,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const processedCount = processedAssetIds.length;
    const failedCount = assetIds.length - processedCount;
    const success = processedCount > 0 && failedCount === 0;

    revalidatePath('/assets');

    return serializeForClient({
      success,
      message: success 
        ? `Successfully deleted ${processedCount} assets`
        : `Deleted ${processedCount} assets, ${failedCount} failed`,
      processedCount,
      failedCount,
      processedAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk asset deletion:', error);
    return {
      success: false,
      message: 'Failed to delete assets',
      processedCount: 0,
      failedCount: assetIds.length,
      processedAssetIds: [],
      errors: [{ assetId: '', message: 'System error occurred' }]
    };
  }
}