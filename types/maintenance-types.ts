// types/maintenance-types.ts
import { AssetMaintenance, Asset, AssetCategory, BusinessUnit } from '@prisma/client';

export interface AssetMaintenanceWithRelations extends AssetMaintenance {
  asset: Asset & {
    category: AssetCategory;
    businessUnit: BusinessUnit;
  };
}

export interface CreateMaintenanceData {
  assetId: string;
  maintenanceType: string;
  description: string;
  scheduledDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  performedBy?: string;
  cost?: number;
  notes?: string;
  isCompleted?: boolean;
}

export interface UpdateMaintenanceData extends Partial<CreateMaintenanceData> {
  id: string;
}

export interface MaintenanceFilters {
  search?: string;
  maintenanceType?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
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

export interface MaintenanceScheduleItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetDescription: string;
  maintenanceType: string;
  description: string;
  scheduledDate: Date;
  isOverdue: boolean;
  daysUntilDue: number;
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION'
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}