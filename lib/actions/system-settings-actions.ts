// lib/actions/system-settings-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  SystemSettingWithRelations,
  CreateSystemSettingData,
  UpdateSystemSettingData,
  SystemSettingFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/system-settings-types';

export async function getSystemSettings(
  filters: SystemSettingFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<SystemSettingWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, category, isActive = true } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isActive,
      ...(category && { category }),
      ...(search && {
        OR: [
          { key: { contains: search, mode: 'insensitive' as const } },
          { value: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [settings, total] = await Promise.all([
      prisma.systemSetting.findMany({
        where,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
        skip,
        take: limit
      }),
      prisma.systemSetting.count({ where })
    ]);

    return serializeForClient({
      data: settings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    throw new Error('Failed to fetch system settings');
  }
}

export async function getSystemSettingById(id: string): Promise<SystemSettingWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id, isActive: true }
    });

    return setting ? serializeForClient(setting) : null;
  } catch (error) {
    console.error('Error fetching system setting:', error);
    throw new Error('Failed to fetch system setting');
  }
}

export async function getSystemSettingByKey(key: string): Promise<SystemSettingWithRelations | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key, isActive: true }
    });

    return setting ? serializeForClient(setting) : null;
  } catch (error) {
    console.error('Error fetching system setting by key:', error);
    throw new Error('Failed to fetch system setting');
  }
}

export async function createSystemSetting(data: CreateSystemSettingData): Promise<{ success: boolean; message: string; settingId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if setting key already exists
    const existingSetting = await prisma.systemSetting.findFirst({
      where: { 
        key: data.key,
        isActive: true
      }
    });

    if (existingSetting) {
      return { success: false, message: 'System setting with this key already exists' };
    }

    const setting = await prisma.systemSetting.create({
      data
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'SystemSetting',
        recordId: setting.id,
        newValues: JSON.parse(JSON.stringify(data)),
        timestamp: new Date()
      }
    });

    revalidatePath('/system-settings');
    return { success: true, message: 'System setting created successfully', settingId: setting.id };
  } catch (error) {
    console.error('Error creating system setting:', error);
    return { success: false, message: 'Failed to create system setting' };
  }
}

export async function updateSystemSetting(data: UpdateSystemSettingData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current setting for audit trail
    const currentSetting = await prisma.systemSetting.findUnique({
      where: { id, isActive: true }
    });

    if (!currentSetting) {
      return { success: false, message: 'System setting not found' };
    }

    // Check if setting key already exists (if being updated)
    if (updateData.key && updateData.key !== currentSetting.key) {
      const existingSetting = await prisma.systemSetting.findFirst({
        where: { 
          key: updateData.key,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingSetting) {
        return { success: false, message: 'System setting with this key already exists' };
      }
    }

    await prisma.systemSetting.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'SystemSetting',
        recordId: id,
        oldValues: JSON.parse(JSON.stringify(currentSetting)),
        newValues: JSON.parse(JSON.stringify(updateData)),
        timestamp: new Date()
      }
    });

    revalidatePath('/system-settings');
    revalidatePath(`/system-settings/${id}`);
    return { success: true, message: 'System setting updated successfully' };
  } catch (error) {
    console.error('Error updating system setting:', error);
    return { success: false, message: 'Failed to update system setting' };
  }
}

export async function deleteSystemSetting(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Soft delete
    await prisma.systemSetting.update({
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
        tableName: 'SystemSetting',
        recordId: id,
        newValues: { isActive: false },
        timestamp: new Date()
      }
    });

    revalidatePath('/system-settings');
    return { success: true, message: 'System setting deleted successfully' };
  } catch (error) {
    console.error('Error deleting system setting:', error);
    return { success: false, message: 'Failed to delete system setting' };
  }
}

export async function getSystemSettingCategories(): Promise<string[]> {
  try {
    const categories = await prisma.systemSetting.findMany({
      where: { 
        isActive: true,
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category']
    });

    return categories
      .map(c => c.category)
      .filter((category): category is string => category !== null)
      .sort();
  } catch (error) {
    console.error('Error fetching system setting categories:', error);
    throw new Error('Failed to fetch system setting categories');
  }
}