// lib/actions/asset-category-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AssetCategoryWithCounts,
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
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

export async function getAssetCategories(
  search?: string,
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetCategoryWithCounts>> {
  try {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: Prisma.AssetCategoryWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.assetCategory.findMany({
        where,
        include: {
          _count: {
            select: {
              assets: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.assetCategory.count({ where })
    ]);

    return serializeForClient({
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    throw new Error('Failed to fetch asset categories');
  }
}

export async function getAssetCategoryById(id: string): Promise<AssetCategoryWithCounts | null> {
  try {
    const category = await prisma.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assets: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    return category ? serializeForClient(category) : null;
  } catch (error) {
    console.error('Error fetching asset category:', error);
    throw new Error('Failed to fetch asset category');
  }
}

export async function createAssetCategory(
  data: CreateAssetCategoryData
): Promise<{ success: boolean; message: string; categoryId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if code already exists
    const existingCategory = await prisma.assetCategory.findFirst({
      where: { 
        OR: [
          { code: data.code },
          { name: data.name }
        ]
      }
    });

    if (existingCategory) {
      return { success: false, message: 'Category with this code or name already exists' };
    }

    // Prepare category data with proper types
    const categoryData: Prisma.AssetCategoryCreateInput = {
      name: data.name,
      code: data.code,
      description: data.description,
    };

    const category = await prisma.assetCategory.create({
      data: categoryData
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'CREATE',
      tableName: 'AssetCategory',
      recordId: category.id,
      newValues: {
        name: data.name,
        code: data.code,
        description: data.description,
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets/categories');
    return { success: true, message: 'Asset category created successfully', categoryId: category.id };
  } catch (error) {
    console.error('Error creating asset category:', error);
    return { success: false, message: 'Failed to create asset category' };
  }
}

export async function updateAssetCategory(
  data: UpdateAssetCategoryData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current category for audit trail
    const currentCategory = await prisma.assetCategory.findUnique({
      where: { id }
    });

    if (!currentCategory) {
      return { success: false, message: 'Category not found' };
    }

    // Check if code or name already exists (if being updated)
    if (updateData.code || updateData.name) {
      const whereConditions: Prisma.AssetCategoryWhereInput[] = [];
      
      if (updateData.code) {
        whereConditions.push({ code: updateData.code });
      }
      
      if (updateData.name) {
        whereConditions.push({ name: updateData.name });
      }

      const existingCategory = await prisma.assetCategory.findFirst({
        where: { 
          OR: whereConditions,
          id: { not: id }
        }
      });

      if (existingCategory) {
        return { success: false, message: 'Category with this code or name already exists' };
      }
    }

    // Prepare update data with proper types
    const categoryUpdateData: Prisma.AssetCategoryUpdateInput = {
      ...updateData,
      updatedAt: new Date()
    };

    await prisma.assetCategory.update({
      where: { id },
      data: categoryUpdateData
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'AssetCategory',
      recordId: id,
      oldValues: {
        name: currentCategory.name,
        code: currentCategory.code,
        description: currentCategory.description,
        isActive: currentCategory.isActive
      } as Prisma.InputJsonValue,
      newValues: {
        ...updateData
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets/categories');
    revalidatePath(`/assets/categories/${id}`);
    return { success: true, message: 'Asset category updated successfully' };
  } catch (error) {
    console.error('Error updating asset category:', error);
    return { success: false, message: 'Failed to update asset category' };
  }
}

export async function deleteAssetCategory(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if category has assets
    const assetCount = await prisma.asset.count({
      where: {
        categoryId: id,
        isActive: true
      }
    });

    if (assetCount > 0) {
      return { success: false, message: 'Cannot delete category with existing assets' };
    }

    // Get current category for audit trail
    const currentCategory = await prisma.assetCategory.findUnique({
      where: { id }
    });

    if (!currentCategory) {
      return { success: false, message: 'Category not found' };
    }

    await prisma.assetCategory.delete({
      where: { id }
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'DELETE',
      tableName: 'AssetCategory',
      recordId: id,
      oldValues: {
        name: currentCategory.name,
        code: currentCategory.code,
        description: currentCategory.description,
        isActive: currentCategory.isActive
      } as Prisma.InputJsonValue,
      newValues: { 
        deleted: true 
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/assets/categories');
    return { success: true, message: 'Asset category deleted successfully' };
  } catch (error) {
    console.error('Error deleting asset category:', error);
    return { success: false, message: 'Failed to delete asset category' };
  }
}