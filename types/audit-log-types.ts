// types/audit-log-types.ts
import { JsonValue } from '@prisma/client/runtime/library';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues: JsonValue | null;
  newValues: JsonValue | null;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLogFilters {
  search?: string;
  action?: string;
  tableName?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
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

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export enum AuditTable {
  ASSET = 'Asset',
  EMPLOYEE = 'Employee',
  DEPLOYMENT = 'AssetDeployment',
  DEPARTMENT = 'Department',
  ROLE = 'Role',
  USER = 'User',
  REPORT = 'Report'
}