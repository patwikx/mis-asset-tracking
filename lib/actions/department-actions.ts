// lib/actions/department-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  DepartmentWithRelations,
  CreateDepartmentData,
  UpdateDepartmentData,
  DepartmentFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/department-types';

export async function getDepartments(
  filters: DepartmentFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<DepartmentWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, businessUnitId, isActive = true } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isActive,
      ...(businessUnitId && { businessUnitId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          businessUnit: true,
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
      prisma.department.count({ where })
    ]);

    return serializeForClient({
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw new Error('Failed to fetch departments');
  }
}

export async function getDepartmentById(id: string): Promise<DepartmentWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const department = await prisma.department.findUnique({
      where: { id, isActive: true },
      include: {
        businessUnit: true,
        _count: {
          select: {
            employees: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    return department ? serializeForClient(department) : null;
  } catch (error) {
    console.error('Error fetching department:', error);
    throw new Error('Failed to fetch department');
  }
}

export async function createDepartment(data: CreateDepartmentData): Promise<{ success: boolean; message: string; departmentId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if department code already exists within the business unit
    const existingDepartment = await prisma.department.findFirst({
      where: { 
        code: data.code,
        businessUnitId: data.businessUnitId,
        isActive: true
      }
    });

    if (existingDepartment) {
      return { success: false, message: 'Department with this code already exists in this business unit' };
    }

    const department = await prisma.department.create({
      data
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'Department',
        recordId: department.id,
        newValues: JSON.parse(JSON.stringify(data)),
        timestamp: new Date()
      }
    });

    revalidatePath('/departments');
    return { success: true, message: 'Department created successfully', departmentId: department.id };
  } catch (error) {
    console.error('Error creating department:', error);
    return { success: false, message: 'Failed to create department' };
  }
}

export async function updateDepartment(data: UpdateDepartmentData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current department for audit trail
    const currentDepartment = await prisma.department.findUnique({
      where: { id, isActive: true }
    });

    if (!currentDepartment) {
      return { success: false, message: 'Department not found' };
    }

    // Check if department code already exists (if being updated)
    if (updateData.code && updateData.code !== currentDepartment.code) {
      const businessUnitId = updateData.businessUnitId || currentDepartment.businessUnitId;
      const existingDepartment = await prisma.department.findFirst({
        where: { 
          code: updateData.code,
          businessUnitId,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingDepartment) {
        return { success: false, message: 'Department with this code already exists in this business unit' };
      }
    }

    await prisma.department.update({
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
        tableName: 'Department',
        recordId: id,
        oldValues: JSON.parse(JSON.stringify(currentDepartment)),
        newValues: JSON.parse(JSON.stringify(updateData)),
        timestamp: new Date()
      }
    });

    revalidatePath('/departments');
    revalidatePath(`/departments/${id}`);
    return { success: true, message: 'Department updated successfully' };
  } catch (error) {
    console.error('Error updating department:', error);
    return { success: false, message: 'Failed to update department' };
  }
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if department has active employees
    const activeEmployees = await prisma.employee.count({
      where: {
        departmentId: id,
        isActive: true
      }
    });

    if (activeEmployees > 0) {
      return { success: false, message: 'Cannot delete department with active employees' };
    }

    // Soft delete
    await prisma.department.update({
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
        tableName: 'Department',
        recordId: id,
        newValues: { isActive: false },
        timestamp: new Date()
      }
    });

    revalidatePath('/departments');
    return { success: true, message: 'Department deleted successfully' };
  } catch (error) {
    console.error('Error deleting department:', error);
    return { success: false, message: 'Failed to delete department' };
  }
}

export async function getBusinessUnits() {
  try {
    const businessUnits = await prisma.businessUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return businessUnits;
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}