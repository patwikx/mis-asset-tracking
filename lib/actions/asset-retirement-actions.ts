// lib/actions/asset-retirement-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, Prisma, AssetHistoryAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  PaginationParams,
  PaginatedResponse
} from '@/types/asset-types';

// Type for retirement data
export interface AssetRetirementData {
  assetId: string;
  retirementDate: Date;
  reason: 'END_OF_USEFUL_LIFE' | 'FULLY_DEPRECIATED' | 'OBSOLETE' | 'DAMAGED_BEYOND_REPAIR' | 'POLICY_CHANGE' | 'UPGRADE_REPLACEMENT';
  retirementMethod?: string;
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'NON_FUNCTIONAL';
  notes?: string;
  replacementAssetId?: string;
  disposalPlanned: boolean;
  disposalDate?: Date;
}

// Type for retirement with relations
export interface AssetRetirementWithRelations {
  id: string;
  assetId: string;
  retirementDate: Date;
  reason: string;
  retirementMethod?: string;
  condition?: string;
  notes?: string;
  replacementAssetId?: string;
  disposalPlanned: boolean;
  disposalDate?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  asset: {
    id: string;
    itemCode: string;
    description: string;
    serialNumber?: string;
    currentBookValue?: number;
    category: { name: string };
  };
  replacementAsset?: {
    id: string;
    itemCode: string;
    description: string;
  };
  approvedByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  createdByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

// Type for retirement filters
export interface RetirementFilters {
  search?: string;
  reason?: AssetRetirementData['reason'];
  dateFrom?: Date;
  dateTo?: Date;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'ALL';
  disposalPlanned?: boolean;
}

// Type for end-of-life notification data
export interface EndOfLifeNotificationData {
  assetId: string;
  notificationType: 'APPROACHING_END_OF_LIFE' | 'FULLY_DEPRECIATED' | 'MAINTENANCE_OVERDUE' | 'WARRANTY_EXPIRED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  actionRequired?: string;
  dueDate?: Date;
}

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

// Get assets eligible for retirement
export async function getAssetsEligibleForRetirement(
  businessUnitId: string
): Promise<Array<{
  id: string;
  itemCode: string;
  description: string;
  status: AssetStatus;
  currentBookValue?: number;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  lastMaintenanceDate?: Date;
  category: { name: string };
  ageInYears: number;
  depreciationPercentage: number;
  recommendedAction: 'RETIRE' | 'MAINTAIN' | 'MONITOR';
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Assets eligible for retirement: not disposed, not already retired
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: {
          notIn: [AssetStatus.DISPOSED, AssetStatus.RETIRED]
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

    // Calculate retirement eligibility metrics
    const currentDate = new Date();
    const transformedAssets = assets.map(asset => {
      const purchaseDate = asset.purchaseDate || asset.createdAt;
      const ageInYears = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      const originalValue = asset.purchasePrice?.toNumber() || 0;
      const currentValue = asset.currentBookValue?.toNumber() || 0;
      const depreciationPercentage = originalValue > 0 ? ((originalValue - currentValue) / originalValue) * 100 : 0;

      // Determine recommended action based on business rules
      let recommendedAction: 'RETIRE' | 'MAINTAIN' | 'MONITOR' = 'MONITOR';
      
      if (depreciationPercentage >= 95 || ageInYears >= 10) {
        recommendedAction = 'RETIRE';
      } else if (depreciationPercentage >= 80 || ageInYears >= 7) {
        recommendedAction = 'MAINTAIN';
      }

      // Override for damaged or lost assets
      if (asset.status === AssetStatus.DAMAGED || asset.status === AssetStatus.LOST) {
        recommendedAction = 'RETIRE';
      }

      return {
        ...asset,
        currentBookValue: asset.currentBookValue?.toNumber() || undefined,
        serialNumber: asset.serialNumber || undefined,
        purchaseDate: asset.purchaseDate || undefined,
        warrantyExpiry: asset.warrantyExpiry || undefined,

        ageInYears: Math.round(ageInYears * 10) / 10,
        depreciationPercentage: Math.round(depreciationPercentage * 10) / 10,
        recommendedAction
      };
    });

    return serializeForClient(transformedAssets);

  } catch (error) {
    console.error('Error fetching assets eligible for retirement:', error);
    throw new Error('Failed to fetch assets eligible for retirement');
  }
}

// Create asset retirement
export async function createAssetRetirement(
  businessUnitId: string,
  data: AssetRetirementData
): Promise<{ success: boolean; message: string; retirementId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Validate asset exists and is not already retired or disposed
    const asset = await prisma.asset.findUnique({
      where: { 
        id: data.assetId,
        isActive: true,
        businessUnitId
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

    if (!asset) {
      return { success: false, message: 'Asset not found or not accessible' };
    }

    if (asset.status === AssetStatus.RETIRED) {
      return { success: false, message: 'Asset is already retired' };
    }

    if (asset.status === AssetStatus.DISPOSED) {
      return { success: false, message: 'Asset has already been disposed' };
    }

    if (asset.deployments.length > 0) {
      return { success: false, message: 'Cannot retire asset with active deployments' };
    }

    // Create retirement record in transaction
    const retirement = await prisma.$transaction(async (tx) => {
      // Create retirement record
      const newRetirement = await tx.assetRetirement.create({
        data: {
          assetId: data.assetId,
          businessUnitId,
          retirementDate: data.retirementDate,
          reason: data.reason,
          retirementMethod: data.retirementMethod,
          condition: data.condition,
          notes: data.notes,
          replacementAssetId: data.replacementAssetId,
          disposalPlanned: data.disposalPlanned,
          disposalDate: data.disposalDate,
          createdBy: user.id
        }
      });

      // Update asset status to RETIRED
      await tx.asset.update({
        where: { id: data.assetId },
        data: { 
          status: AssetStatus.RETIRED,
          updatedAt: new Date()
        }
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: data.assetId,
          action: AssetHistoryAction.RETIRED,
          businessUnitId,
          previousStatus: asset.status,
          newStatus: AssetStatus.RETIRED,
          notes: `Asset retired - ${data.reason}`,
          performedById: user.id,
          metadata: {
            retirementId: newRetirement.id,
            reason: data.reason,
            disposalPlanned: data.disposalPlanned
          } as Prisma.InputJsonValue
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetRetirement',
        recordId: newRetirement.id,
        newValues: {
          assetId: data.assetId,
          reason: data.reason,
          disposalPlanned: data.disposalPlanned
        } as Prisma.InputJsonValue,
        timestamp: new Date()
      };

      await tx.auditLog.create({ data: auditData });

      return newRetirement;
    });

    revalidatePath('/assets');
    revalidatePath('/retirements');
    
    return { 
      success: true, 
      message: 'Asset retirement created successfully',
      retirementId: retirement.id
    };

  } catch (error) {
    console.error('Error creating asset retirement:', error);
    return { success: false, message: 'Failed to create asset retirement' };
  }
}

// Get asset retirements with filters and pagination
export async function getAssetRetirements(
  businessUnitId: string,
  filters: RetirementFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetRetirementWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, reason, dateFrom, dateTo, approvalStatus, disposalPlanned } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.AssetRetirementWhereInput = {
      businessUnitId
    };

    if (reason) {
      whereClause.reason = reason;
    }

    if (dateFrom || dateTo) {
      whereClause.retirementDate = {};
      if (dateFrom) {
        whereClause.retirementDate.gte = dateFrom;
      }
      if (dateTo) {
        whereClause.retirementDate.lte = dateTo;
      }
    }

    if (approvalStatus === 'PENDING') {
      whereClause.approvedAt = null;
    } else if (approvalStatus === 'APPROVED') {
      whereClause.approvedAt = { not: null };
    }

    if (disposalPlanned !== undefined) {
      whereClause.disposalPlanned = disposalPlanned;
    }

    if (search) {
      whereClause.OR = [
        { asset: { itemCode: { contains: search, mode: 'insensitive' } } },
        { asset: { description: { contains: search, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [retirements, total] = await Promise.all([
      prisma.assetRetirement.findMany({
        where: whereClause,
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
          replacementAsset: {
            select: {
              id: true,
              itemCode: true,
              description: true
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
          createdByEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true
            }
          }
        },
        orderBy: { retirementDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.assetRetirement.count({ where: whereClause })
    ]);

    // Transform the data to convert null to undefined for optional fields
    const transformedRetirements = retirements.map((retirement) => ({
      ...retirement,
      retirementMethod: retirement.retirementMethod || undefined,
      condition: retirement.condition || undefined,
      notes: retirement.notes || undefined,
      replacementAssetId: retirement.replacementAssetId || undefined,
      disposalDate: retirement.disposalDate || undefined,
      approvedBy: retirement.approvedBy || undefined,
      approvedAt: retirement.approvedAt || undefined,
      asset: {
        ...retirement.asset,
        serialNumber: retirement.asset.serialNumber || undefined,
        currentBookValue: retirement.asset.currentBookValue?.toNumber() || undefined
      },
      replacementAsset: retirement.replacementAsset || undefined,
      approvedByEmployee: retirement.approvedByEmployee || undefined
    }));

    return serializeForClient({
      data: transformedRetirements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching asset retirements:', error);
    throw new Error('Failed to fetch asset retirements');
  }
}

// Approve asset retirement
export async function approveAssetRetirement(
  retirementId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const retirement = await prisma.assetRetirement.findUnique({
      where: { id: retirementId }
    });

    if (!retirement) {
      return { success: false, message: 'Retirement record not found' };
    }

    if (retirement.approvedAt) {
      return { success: false, message: 'Retirement already approved' };
    }

    await prisma.assetRetirement.update({
      where: { id: retirementId },
      data: {
        approvedBy: user.id,
        approvedAt: new Date(),
        notes: notes ? `${retirement.notes || ''}\n\nApproval Notes: ${notes}` : retirement.notes
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'AssetRetirement',
      recordId: retirementId,
      newValues: {
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: notes
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({ data: auditData });

    revalidatePath('/retirements');
    
    return { success: true, message: 'Asset retirement approved successfully' };

  } catch (error) {
    console.error('Error approving asset retirement:', error);
    return { success: false, message: 'Failed to approve asset retirement' };
  }
}

// Generate end-of-life notifications
export async function generateEndOfLifeNotifications(
  businessUnitId: string
): Promise<{ success: boolean; message: string; notificationsCreated: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized', notificationsCreated: 0 };
    }

    // Get assets that need end-of-life notifications
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: {
          notIn: [AssetStatus.DISPOSED, AssetStatus.RETIRED]
        }
      },
      include: {
        category: true
      }
    });

    const currentDate = new Date();
    const notifications: EndOfLifeNotificationData[] = [];

    for (const asset of assets) {
      const purchaseDate = asset.purchaseDate || asset.createdAt;
      const ageInYears = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      const originalValue = asset.purchasePrice?.toNumber() || 0;
      const currentValue = asset.currentBookValue?.toNumber() || 0;
      const depreciationPercentage = originalValue > 0 ? ((originalValue - currentValue) / originalValue) * 100 : 0;

      // Check for fully depreciated assets
      if (depreciationPercentage >= 95) {
        notifications.push({
          assetId: asset.id,
          notificationType: 'FULLY_DEPRECIATED',
          priority: 'MEDIUM',
          message: `Asset ${asset.itemCode} is fully depreciated and may need retirement consideration.`,
          actionRequired: 'Review for retirement or disposal'
        });
      }

      // Check for assets approaching end of useful life (8+ years)
      if (ageInYears >= 8 && ageInYears < 10) {
        notifications.push({
          assetId: asset.id,
          notificationType: 'APPROACHING_END_OF_LIFE',
          priority: 'LOW',
          message: `Asset ${asset.itemCode} is ${Math.round(ageInYears)} years old and approaching end of useful life.`,
          actionRequired: 'Plan for replacement or retirement'
        });
      }

      // Check for assets past typical useful life (10+ years)
      if (ageInYears >= 10) {
        notifications.push({
          assetId: asset.id,
          notificationType: 'APPROACHING_END_OF_LIFE',
          priority: 'HIGH',
          message: `Asset ${asset.itemCode} is ${Math.round(ageInYears)} years old and past typical useful life.`,
          actionRequired: 'Immediate retirement consideration required'
        });
      }

      // Check for warranty expiry
      if (asset.warrantyExpiry && asset.warrantyExpiry <= currentDate) {
        const daysSinceExpiry = Math.floor((currentDate.getTime() - asset.warrantyExpiry.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceExpiry <= 30) { // Only notify for recently expired warranties
          notifications.push({
            assetId: asset.id,
            notificationType: 'WARRANTY_EXPIRED',
            priority: 'MEDIUM',
            message: `Asset ${asset.itemCode} warranty expired ${daysSinceExpiry} days ago.`,
            actionRequired: 'Review maintenance strategy'
          });
        }
      }

      // TODO: Add maintenance overdue check when lastMaintenanceDate field is added to Asset model
    }

    // Create notifications for relevant users (admins and asset managers)
    const adminUsers = await prisma.employee.findMany({
      where: {
        businessUnitId,
        isActive: true,
        role: {
          code: {
            in: ['SUPER_ADMIN', 'ADMIN', 'ASSET_MANAGER']
          }
        }
      }
    });

    let notificationsCreated = 0;

    for (const notification of notifications) {
      for (const admin of adminUsers) {
        try {
          await prisma.notification.create({
            data: {
              recipientId: admin.id,
              type: notification.notificationType,
              title: 'Asset End-of-Life Alert',
              message: notification.message
            }
          });
          notificationsCreated++;
        } catch (error) {
          console.error(`Failed to create notification for user ${admin.id}:`, error);
        }
      }
    }

    return {
      success: true,
      message: `Generated ${notificationsCreated} end-of-life notifications`,
      notificationsCreated
    };

  } catch (error) {
    console.error('Error generating end-of-life notifications:', error);
    return { 
      success: false, 
      message: 'Failed to generate end-of-life notifications',
      notificationsCreated: 0
    };
  }
}