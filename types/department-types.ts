// types/department-types.ts
import { Department, BusinessUnit } from '@prisma/client';

export interface DepartmentWithRelations extends Department {
  businessUnit: BusinessUnit;
  _count: {
    employees: number;
  };
}

export interface CreateDepartmentData {
  name: string;
  code: string;
  description?: string;
  businessUnitId: string;
}

export interface UpdateDepartmentData extends Partial<CreateDepartmentData> {
  id: string;
}

export interface DepartmentFilters {
  search?: string;
  businessUnitId?: string;
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