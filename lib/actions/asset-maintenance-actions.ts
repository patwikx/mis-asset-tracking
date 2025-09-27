// lib/actions/asset-maintenance-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { AssetStatus, AssetHistoryAction, Prisma } from '@prisma/client';
import type {
  AssetMaintenanceWithRelations,
  CreateMaintenanceData,
  UpdateMaintenanceData,
  MaintenanceFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/maintenance-types';

export async function getAssetMaintenanceRecords(
  assetId?: string,
  businessUnitId?: string,
  filters: MaintenanceFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetMaintenanceWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, maintenanceType, status, dateFrom, dateTo } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetMaintenanceWhereInput = {};

    if (assetId) {
      where.assetId = assetId;
    }

    if (businessUnitId) {
      where.asset = {
        businessUnitId
      };
    }

    if (maintenanceType) {
      where.maintenanceType = maintenanceType;
    }

    if (status !== undefined) {
      where.isCompleted = status === 'COMPLETED';
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) {
        where.scheduledDate.gte = dateFrom;
      }
      if (dateTo) {
        where.scheduledDate.lte = dateTo;
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { performedBy: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { asset: { itemCode: { contains: search, mode: 'insensitive' } } },
        { asset: { description: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [maintenanceRecords, total] = await Promise.all([
      prisma.assetMaintenance.findMany({
        where,
        include: {
          asset: {
            include: {
              category: true,
              businessUnit: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.assetMaintenance.count({ where })
    ]);

    return serializeForClient({
      data: maintenanceRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    throw new Error('Failed to fetch maintenance records');
  }
}

export async function createMaintenanceRecord(
  data: CreateMaintenanceData
): Promise<{ success: boolean; message: string; maintenanceId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId, isActive: true }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    const maintenanceData: Prisma.AssetMaintenanceCreateInput = {
      maintenanceType: data.maintenanceType,
      description: data.description,
      scheduledDate: data.scheduledDate,
      startDate: data.startDate,
      completedDate: data.completedDate,
      performedBy: data.performedBy,
      cost: data.cost ? new Prisma.Decimal(data.cost) : null,
      notes: data.notes,
      isCompleted: data.isCompleted || false,
      asset: {
        connect: { id: data.assetId }
      }
    };

    const maintenance = await prisma.assetMaintenance.create({
      data: maintenanceData
    });

    // Update asset status if maintenance is starting
    if (data.startDate && !data.completedDate) {
      await prisma.asset.update({
        where: { id: data.assetId },
        data: { status: AssetStatus.IN_MAINTENANCE }
      });

      // Create asset history entry
      await prisma.assetHistory.create({
        data: {
          assetId: data.assetId,
          action: AssetHistoryAction.MAINTENANCE_START,
          businessUnitId: asset.businessUnitId,
          previousStatus: asset.status,
          newStatus: AssetStatus.IN_MAINTENANCE,
          notes: `Maintenance started: ${data.description}`,
          performedById: user.id,
          startDate: data.startDate,
          metadata: {
            maintenanceId: maintenance.id,
            maintenanceType: data.maintenanceType,
            performedBy: data.performedBy
          }
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetMaintenance',
        recordId: maintenance.id,
        newValues: {
          assetId: data.assetId,
          maintenanceType: data.maintenanceType,
          description: data.description,
          cost: data.cost
        },
        timestamp: new Date()
      }
    });

    revalidatePath('/assets');
    revalidatePath(`/assets/${data.assetId}`);
    
    return { 
      success: true, 
      message: 'Maintenance record created successfully',
      maintenanceId: maintenance.id
    };
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    return { success: false, message: 'Failed to create maintenance record' };
  }
}

export async function updateMaintenanceRecord(
  data: UpdateMaintenanceData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    const currentMaintenance = await prisma.assetMaintenance.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!currentMaintenance) {
      return { success: false, message: 'Maintenance record not found' };
    }

    const maintenanceUpdateData: Prisma.AssetMaintenanceUpdateInput = {
      ...updateData,
      cost: updateData.cost ? new Prisma.Decimal(updateData.cost) : undefined,
      updatedAt: new Date()
    };

    await prisma.assetMaintenance.update({
      where: { id },
      data: maintenanceUpdateData
    });

    // If maintenance is being completed, update asset status
    if (updateData.isCompleted && !currentMaintenance.isCompleted) {
      await prisma.asset.update({
        where: { id: currentMaintenance.assetId },
        data: { status: AssetStatus.AVAILABLE }
      });

      // Create asset history entry
      await prisma.assetHistory.create({
        data: {
          assetId: currentMaintenance.assetId,
          action: AssetHistoryAction.MAINTENANCE_END,
          businessUnitId: currentMaintenance.asset.businessUnitId,
          previousStatus: AssetStatus.IN_MAINTENANCE,
          newStatus: AssetStatus.AVAILABLE,
          notes: `Maintenance completed: ${currentMaintenance.description}`,
          performedById: user.id,
          endDate: updateData.completedDate || new Date(),
          metadata: {
            maintenanceId: id,
            cost: updateData.cost
          }
        }
      });
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${currentMaintenance.assetId}`);
    
    return { success: true, message: 'Maintenance record updated successfully' };
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return { success: false, message: 'Failed to update maintenance record' };
  }
}

export async function deleteMaintenanceRecord(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const maintenance = await prisma.assetMaintenance.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!maintenance) {
      return { success: false, message: 'Maintenance record not found' };
    }

    await prisma.assetMaintenance.delete({
      where: { id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        tableName: 'AssetMaintenance',
        recordId: id,
        oldValues: {
          assetId: maintenance.assetId,
          description: maintenance.description,
          cost: maintenance.cost?.toNumber()
        },
        timestamp: new Date()
      }
    });

    revalidatePath('/assets');
    revalidatePath(`/assets/${maintenance.assetId}`);
    
    return { success: true, message: 'Maintenance record deleted successfully' };
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return { success: false, message: 'Failed to delete maintenance record' };
  }
}

export async function getMaintenanceSchedule(
  businessUnitId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<Array<{
  id: string;
  assetId: string;
  assetCode: string;
  assetDescription: string;
  maintenanceType: string;
  description: string;
  scheduledDate: Date;
  isOverdue: boolean;
  daysUntilDue: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const currentDate = new Date();
    const fromDate = dateFrom || currentDate;
    const toDate = dateTo || new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead

    const maintenanceRecords = await prisma.assetMaintenance.findMany({
      where: {
        asset: { businessUnitId },
        isCompleted: false,
        scheduledDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        asset: {
          select: {
            itemCode: true,
            description: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    const schedule = maintenanceRecords.map(record => {
      const scheduledDate = record.scheduledDate || new Date();
      const daysUntilDue = Math.ceil(
        (scheduledDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysUntilDue < 0;

      return {
        id: record.id,
        assetId: record.assetId,
        assetCode: record.asset.itemCode,
        assetDescription: record.asset.description,
        maintenanceType: record.maintenanceType,
        description: record.description,
        scheduledDate,
        isOverdue,
        daysUntilDue
      };
    });

    return serializeForClient(schedule);
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    throw new Error('Failed to fetch maintenance schedule');
  }
}