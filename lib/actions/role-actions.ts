// lib/actions/role-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  RoleWithCounts,
  CreateRoleData,
  UpdateRoleData,
  RoleFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/role-types';

export async function getRoles(
  filters: RoleFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<RoleWithCounts>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, isActive = true } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isActive,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              employees: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.role.count({ where })
    ]);

    return serializeForClient({
      data: roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to fetch roles');
  }
}

export async function getRoleById(id: string): Promise<RoleWithCounts | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const role = await prisma.role.findUnique({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            employees: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    return role ? serializeForClient(role) : null;
  } catch (error) {
    console.error('Error fetching role:', error);
    throw new Error('Failed to fetch role');
  }
}

export async function createRole(data: CreateRoleData): Promise<{ success: boolean; message: string; roleId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if role code already exists
    const existingRole = await prisma.role.findFirst({
      where: { 
        code: data.code,
        isActive: true
      }
    });

    if (existingRole) {
      return { success: false, message: 'Role with this code already exists' };
    }

    const role = await prisma.role.create({
      data: {
        ...data
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'Role',
        recordId: role.id,
        newValues: JSON.parse(JSON.stringify(data)),
        timestamp: new Date()
      }
    });

    revalidatePath('/roles');
    return { success: true, message: 'Role created successfully', roleId: role.id };
  } catch (error) {
    console.error('Error creating role:', error);
    return { success: false, message: 'Failed to create role' };
  }
}

export async function updateRole(data: UpdateRoleData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current role for audit trail
    const currentRole = await prisma.role.findUnique({
      where: { id, isActive: true }
    });

    if (!currentRole) {
      return { success: false, message: 'Role not found' };
    }

    // Check if role code already exists (if being updated)
    if (updateData.code && updateData.code !== currentRole.code) {
      const existingRole = await prisma.role.findFirst({
        where: { 
          code: updateData.code,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingRole) {
        return { success: false, message: 'Role with this code already exists' };
      }
    }

    await prisma.role.update({
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
        tableName: 'Role',
        recordId: id,
        oldValues: JSON.parse(JSON.stringify(currentRole)),
        newValues: JSON.parse(JSON.stringify(updateData)),
        timestamp: new Date()
      }
    });

    revalidatePath('/roles');
    revalidatePath(`/roles/${id}`);
    return { success: true, message: 'Role updated successfully' };
  } catch (error) {
    console.error('Error updating role:', error);
    return { success: false, message: 'Failed to update role' };
  }
}

export async function deleteRole(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if role has active employees
    const activeEmployees = await prisma.employee.count({
      where: {
        roleId: id,
        isActive: true
      }
    });

    if (activeEmployees > 0) {
      return { success: false, message: 'Cannot delete role with active employees' };
    }

    // Soft delete
    await prisma.role.update({
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
        tableName: 'Role',
        recordId: id,
        newValues: { isActive: false },
        timestamp: new Date()
      }
    });

    revalidatePath('/roles');
    return { success: true, message: 'Role deleted successfully' };
  } catch (error) {
    console.error('Error deleting role:', error);
    return { success: false, message: 'Failed to delete role' };
  }
}