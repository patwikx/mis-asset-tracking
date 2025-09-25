'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { Prisma } from '@prisma/client';
import type { 
  PermissionModule, 
  EmployeePermissions, 
  UpdateEmployeePermissionsData 
} from '@/types/permissions-types';
import { PERMISSION_MODULES } from '@/types/permissions-types';

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

export async function getEmployeePermissions(employeeId: string): Promise<EmployeePermissions | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        role: true
      }
    });

    if (!employee) {
      return null;
    }

    const rolePermissions = employee.role?.permissions as Record<string, boolean> | null;

    return serializeForClient({
      employeeId: employee.id,
      roleId: employee.roleId,
      roleName: employee.role?.name || 'Unknown Role',
      roleCode: employee.role?.code || 'UNKNOWN',
      permissions: rolePermissions || {},
      customPermissions: {} // For future individual permission overrides
    });
  } catch (error) {
    console.error('Error fetching employee permissions:', error);
    throw new Error('Failed to fetch employee permissions');
  }
}

export async function updateEmployeePermissions(
  data: UpdateEmployeePermissionsData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if current user has permission to manage permissions
    const hasPermissionManagement = await checkPermissionManagementAccess(user.id);
    if (!hasPermissionManagement) {
      return { success: false, message: 'You do not have permission to manage employee permissions' };
    }

    // Get the employee and their current role
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: {
        role: true
      }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // For now, we'll update the role permissions
    // In the future, you might want to add individual permission overrides
    const currentPermissions = employee.role?.permissions as Record<string, boolean> | null;

    await prisma.role.update({
      where: { id: employee.roleId },
      data: {
        permissions: data.permissions as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'Role',
      recordId: employee.roleId,
      oldValues: {
        permissions: currentPermissions
      } as Prisma.InputJsonValue,
      newValues: {
        permissions: data.permissions
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${data.employeeId}`);
    revalidatePath('/roles');
    
    return { success: true, message: 'Employee permissions updated successfully' };
  } catch (error) {
    console.error('Error updating employee permissions:', error);
    return { success: false, message: 'Failed to update employee permissions' };
  }
}

export async function updateRolePermissions(
  roleId: string,
  permissions: Record<string, boolean>
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if current user has permission to manage roles
    const hasRoleManagement = await checkRoleManagementAccess(user.id);
    if (!hasRoleManagement) {
      return { success: false, message: 'You do not have permission to manage role permissions' };
    }

    // Get current role for audit trail
    const currentRole = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!currentRole) {
      return { success: false, message: 'Role not found' };
    }

    const currentPermissions = currentRole.permissions as Record<string, boolean> | null;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: permissions as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'Role',
      recordId: roleId,
      oldValues: {
        permissions: currentPermissions
      } as Prisma.InputJsonValue,
      newValues: {
        permissions
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/roles');
    revalidatePath(`/roles/${roleId}`);
    
    return { success: true, message: 'Role permissions updated successfully' };
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return { success: false, message: 'Failed to update role permissions' };
  }
}

export async function getAvailablePermissions(): Promise<PermissionModule[]> {
  return PERMISSION_MODULES;
}

export async function checkUserPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!employee?.isActive) return false;

    const permissions = employee.role?.permissions as Record<string, boolean> | null;
    if (!permissions || typeof permissions !== 'object') return false;

    // Check for specific permission
    if (permissions[permission] === true) return true;

    // Check for admin access
    if (permissions['admin:full_access'] === true) return true;

    return false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

async function checkPermissionManagementAccess(userId: string): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!employee?.isActive) return false;

    const permissions = employee.role?.permissions as Record<string, boolean> | null;
    if (permissions && typeof permissions === 'object') {
      // Check for specific permission management access
      if (permissions['employees:permissions'] === true) return true;
      if (permissions['admin:full_access'] === true) return true;
    }

    // Check specific role codes
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR'] as const;
    return adminRoles.includes(employee.role?.code as typeof adminRoles[number]);
  } catch (error) {
    console.error('Error checking permission management access:', error);
    return false;
  }
}

async function checkRoleManagementAccess(userId: string): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!employee?.isActive) return false;

    const permissions = employee.role?.permissions as Record<string, boolean> | null;
    if (permissions && typeof permissions === 'object') {
      // Check for role management access
      if (permissions['roles:update'] === true) return true;
      if (permissions['admin:full_access'] === true) return true;
    }

    // Check specific role codes
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'] as const;
    return adminRoles.includes(employee.role?.code as typeof adminRoles[number]);
  } catch (error) {
    console.error('Error checking role management access:', error);
    return false;
  }
}

export async function getEmployeesWithPermissions(
  businessUnitId: string
): Promise<{ success: boolean; data: EmployeePermissions[]; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, data: [], message: 'Unauthorized' };
    }

    const employees = await prisma.employee.findMany({
      where: {
        businessUnitId,
        isActive: true
      },
      include: {
        role: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const employeesWithPermissions = employees.map(employee => ({
      employeeId: employee.id,
      roleId: employee.roleId,
      roleName: employee.role?.name || 'Unknown Role',
      roleCode: employee.role?.code || 'UNKNOWN',
      permissions: (employee.role?.permissions as Record<string, boolean>) || {},
      customPermissions: {} // For future individual overrides
    }));

    return {
      success: true,
      data: serializeForClient(employeesWithPermissions)
    };
  } catch (error) {
    console.error('Error fetching employees with permissions:', error);
    return { success: false, data: [], message: 'Failed to fetch employee permissions' };
  }
}

export async function createCustomRole(
  name: string,
  code: string,
  description: string,
  permissions: Record<string, boolean>
): Promise<{ success: boolean; message: string; roleId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if user has permission to create roles
    const hasRoleManagement = await checkRoleManagementAccess(user.id);
    if (!hasRoleManagement) {
      return { success: false, message: 'You do not have permission to create roles' };
    }

    // Check if role code already exists
    const existingRole = await prisma.role.findFirst({
      where: { 
        code,
        isActive: true
      }
    });

    if (existingRole) {
      return { success: false, message: 'Role with this code already exists' };
    }

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description,
        permissions: permissions as Prisma.InputJsonValue,
        isActive: true
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'CREATE',
      tableName: 'Role',
      recordId: role.id,
      newValues: {
        name,
        code,
        description,
        permissions
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/roles');
    return { success: true, message: 'Role created successfully', roleId: role.id };
  } catch (error) {
    console.error('Error creating custom role:', error);
    return { success: false, message: 'Failed to create role' };
  }
}

export async function assignRoleToEmployee(
  employeeId: string,
  roleId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if user has permission to manage employees
    const hasEmployeeManagement = await checkPermissionManagementAccess(user.id);
    if (!hasEmployeeManagement) {
      return { success: false, message: 'You do not have permission to assign roles' };
    }

    // Verify employee and role exist
    const [employee, role] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId, isActive: true }
      }),
      prisma.role.findUnique({
        where: { id: roleId, isActive: true }
      })
    ]);

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    if (!role) {
      return { success: false, message: 'Role not found' };
    }

    const oldRoleId = employee.roleId;

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        roleId,
        updatedAt: new Date()
      }
    });

    // Create audit log
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'Employee',
      recordId: employeeId,
      oldValues: {
        roleId: oldRoleId
      } as Prisma.InputJsonValue,
      newValues: {
        roleId
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${employeeId}`);
    
    return { success: true, message: 'Role assigned successfully' };
  } catch (error) {
    console.error('Error assigning role to employee:', error);
    return { success: false, message: 'Failed to assign role' };
  }
}