// lib/actions/asset-transfer-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, Prisma, AssetHistoryAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AssetTransferData,
  AssetTransferWithRelations,
  TransferFilters,
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

// Generate transfer number
async function generateTransferNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `TR-${currentYear}-`;
  
  const latestTransfer = await prisma.assetTransfer.findFirst({
    where: {
      transferNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      transferNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (latestTransfer) {
    const numberPart = latestTransfer.transferNumber.replace(prefix, '');
    nextNumber = parseInt(numberPart) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// Get asset transfers with filters and pagination
export async function getAssetTransfers(
  businessUnitId: string,
  filters: TransferFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetTransferWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, status, fromBusinessUnitId, toBusinessUnitId, dateFrom, dateTo, requestedBy } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause - show transfers involving the current business unit
    const whereClause: Prisma.AssetTransferWhereInput = {
      OR: [
        { fromBusinessUnitId: businessUnitId },
        { toBusinessUnitId: businessUnitId }
      ]
    };

    // Apply additional filters
    if (status) {
      whereClause.status = status;
    }

    if (fromBusinessUnitId) {
      whereClause.fromBusinessUnitId = fromBusinessUnitId;
      delete whereClause.OR; // Remove OR clause if specific from unit is selected
    }

    if (toBusinessUnitId) {
      whereClause.toBusinessUnitId = toBusinessUnitId;
      delete whereClause.OR; // Remove OR clause if specific to unit is selected
    }

    if (dateFrom || dateTo) {
      whereClause.transferDate = {};
      if (dateFrom) {
        whereClause.transferDate.gte = dateFrom;
      }
      if (dateTo) {
        whereClause.transferDate.lte = dateTo;
      }
    }

    if (requestedBy) {
      whereClause.requestedBy = requestedBy;
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { asset: { itemCode: { contains: search, mode: 'insensitive' } } },
            { asset: { description: { contains: search, mode: 'insensitive' } } },
            { transferNumber: { contains: search, mode: 'insensitive' } },
            { reason: { contains: search, mode: 'insensitive' } },
            { trackingNumber: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [transfers, total] = await Promise.all([
      prisma.assetTransfer.findMany({
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
          fromBusinessUnit: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          toBusinessUnit: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          requestedByEmployee: {
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
          },
          rejectedByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          },
          handedOverByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          },
          receivedByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          },
          createdByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          }
        },
        orderBy: { requestedDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.assetTransfer.count({ where: whereClause })
    ]);

    // Transform data to match interface
    const transformedTransfers = transfers.map((transfer) => ({
      ...transfer,
      transferCost: transfer.transferCost?.toNumber() || undefined,
      insuranceValue: transfer.insuranceValue?.toNumber() || undefined,
      asset: {
        ...transfer.asset,
        serialNumber: transfer.asset.serialNumber || undefined,
        currentBookValue: transfer.asset.currentBookValue?.toNumber() || undefined
      },
      fromLocation: transfer.fromLocation || undefined,
      toLocation: transfer.toLocation || undefined,
      transferMethod: transfer.transferMethod || undefined,
      trackingNumber: transfer.trackingNumber || undefined,
      estimatedArrival: transfer.estimatedArrival || undefined,
      approvedBy: transfer.approvedBy || undefined,
      approvedAt: transfer.approvedAt || undefined,
      rejectedBy: transfer.rejectedBy || undefined,
      rejectedAt: transfer.rejectedAt || undefined,
      rejectionReason: transfer.rejectionReason || undefined,
      conditionBefore: transfer.conditionBefore || undefined,
      conditionAfter: transfer.conditionAfter || undefined,
      transferNotes: transfer.transferNotes || undefined,
      documentationUrl: transfer.documentationUrl || undefined,
      handedOverBy: transfer.handedOverBy || undefined,
      handedOverAt: transfer.handedOverAt || undefined,
      receivedBy: transfer.receivedBy || undefined,
      receivedAt: transfer.receivedAt || undefined,
      completedDate: transfer.completedDate || undefined,
      approvedByEmployee: transfer.approvedByEmployee || undefined,
      rejectedByEmployee: transfer.rejectedByEmployee || undefined,
      handedOverByEmployee: transfer.handedOverByEmployee || undefined,
      receivedByEmployee: transfer.receivedByEmployee || undefined
    }));

    return serializeForClient({
      data: transformedTransfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching asset transfers:', error);
    throw new Error('Failed to fetch asset transfers');
  }
}

// Get transfer by ID
export async function getAssetTransferById(id: string): Promise<AssetTransferWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const transfer = await prisma.assetTransfer.findUnique({
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
        fromBusinessUnit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        toBusinessUnit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        requestedByEmployee: {
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
        },
        rejectedByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        },
        handedOverByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        },
        receivedByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        },
        createdByEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true
          }
        }
      }
    });

    if (!transfer) return null;

    // Transform data to match interface
    const transformedTransfer = {
      ...transfer,
      transferCost: transfer.transferCost?.toNumber() || undefined,
      insuranceValue: transfer.insuranceValue?.toNumber() || undefined,
      asset: {
        ...transfer.asset,
        serialNumber: transfer.asset.serialNumber || undefined,
        currentBookValue: transfer.asset.currentBookValue?.toNumber() || undefined
      },
      fromLocation: transfer.fromLocation || undefined,
      toLocation: transfer.toLocation || undefined,
      transferMethod: transfer.transferMethod || undefined,
      trackingNumber: transfer.trackingNumber || undefined,
      estimatedArrival: transfer.estimatedArrival || undefined,
      approvedBy: transfer.approvedBy || undefined,
      approvedAt: transfer.approvedAt || undefined,
      rejectedBy: transfer.rejectedBy || undefined,
      rejectedAt: transfer.rejectedAt || undefined,
      rejectionReason: transfer.rejectionReason || undefined,
      conditionBefore: transfer.conditionBefore || undefined,
      conditionAfter: transfer.conditionAfter || undefined,
      transferNotes: transfer.transferNotes || undefined,
      documentationUrl: transfer.documentationUrl || undefined,
      handedOverBy: transfer.handedOverBy || undefined,
      handedOverAt: transfer.handedOverAt || undefined,
      receivedBy: transfer.receivedBy || undefined,
      receivedAt: transfer.receivedAt || undefined,
      completedDate: transfer.completedDate || undefined,
      approvedByEmployee: transfer.approvedByEmployee || undefined,
      rejectedByEmployee: transfer.rejectedByEmployee || undefined,
      handedOverByEmployee: transfer.handedOverByEmployee || undefined,
      receivedByEmployee: transfer.receivedByEmployee || undefined
    };

    return serializeForClient(transformedTransfer);
  } catch (error) {
    console.error('Error fetching asset transfer:', error);
    throw new Error('Failed to fetch asset transfer');
  }
}

// Create asset transfer
export async function createAssetTransfer(
  data: AssetTransferData
): Promise<{ success: boolean; message: string; transferId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Validate asset exists and is not disposed or already in transfer
    const asset = await prisma.asset.findUnique({
      where: { 
        id: data.assetId,
        isActive: true
      }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found or not accessible' };
    }

    if (asset.status === AssetStatus.DISPOSED) {
      return { success: false, message: 'Cannot transfer disposed asset' };
    }

    // Check for existing active transfers
    const existingTransfer = await prisma.assetTransfer.findFirst({
      where: {
        assetId: data.assetId,
        status: {
          in: ['PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT']
        }
      }
    });

    if (existingTransfer) {
      return { success: false, message: 'Asset already has a pending or active transfer' };
    }

    // Validate business units exist
    const [fromBusinessUnit, toBusinessUnit] = await Promise.all([
      prisma.businessUnit.findUnique({ where: { id: data.fromBusinessUnitId } }),
      prisma.businessUnit.findUnique({ where: { id: data.toBusinessUnitId } })
    ]);

    if (!fromBusinessUnit || !toBusinessUnit) {
      return { success: false, message: 'Invalid business unit(s)' };
    }

    if (data.fromBusinessUnitId === data.toBusinessUnitId) {
      return { success: false, message: 'Cannot transfer asset to the same business unit' };
    }

    // Generate transfer number
    const transferNumber = await generateTransferNumber();

    // Create transfer record in transaction
    const transfer = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const newTransfer = await tx.assetTransfer.create({
        data: {
          assetId: data.assetId,
          transferNumber,
          fromBusinessUnitId: data.fromBusinessUnitId,
          toBusinessUnitId: data.toBusinessUnitId,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          transferDate: data.transferDate,
          reason: data.reason,
          transferMethod: data.transferMethod,
          trackingNumber: data.trackingNumber,
          estimatedArrival: data.estimatedArrival,
          conditionBefore: data.conditionBefore,
          transferNotes: data.transferNotes,
          transferCost: data.transferCost ? new Prisma.Decimal(data.transferCost) : null,
          insuranceValue: data.insuranceValue ? new Prisma.Decimal(data.insuranceValue) : null,
          requestedBy: user.id,
          createdBy: user.id,
          status: 'PENDING_APPROVAL'
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: data.assetId,
          action: AssetHistoryAction.TRANSFERRED,
          businessUnitId: data.fromBusinessUnitId,
          previousLocation: asset.location,
          newLocation: data.toLocation,
          notes: `Transfer requested to ${toBusinessUnit.name} - ${data.reason}`,
          performedById: user.id,
          metadata: {
            transferId: newTransfer.id,
            transferNumber,
            fromBusinessUnit: fromBusinessUnit.name,
            toBusinessUnit: toBusinessUnit.name,
            reason: data.reason
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetTransfer',
        recordId: newTransfer.id,
        newValues: {
          assetId: data.assetId,
          transferNumber,
          fromBusinessUnitId: data.fromBusinessUnitId,
          toBusinessUnitId: data.toBusinessUnitId,
          reason: data.reason
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });

      return newTransfer;
    });

    revalidatePath('/assets');
    revalidatePath('/transfers');
    
    return { 
      success: true, 
      message: 'Asset transfer request created successfully',
      transferId: transfer.id
    };

  } catch (error) {
    console.error('Error creating asset transfer:', error);
    return { success: false, message: 'Failed to create asset transfer' };
  }
}

// Approve asset transfer
export async function approveAssetTransfer(
  transferId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const transfer = await prisma.assetTransfer.findUnique({
      where: { id: transferId },
      include: { asset: true, toBusinessUnit: true }
    });

    if (!transfer) {
      return { success: false, message: 'Transfer not found' };
    }

    if (transfer.status !== 'PENDING_APPROVAL') {
      return { success: false, message: 'Transfer is not pending approval' };
    }

    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.assetTransfer.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date(),
          transferNotes: notes ? `${transfer.transferNotes || ''}\n\nApproval Notes: ${notes}` : transfer.transferNotes
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          action: AssetHistoryAction.STATUS_CHANGED,
          businessUnitId: transfer.fromBusinessUnitId,
          notes: `Transfer approved by ${user.firstName} ${user.lastName}`,
          performedById: user.id,
          metadata: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            approvalNotes: notes
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetTransfer',
        recordId: transferId,
        newValues: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date(),
          approvalNotes: notes
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });
    });

    revalidatePath('/transfers');
    
    return { success: true, message: 'Asset transfer approved successfully' };

  } catch (error) {
    console.error('Error approving asset transfer:', error);
    return { success: false, message: 'Failed to approve asset transfer' };
  }
}

// Reject asset transfer
export async function rejectAssetTransfer(
  transferId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const transfer = await prisma.assetTransfer.findUnique({
      where: { id: transferId }
    });

    if (!transfer) {
      return { success: false, message: 'Transfer not found' };
    }

    if (transfer.status !== 'PENDING_APPROVAL') {
      return { success: false, message: 'Transfer is not pending approval' };
    }

    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.assetTransfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
          rejectedBy: user.id,
          rejectedAt: new Date(),
          rejectionReason: reason
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          action: AssetHistoryAction.STATUS_CHANGED,
          businessUnitId: transfer.fromBusinessUnitId,
          notes: `Transfer rejected: ${reason}`,
          performedById: user.id,
          metadata: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            rejectionReason: reason
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetTransfer',
        recordId: transferId,
        newValues: {
          status: 'REJECTED',
          rejectedBy: user.id,
          rejectedAt: new Date(),
          rejectionReason: reason
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });
    });

    revalidatePath('/transfers');
    
    return { success: true, message: 'Asset transfer rejected successfully' };

  } catch (error) {
    console.error('Error rejecting asset transfer:', error);
    return { success: false, message: 'Failed to reject asset transfer' };
  }
}

// Complete asset transfer (when asset is received)
export async function completeAssetTransfer(
  transferId: string,
  conditionAfter?: string,
  receivedNotes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const transfer = await prisma.assetTransfer.findUnique({
      where: { id: transferId },
      include: { asset: true }
    });

    if (!transfer) {
      return { success: false, message: 'Transfer not found' };
    }

    if (transfer.status !== 'IN_TRANSIT') {
      return { success: false, message: 'Transfer is not in transit' };
    }

    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.assetTransfer.update({
        where: { id: transferId },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
          conditionAfter,
          receivedBy: user.id,
          receivedAt: new Date(),
          transferNotes: receivedNotes ? `${transfer.transferNotes || ''}\n\nReceived Notes: ${receivedNotes}` : transfer.transferNotes
        }
      });

      // Update asset business unit and location
      await tx.asset.update({
        where: { id: transfer.assetId },
        data: {
          businessUnitId: transfer.toBusinessUnitId,
          location: transfer.toLocation || transfer.asset.location
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          action: AssetHistoryAction.TRANSFERRED,
          businessUnitId: transfer.toBusinessUnitId,
          previousLocation: transfer.fromLocation,
          newLocation: transfer.toLocation,
          notes: `Transfer completed - Asset received`,
          performedById: user.id,
          metadata: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            conditionAfter,
            receivedNotes
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetTransfer',
        recordId: transferId,
        newValues: {
          status: 'COMPLETED',
          completedDate: new Date(),
          receivedBy: user.id,
          receivedAt: new Date()
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });
    });

    revalidatePath('/transfers');
    revalidatePath('/assets');
    
    return { success: true, message: 'Asset transfer completed successfully' };

  } catch (error) {
    console.error('Error completing asset transfer:', error);
    return { success: false, message: 'Failed to complete asset transfer' };
  }
}

// Get assets eligible for transfer
export async function getAssetsEligibleForTransfer(
  businessUnitId: string
): Promise<Array<{
  id: string;
  itemCode: string;
  description: string;
  status: AssetStatus;
  currentBookValue?: number;
  serialNumber?: string;
  location?: string;
  category: { name: string };
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Assets eligible for transfer: not disposed, not in active transfer
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: { not: AssetStatus.DISPOSED }
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

    // Transform data
    const transformedAssets = assets.map(asset => ({
      ...asset,
      currentBookValue: asset.currentBookValue?.toNumber() || undefined,
      serialNumber: asset.serialNumber || undefined,
      location: asset.location || undefined
    }));

    return serializeForClient(transformedAssets);

  } catch (error) {
    console.error('Error fetching assets eligible for transfer:', error);
    throw new Error('Failed to fetch assets eligible for transfer');
  }
}

// Get all business units for transfer destination
export async function getBusinessUnitsForTransfer() {
  try {
    const businessUnits = await prisma.businessUnit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    return serializeForClient(businessUnits);
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}