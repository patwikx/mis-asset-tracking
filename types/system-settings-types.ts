// types/system-settings-types.ts
import { SystemSetting } from '@prisma/client';

export interface SystemSettingWithRelations extends SystemSetting {}

export interface CreateSystemSettingData {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface UpdateSystemSettingData extends Partial<CreateSystemSettingData> {
  id: string;
}

export interface SystemSettingFilters {
  search?: string;
  category?: string;
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