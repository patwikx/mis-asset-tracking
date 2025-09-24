// types/employee-types.ts
import { Employee, Department, Role, BusinessUnit } from '@prisma/client';

export interface EmployeeWithRelations extends Employee {
  department: Department;
  role: Role;
  businessUnit: BusinessUnit;
}

export interface CreateEmployeeData {
  employeeId: string;
  email?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  position?: string;
  businessUnitId: string;
  departmentId: string;
  roleId: string;
  hireDate?: Date;
  passwordHash: string;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  id: string;
}

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}