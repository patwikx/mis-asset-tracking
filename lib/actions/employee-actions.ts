// lib/actions/employee-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import bcrypt from 'bcryptjs';
import type {
  EmployeeWithRelations,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/employee-types';

export async function getEmployees(
  businessUnitId: string,
  filters: EmployeeFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<EmployeeWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, departmentId, roleId, isActive = true } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isActive,
      businessUnitId,
      ...(departmentId && { departmentId }),
      ...(roleId && { roleId }),
      ...(search && {
        OR: [
          { employeeId: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { position: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          role: true,
          businessUnit: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.employee.count({ where })
    ]);

    return serializeForClient({
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }
}

export async function getEmployeeById(id: string): Promise<EmployeeWithRelations | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const employee = await prisma.employee.findUnique({
      where: { id, isActive: true },
      include: {
        department: true,
        role: true,
        businessUnit: true
      }
    });

    return employee ? serializeForClient(employee) : null;
  } catch (error) {
    console.error('Error fetching employee:', error);
    throw new Error('Failed to fetch employee');
  }
}

export async function createEmployee(data: CreateEmployeeData): Promise<{ success: boolean; message: string; employeeId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if employee ID already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: { 
        employeeId: data.employeeId,
        isActive: true
      }
    });

    if (existingEmployee) {
      return { success: false, message: 'Employee with this ID already exists' };
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await prisma.employee.findFirst({
        where: { 
          email: data.email,
          isActive: true
        }
      });

      if (existingEmail) {
        return { success: false, message: 'Employee with this email already exists' };
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.passwordHash, 12);

    const employee = await prisma.employee.create({
      data: {
        ...data,
        passwordHash: hashedPassword
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'Employee',
        recordId: employee.id,
        newValues: JSON.parse(JSON.stringify({ ...data, passwordHash: '[REDACTED]' })),
        timestamp: new Date()
      }
    });

    revalidatePath('/employees');
    return { success: true, message: 'Employee created successfully', employeeId: employee.id };
  } catch (error) {
    console.error('Error creating employee:', error);
    return { success: false, message: 'Failed to create employee' };
  }
}

export async function updateEmployee(data: UpdateEmployeeData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, passwordHash, ...updateData } = data;

    // Get current employee for audit trail
    const currentEmployee = await prisma.employee.findUnique({
      where: { id, isActive: true }
    });

    if (!currentEmployee) {
      return { success: false, message: 'Employee not found' };
    }

    // Check if employee ID already exists (if being updated)
    if (updateData.employeeId && updateData.employeeId !== currentEmployee.employeeId) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { 
          employeeId: updateData.employeeId,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingEmployee) {
        return { success: false, message: 'Employee with this ID already exists' };
      }
    }

    // Check if email already exists (if being updated)
    if (updateData.email && updateData.email !== currentEmployee.email) {
      const existingEmail = await prisma.employee.findFirst({
        where: { 
          email: updateData.email,
          isActive: true,
          id: { not: id }
        }
      });

      if (existingEmail) {
        return { success: false, message: 'Employee with this email already exists' };
      }
    }

    // Prepare update data
    const finalUpdateData: Record<string, unknown> = {
      ...updateData,
      updatedAt: new Date()
    };

    // Hash password if provided
    if (passwordHash) {
      finalUpdateData.passwordHash = await bcrypt.hash(passwordHash, 12);
    }

    await prisma.employee.update({
      where: { id },
      data: finalUpdateData
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'Employee',
        recordId: id,
        oldValues: JSON.parse(JSON.stringify({ ...currentEmployee, passwordHash: '[REDACTED]' })),
        newValues: JSON.parse(JSON.stringify({ ...updateData, ...(passwordHash && { passwordHash: '[REDACTED]' }) })),
        timestamp: new Date()
      }
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${id}`);
    return { success: true, message: 'Employee updated successfully' };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { success: false, message: 'Failed to update employee' };
  }
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if employee has active deployments
    const activeDeployments = await prisma.assetDeployment.count({
      where: {
        employeeId: id,
        returnedDate: null
      }
    });

    if (activeDeployments > 0) {
      return { success: false, message: 'Cannot delete employee with active asset deployments' };
    }

    // Soft delete
    await prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
        terminateDate: new Date(),
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        tableName: 'Employee',
        recordId: id,
        newValues: { isActive: false, terminateDate: new Date() },
        timestamp: new Date()
      }
    });

    revalidatePath('/employees');
    return { success: true, message: 'Employee deleted successfully' };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, message: 'Failed to delete employee' };
  }
}

export async function getDepartments(businessUnitId?: string) {
  try {
    const where = businessUnitId ? { businessUnitId, isActive: true } : { isActive: true };
    
    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return departments;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw new Error('Failed to fetch departments');
  }
}

export async function getRoles() {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return roles;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to fetch roles');
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