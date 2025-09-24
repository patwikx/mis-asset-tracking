// lib/actions/asset-category-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import type {
  AssetCategoryWithCounts,
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
  PaginationParams,
  PaginatedResponse
} from '@/types/asset-types';

export async function getAssetCategories(
  search?: string,
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AssetCategoryWithCounts>> {
  try {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

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

    return {
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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

    return category;
  } catch (error) {
    console.error('Error fetching asset category:', error);
    throw new Error('Failed to fetch asset category');
  }
}

export async function createAssetCategory(data: CreateAssetCategoryData): Promise<{ success: boolean; message: string; categoryId?: string }> {
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

    const category = await prisma.assetCategory.create({
      data
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetCategory',
        recordId: category.id,
        newValues: data as any,
        timestamp: new Date()
      }
    });

    revalidatePath('/assets/categories');
    return { success: true, message: 'Asset category created successfully', categoryId: category.id };
  } catch (error) {
    console.error('Error creating asset category:', error);
    return { success: false, message: 'Failed to create asset category' };
  }
}

export async function updateAssetCategory(data: UpdateAssetCategoryData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Check if code or name already exists (if being updated)
    if (updateData.code || updateData.name) {
      const existingCategory = await prisma.assetCategory.findFirst({
        where: { 
          OR: [
            ...(updateData.code ? [{ code: updateData.code }] : []),
            ...(updateData.name ? [{ name: updateData.name }] : [])
          ],
          id: { not: id }
        }
      });

      if (existingCategory) {
        return { success: false, message: 'Category with this code or name already exists' };
      }
    }

    await prisma.assetCategory.update({
      where: { id },
      data: updateData
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetCategory',
        recordId: id,
        newValues: updateData as any,
        timestamp: new Date()
      }
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

    await prisma.assetCategory.delete({
      where: { id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        tableName: 'AssetCategory',
        recordId: id,
        newValues: { deleted: true },
        timestamp: new Date()
      }
    });

    revalidatePath('/assets/categories');
    return { success: true, message: 'Asset category deleted successfully' };
  } catch (error) {
    console.error('Error deleting asset category:', error);
    return { success: false, message: 'Failed to delete asset category' };
  }
}