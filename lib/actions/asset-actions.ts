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

export async function createAsset(data: CreateAssetData): Promise<{ success: boolean; message: string; assetId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if item code already exists
    const existingAsset = await prisma.asset.findFirst({
      where: { 
        itemCode: data.itemCode,
        isActive: true
      }
    });

    if (existingAsset) {
      return { success: false, message: 'Asset with this item code already exists' };
    }

    // Prepare asset data with proper types
    const assetData: Prisma.AssetCreateInput = {
      itemCode: data.itemCode,
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
        itemCode: data.itemCode,
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

    // Check if item code already exists (if being updated)
    if (updateData.itemCode && updateData.itemCode !== currentAsset.itemCode) {
      const existingAsset = await prisma.asset.findFirst({
        where: { 
          itemCode: updateData.itemCode,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingAsset) {
        return { success: false, message: 'Asset with this item code already exists' };
      }
    }

    // Prepare update data with proper types
    const assetUpdateData: Prisma.AssetUpdateInput = {
      ...updateData,
      specifications: updateData.specifications !== undefined
        ? (updateData.specifications 
          ? updateData.specifications as Prisma.InputJsonValue 
          : Prisma.JsonNull)
        : undefined,
      purchasePrice: updateData.purchasePrice 
        ? new Prisma.Decimal(updateData.purchasePrice) 
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
        ...updateData,
        specifications: updateData.specifications,
        purchaseDate: updateData.purchaseDate?.toISOString(),
        purchasePrice: updateData.purchasePrice,
        warrantyExpiry: updateData.warrantyExpiry?.toISOString()
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