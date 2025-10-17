// lib/actions/asset-disposal-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, Prisma, AssetHistoryAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AssetDisposalData,
  AssetDisposalWithRelations,
  DisposalFilters,
  PaginationParams,
  PaginatedResponse,
  DisposalSummary,
  BulkDisposalData,
  BulkAssetOperationResult
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

// Calculate gain/loss on disposal
function calculateGainLoss(disposalValue: number, disposalCost: number, bookValue: number): number {
  const netDisposalValue = disposalValue - disposalCost;
  return netDisposalValue - bookValue;
}

// Get asset disposals with filters and pagination
export async function getAssetDisposals(
  businessUnitId: string,
  filters: DisposalFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetDisposalWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, reason, dateFrom, dateTo, approvalStatus, minValue, maxValue } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.AssetDisposalWhereInput = {
      businessUnitId
    };

    if (reason) {
      whereClause.reason = reason;
    }

    if (dateFrom || dateTo) {
      whereClause.disposalDate = {};
      if (dateFrom) {
        whereClause.disposalDate.gte = dateFrom;
      }
      if (dateTo) {
        whereClause.disposalDate.lte = dateTo;
      }
    }

    if (approvalStatus === 'PENDING') {
      whereClause.approvedAt = null;
    } else if (approvalStatus === 'APPROVED') {
      whereClause.approvedAt = { not: null };
    }

    if (minValue !== undefined || maxValue !== undefined) {
      whereClause.disposalValue = {};
      if (minValue !== undefined) {
        whereClause.disposalValue.gte = new Prisma.Decimal(minValue);
      }
      if (maxValue !== undefined) {
        whereClause.disposalValue.lte = new Prisma.Decimal(maxValue);
      }
    }

    if (search) {
      whereClause.OR = [
        { asset: { itemCode: { contains: search, mode: 'insensitive' } } },
        { asset: { description: { contains: search, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: search, mode: 'insensitive' } } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { internalReference: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [disposals, total] = await Promise.all([
      prisma.assetDisposal.findMany({
        where: whereClause,
        include: {
          asset: {
            select: {
              id: true,
              itemCode: true,
              description: true,
              serialNumber: true,
              currentBookValue: true
            }
          },
          businessUnit: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          createdByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          },
          approvedByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          }
        },
        orderBy: { disposalDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.assetDisposal.count({ where: whereClause })
    ]);

    // Transform the data to convert null to undefined for optional fields
    const transformedDisposals = disposals.map(disposal => ({
      ...disposal,
      disposalMethod: disposal.disposalMethod || undefined,
      disposalLocation: disposal.disposalLocation || undefined,
      disposalValue: disposal.disposalValue?.toNumber() || undefined,
      disposalCost: disposal.disposalCost?.toNumber() || undefined,
      netDisposalValue: disposal.netDisposalValue?.toNumber() || undefined,
      bookValueAtDisposal: disposal.bookValueAtDisposal.toNumber(),
      gainLoss: disposal.gainLoss?.toNumber() || undefined,
      approvedBy: disposal.approvedBy || undefined,
      approvedAt: disposal.approvedAt || undefined,
      documentationUrl: disposal.documentationUrl || undefined,
      certificateNumber: disposal.certificateNumber || undefined,
      recipientName: disposal.recipientName || undefined,
      recipientContact: disposal.recipientContact || undefined,
      recipientAddress: disposal.recipientAddress || undefined,
      complianceNotes: disposal.complianceNotes || undefined,
      condition: disposal.condition || undefined,
      notes: disposal.notes || undefined,
      internalReference: disposal.internalReference || undefined,
      asset: {
        ...disposal.asset,
        serialNumber: disposal.asset.serialNumber || undefined,
        currentBookValue: disposal.asset.currentBookValue?.toNumber() || undefined
      },
      approvedByEmployee: disposal.approvedByEmployee || undefined
    }));

    return serializeForClient({
      data: transformedDisposals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching asset disposals:', error);
    throw new Error('Failed to fetch asset disposals');
  }
}

// Get disposal by ID
export async function getAssetDisposalById(id: string): Promise<AssetDisposalWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const disposal = await prisma.assetDisposal.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            itemCode: true,
            description: true,
            serialNumber: true,
            currentBookValue: true,
            category: {
              select: {
                name: true
              }
            }
          }
        },
        businessUnit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        },
        approvedByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        }
      }
    });

    if (!disposal) return null;

    // Transform the data to convert null to undefined for optional fields
    const transformedDisposal = {
      ...disposal,
      disposalMethod: disposal.disposalMethod || undefined,
      disposalLocation: disposal.disposalLocation || undefined,
      disposalValue: disposal.disposalValue?.toNumber() || undefined,
      disposalCost: disposal.disposalCost?.toNumber() || undefined,
      netDisposalValue: disposal.netDisposalValue?.toNumber() || undefined,
      bookValueAtDisposal: disposal.bookValueAtDisposal.toNumber(),
      gainLoss: disposal.gainLoss?.toNumber() || undefined,
      approvedBy: disposal.approvedBy || undefined,
      approvedAt: disposal.approvedAt || undefined,
      documentationUrl: disposal.documentationUrl || undefined,
      certificateNumber: disposal.certificateNumber || undefined,
      recipientName: disposal.recipientName || undefined,
      recipientContact: disposal.recipientContact || undefined,
      recipientAddress: disposal.recipientAddress || undefined,
      complianceNotes: disposal.complianceNotes || undefined,
      condition: disposal.condition || undefined,
      notes: disposal.notes || undefined,
      internalReference: disposal.internalReference || undefined,
      asset: {
        ...disposal.asset,
        serialNumber: disposal.asset.serialNumber || undefined,
        currentBookValue: disposal.asset.currentBookValue?.toNumber() || undefined
      },
      approvedByEmployee: disposal.approvedByEmployee || undefined
    };

    return serializeForClient(transformedDisposal);
  } catch (error) {
    console.error('Error fetching asset disposal:', error);
    throw new Error('Failed to fetch asset disposal');
  }
}

// Create asset disposal
export async function createAssetDisposal(
  businessUnitId: string,
  data: AssetDisposalData
): Promise<{ success: boolean; message: string; disposalId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Validate asset exists and is not already disposed
    const asset = await prisma.asset.findUnique({
      where: { 
        id: data.assetId,
        isActive: true,
        businessUnitId
      },
      include: {
        disposal: true,
        deployments: {
          where: {
            status: 'DEPLOYED',
            returnedDate: null
          }
        }
      }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found or not accessible' };
    }

    if (asset.disposal) {
      return { success: false, message: 'Asset has already been disposed' };
    }

    if (asset.deployments.length > 0) {
      return { success: false, message: 'Cannot dispose asset with active deployments' };
    }

    // Calculate financial values
    const disposalValue = data.disposalValue || 0;
    const disposalCost = data.disposalCost || 0;
    const netDisposalValue = disposalValue - disposalCost;
    const gainLoss = calculateGainLoss(disposalValue, disposalCost, data.bookValueAtDisposal);

    // Create disposal record in transaction
    const disposal = await prisma.$transaction(async (tx) => {
      // Create disposal record
      const newDisposal = await tx.assetDisposal.create({
        data: {
          assetId: data.assetId,
          businessUnitId,
          disposalDate: data.disposalDate,
          reason: data.reason,
          disposalMethod: data.disposalMethod,
          disposalLocation: data.disposalLocation,
          disposalValue: data.disposalValue ? new Prisma.Decimal(data.disposalValue) : null,
          disposalCost: data.disposalCost ? new Prisma.Decimal(data.disposalCost) : null,
          netDisposalValue: new Prisma.Decimal(netDisposalValue),
          bookValueAtDisposal: new Prisma.Decimal(data.bookValueAtDisposal),
          gainLoss: new Prisma.Decimal(gainLoss),
          recipientName: data.recipientName,
          recipientContact: data.recipientContact,
          recipientAddress: data.recipientAddress,
          environmentalCompliance: data.environmentalCompliance,
          dataWiped: data.dataWiped,
          complianceNotes: data.complianceNotes,
          condition: data.condition,
          notes: data.notes,
          internalReference: data.internalReference,
          documentationUrl: data.documentationUrl,
          certificateNumber: data.certificateNumber,
          createdBy: user.id
        }
      });

      // Update asset status to DISPOSED
      await tx.asset.update({
        where: { id: data.assetId },
        data: { 
          status: AssetStatus.DISPOSED,
          updatedAt: new Date()
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: data.assetId,
          action: AssetHistoryAction.DISPOSED,
          businessUnitId,
          previousStatus: asset.status,
          newStatus: AssetStatus.DISPOSED,
          notes: `Asset disposed - ${data.reason}`,
          performedById: user.id,
          metadata: {
            disposalId: newDisposal.id,
            reason: data.reason,
            disposalValue: data.disposalValue,
            gainLoss
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetDisposal',
        recordId: newDisposal.id,
        newValues: {
          assetId: data.assetId,
          reason: data.reason,
          disposalValue: data.disposalValue,
          bookValueAtDisposal: data.bookValueAtDisposal,
          gainLoss
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });

      return newDisposal;
    });

    revalidatePath('/assets');
    revalidatePath('/disposals');
    
    return { 
      success: true, 
      message: 'Asset disposal created successfully',
      disposalId: disposal.id
    };

  } catch (error) {
    console.error('Error creating asset disposal:', error);
    return { success: false, message: 'Failed to create asset disposal' };
  }
}

// Approve asset disposal
export async function approveAssetDisposal(
  disposalId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const disposal = await prisma.assetDisposal.findUnique({
      where: { id: disposalId }
    });

    if (!disposal) {
      return { success: false, message: 'Disposal record not found' };
    }

    if (disposal.approvedAt) {
      return { success: false, message: 'Disposal already approved' };
    }

    await prisma.assetDisposal.update({
      where: { id: disposalId },
      data: {
        approvedBy: user.id,
        approvedAt: new Date(),
        notes: notes ? `${disposal.notes || ''}\n\nApproval Notes: ${notes}` : disposal.notes
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'AssetDisposal',
      recordId: disposalId,
      newValues: {
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: notes
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({ data: auditData });

    revalidatePath('/disposals');
    
    return { success: true, message: 'Asset disposal approved successfully' };

  } catch (error) {
    console.error('Error approving asset disposal:', error);
    return { success: false, message: 'Failed to approve asset disposal' };
  }
}

// Get disposal summary
export async function getDisposalSummary(businessUnitId: string): Promise<DisposalSummary> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const disposals = await prisma.assetDisposal.findMany({
      where: { businessUnitId }
    });

    const totalDisposals = disposals.length;
    const totalDisposalValue = disposals.reduce((sum, d) => 
      sum + (d.disposalValue?.toNumber() || 0), 0
    );
    const totalDisposalCost = disposals.reduce((sum, d) => 
      sum + (d.disposalCost?.toNumber() || 0), 0
    );
    const netDisposalValue = totalDisposalValue - totalDisposalCost;
    const totalGainLoss = disposals.reduce((sum, d) => 
      sum + (d.gainLoss?.toNumber() || 0), 0
    );
    const pendingApprovals = disposals.filter(d => !d.approvedAt).length;

    // Group by reason
    const reasonGroups = disposals.reduce((acc, disposal) => {
      const reason = disposal.reason;
      if (!acc[reason]) {
        acc[reason] = { count: 0, totalValue: 0 };
      }
      acc[reason].count++;
      acc[reason].totalValue += disposal.disposalValue?.toNumber() || 0;
      return acc;
    }, {} as Record<string, { count: number; totalValue: number }>);

    const disposalsByReason = Object.entries(reasonGroups).map(([reason, data]) => ({
      reason,
      count: data.count,
      totalValue: data.totalValue
    }));

    return serializeForClient({
      totalDisposals,
      totalDisposalValue,
      totalDisposalCost,
      netDisposalValue,
      totalGainLoss,
      pendingApprovals,
      disposalsByReason
    });

  } catch (error) {
    console.error('Error getting disposal summary:', error);
    throw new Error('Failed to get disposal summary');
  }
}

// Get assets eligible for disposal
export async function getAssetsEligibleForDisposal(
  businessUnitId: string
): Promise<Array<{
  id: string;
  itemCode: string;
  description: string;
  status: AssetStatus;
  currentBookValue?: number;
  serialNumber?: string;
  category: { name: string };
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Assets eligible for disposal: not disposed, not deployed, not already disposed
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: {
          not: AssetStatus.DISPOSED
        },
        disposal: null, // No existing disposal record
        deployments: {
          none: {
            status: 'DEPLOYED',
            returnedDate: null
          }
        }
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: { itemCode: 'asc' }
    });

    // Transform the data to convert null to undefined for optional fields
    const transformedAssets = assets.map(asset => ({
      ...asset,
      currentBookValue: asset.currentBookValue?.toNumber() || undefined,
      serialNumber: asset.serialNumber || undefined
    }));

    return serializeForClient(transformedAssets);

  } catch (error) {
    console.error('Error fetching assets eligible for disposal:', error);
    throw new Error('Failed to fetch assets eligible for disposal');
  }
}

// Bulk create disposals
export async function createBulkDisposals(
  businessUnitId: string,
  data: BulkDisposalData
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

    // Validate all assets are eligible for disposal
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: data.assetIds },
        businessUnitId,
        isActive: true,
        status: { not: AssetStatus.DISPOSED },
        disposal: null
      },
      include: {
        deployments: {
          where: {
            status: 'DEPLOYED',
            returnedDate: null
          }
        }
      }
    });

    // Check for assets with active deployments
    const assetsWithDeployments = assets.filter(asset => asset.deployments.length > 0);
    if (assetsWithDeployments.length > 0) {
      return {
        success: false,
        message: 'Some assets have active deployments and cannot be disposed',
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: assetsWithDeployments.map(asset => ({
          assetId: asset.id,
          itemCode: asset.itemCode,
          message: 'Asset has active deployments'
        }))
      };
    }

    if (assets.length !== data.assetIds.length) {
      const unavailableAssets = data.assetIds.filter(id => !assets.find(a => a.id === id));
      return {
        success: false,
        message: 'Some assets are not eligible for disposal',
        processedCount: 0,
        failedCount: data.assetIds.length,
        processedAssetIds: [],
        errors: unavailableAssets.map(assetId => ({
          assetId,
          message: 'Asset not eligible for disposal'
        }))
      };
    }

    const processedAssetIds: string[] = [];
    const errors: Array<{ assetId: string; itemCode?: string; message: string }> = [];

    // Process disposals in transaction
    await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        try {
          const bookValue = asset.currentBookValue?.toNumber() || 0;

          // Create disposal record
          const disposal = await tx.assetDisposal.create({
            data: {
              assetId: asset.id,
              businessUnitId,
              disposalDate: data.disposalDate,
              reason: data.reason,
              disposalMethod: data.disposalMethod,
              disposalLocation: data.disposalLocation,
              bookValueAtDisposal: new Prisma.Decimal(bookValue),
              environmentalCompliance: data.environmentalCompliance,
              dataWiped: data.dataWiped,
              complianceNotes: data.complianceNotes,
              notes: data.notes,
              createdBy: user.id
            }
          });

          // Update asset status
          await tx.asset.update({
            where: { id: asset.id },
            data: { status: AssetStatus.DISPOSED }
          });

          // Create asset history
          await tx.assetHistory.create({
            data: {
              assetId: asset.id,
              action: AssetHistoryAction.DISPOSED,
              businessUnitId,
              previousStatus: asset.status,
              newStatus: AssetStatus.DISPOSED,
              notes: `Bulk disposal - ${data.reason}`,
              performedById: user.id,
              metadata: {
                disposalId: disposal.id,
                bulkOperation: true
              } as Prisma.InputJsonValue
            }
          });

          // Create audit log
          const auditData: AuditLogData = {
            userId: user.id,
            action: 'CREATE',
            tableName: 'AssetDisposal',
            recordId: disposal.id,
            newValues: {
              assetId: asset.id,
              reason: data.reason,
              bulkOperation: true
            } as Prisma.InputJsonValue,
            timestamp: new Date()
          };

          await tx.auditLog.create({ data: auditData });

          processedAssetIds.push(asset.id);

        } catch (error) {
          console.error(`Error disposing asset ${asset.id}:`, error);
          errors.push({
            assetId: asset.id,
            itemCode: asset.itemCode,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }
    });

    const processedCount = processedAssetIds.length;
    const failedCount = data.assetIds.length - processedCount;
    const success = processedCount > 0 && failedCount === 0;

    revalidatePath('/assets');
    revalidatePath('/disposals');

    return serializeForClient({
      success,
      message: success 
        ? `Successfully disposed ${processedCount} assets`
        : `Disposed ${processedCount} assets, ${failedCount} failed`,
      processedCount,
      failedCount,
      processedAssetIds,
      errors
    });

  } catch (error) {
    console.error('Error in bulk asset disposal:', error);
    return {
      success: false,
      message: 'Failed to dispose assets',
      processedCount: 0,
      failedCount: data.assetIds.length,
      processedAssetIds: [],
      errors: [{ assetId: '', message: 'System error occurred' }]
    };
  }
}