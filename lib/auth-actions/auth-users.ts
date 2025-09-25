// In "@/lib/auth-actions/auth-users.ts"

import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

// Define proper where conditions types
type EmployeeWhereCondition = Prisma.EmployeeWhereInput;

/**
 * Fetches an employee by their unique employee ID.
 * This is equivalent to fetching by username in the original system.
 */
export const getUserByUsername = async (employeeId: string) => {
  try {
    const employee = await prisma.employee.findUnique({ 
      where: { employeeId },
      include: {
        businessUnit: true,
        department: true,
        role: true,
      }
    });
    return employee;
  } catch {
    return null;
  }
};

/**
 * Fetches an employee by their unique email address.
 * Useful for email-based authentication.
 */
export const getUserByEmail = async (email: string) => {
  try {
    const employee = await prisma.employee.findUnique({ 
      where: { email } 
    });
    return employee;
  } catch {
    return null;
  }
};

/**
 * Fetches an employee by their ID and includes all related data.
 * This includes business unit, department, and role information.
 */
export const getUserById = async (id: string) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        businessUnit: true,
        department: true,
        role: true,
      },
    });
    return employee;
  } catch {
    return null;
  }
};

/**
 * Fetches basic employee information by ID.
 * Returns only essential fields without relations.
 */
export const getUserBasicInfo = async (id: string) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        position: true,
        isActive: true,
      },
    });
    return employee;
  } catch {
    return null;
  }
};

/**
 * Fetches an employee's email by their ID.
 */
export const getUserEmailById = async (userId: string) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return employee?.email ?? null;
  } catch {
    return null;
  }
};

/**
 * Fetches an employee's full name by their ID.
 * Returns the concatenated first and last name.
 */
export const getUserNameById = async (userId: string) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: { 
        firstName: true, 
        lastName: true,
        middleName: true 
      },
    });

    if (!employee) return null;

    const fullName = employee.middleName 
      ? `${employee.firstName} ${employee.middleName} ${employee.lastName}`
      : `${employee.firstName} ${employee.lastName}`;

    return fullName;
  } catch {
    return null;
  }
};

/**
 * Fetches an employee's employee ID by their database ID.
 * This replaces the old username functionality.
 */
export const getEmployeeIdById = async (userId: string) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      select: { employeeId: true },
    });
    return employee?.employeeId ?? null;
  } catch {
    return null;
  }
};

/**
 * Gets all employees in a specific business unit.
 * Useful for filtering and business unit-specific operations.
 */
export const getEmployeesByBusinessUnit = async (businessUnitId: string) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { 
        businessUnitId,
        isActive: true 
      },
      include: {
        department: true,
        role: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
    });
    return employees;
  } catch {
    return [];
  }
};

/**
 * Gets all employees in a specific department.
 */
export const getEmployeesByDepartment = async (departmentId: string) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { 
        departmentId,
        isActive: true 
      },
      include: {
        businessUnit: true,
        role: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
    });
    return employees;
  } catch {
    return [];
  }
};

/**
 * Gets all employees with a specific role.
 * Useful for finding all managers, IT staff, etc.
 */
export const getEmployeesByRole = async (roleId: string) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { 
        roleId,
        isActive: true 
      },
      include: {
        businessUnit: true,
        department: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
    });
    return employees;
  } catch {
    return [];
  }
};

/**
 * Checks if an employee has a specific role.
 * Simple role-based authorization check.
 */
export const employeeHasRole = async (
  userId: string, 
  roleCode: string
): Promise<boolean> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });
    return employee?.role?.code === roleCode && employee?.isActive === true;
  } catch {
    return false;
  }
};

/**
 * Checks if an employee belongs to a specific business unit.
 * Useful for business unit-based authorization.
 */
export const employeeBelongsToBusinessUnit = async (
  userId: string, 
  businessUnitId: string
): Promise<boolean> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { 
        id: userId,
        businessUnitId,
        isActive: true 
      },
    });
    return !!employee;
  } catch {
    return false;
  }
};

/**
 * Checks if an employee belongs to a specific department.
 */
export const employeeBelongsToDepartment = async (
  userId: string, 
  departmentId: string
): Promise<boolean> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { 
        id: userId,
        departmentId,
        isActive: true 
      },
    });
    return !!employee;
  } catch {
    return false;
  }
};

/**
 * Gets employees who can approve asset deployments.
 * This could be based on role permissions or specific roles.
 */
export const getAccountingApprovers = async (businessUnitId?: string) => {
  try {
    const whereCondition: EmployeeWhereCondition = {
      isActive: true,
      role: {
        // Assuming accounting roles have specific codes or permissions
        OR: [
          { code: 'ACCOUNTING' },
          { code: 'FINANCE' },
          { code: 'MANAGER' },
          // Add more role codes that can approve
        ]
      }
    };

    if (businessUnitId) {
      whereCondition.businessUnitId = businessUnitId;
    }

    const approvers = await prisma.employee.findMany({
      where: whereCondition,
      include: {
        businessUnit: true,
        department: true,
        role: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
    });
    return approvers;
  } catch {
    return [];
  }
};

/**
 * Checks if an employee can approve asset deployments.
 * Based on role permissions or specific roles.
 */
export const canApproveAssetDeployments = async (userId: string): Promise<boolean> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!employee?.isActive) return false;

    // Check role permissions - using proper type assertion
    const permissions = employee.role?.permissions as Record<string, unknown> | null;
    if (permissions && typeof permissions === 'object' && permissions["assets.approve"] === true) {
      return true;
    }

    // Check specific role codes
    const approverRoles = ['ACCOUNTING', 'FINANCE', 'MANAGER', 'ADMIN'] as const;
    return approverRoles.includes(employee.role?.code as typeof approverRoles[number]);
  } catch {
    return false;
  }
};

/**
 * Gets active employees for dropdown/selection purposes.
 * Returns basic info suitable for UI components.
 */
export const getActiveEmployeesForSelection = async (businessUnitId?: string) => {
  try {
    const whereCondition: EmployeeWhereCondition = {
      isActive: true,
    };

    if (businessUnitId) {
      whereCondition.businessUnitId = businessUnitId;
    }

    const employees = await prisma.employee.findMany({
      where: whereCondition,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        middleName: true,
        position: true,
        department: {
          select: {
            name: true,
            code: true,
          }
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
    });

    // Transform data for easier use in UI
    return employees.map(emp => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.middleName 
        ? `${emp.firstName} ${emp.middleName} ${emp.lastName}`
        : `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      department: emp.department.name,
    }));
  } catch {
    return [];
  }
};