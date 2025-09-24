// lib/actions/asset-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DeploymentStatus } from '@prisma/client';
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

    const where = {
      isActive: true,
      businessUnitId,
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(minPrice !== undefined && { purchasePrice: { gte: minPrice } }),
      ...(maxPrice !== undefined && { 
        purchasePrice: { 
          ...(minPrice !== undefined ? { gte: minPrice } : {}),
          lte: maxPrice 
        } 
      }),
      ...(search && {
        OR: [
          { itemCode: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { serialNumber: { contains: search, mode: 'insensitive' as const } },
          { brand: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
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
      prisma.asset.count({ where })
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

    const asset = await prisma.asset.create({
      data: {
        ...data,
        specifications: data.specifications as any,
        createdById: user.id
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'Asset',
        recordId: asset.id,
        newValues: data as any,
        timestamp: new Date()
      }
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

    await prisma.asset.update({
      where: { id },
      data: {
        ...updateData,
        specifications: updateData.specifications as any,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'Asset',
        recordId: id,
        oldValues: currentAsset as any,
        newValues: updateData as any,
        timestamp: new Date()
      }
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        tableName: 'Asset',
        recordId: id,
        newValues: { isActive: false },
        timestamp: new Date()
      }
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

    return categories;
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

    return businessUnits;
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}

export async function getAssetStatuses() {
  return Object.values(AssetStatus);
}