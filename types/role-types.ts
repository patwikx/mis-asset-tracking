// types/role-types.ts
import { Role, Prisma } from '@prisma/client';

export interface RoleWithCounts extends Role {
  _count: {
    employees: number;
  };
}

export interface CreateRoleData {
  name: string;
  code: string;
  description?: string;
  permissions?: Prisma.InputJsonValue;
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
  id: string;
}

export interface RoleFilters {
  search?: string;
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