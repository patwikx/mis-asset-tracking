// types/asset-types.ts
import { Asset, AssetCategory, AssetStatus, AssetDeployment, DeploymentStatus, Employee, BusinessUnit } from '@prisma/client';

export interface AssetWithRelations extends Asset {
  category: AssetCategory;
  businessUnit: BusinessUnit;
  deployments: AssetDeployment[];
  createdBy: Employee;
}

export interface AssetCategoryWithCounts extends AssetCategory {
  _count: {
    assets: number;
  };
}

export interface AssetDeploymentWithRelations extends AssetDeployment {
  asset: Asset & { category: AssetCategory };
  employee: Employee;
  businessUnit: BusinessUnit;
  accountingApprover?: Employee | null;
}

// Type for the actual query result from Prisma
export type DeploymentQueryResult = AssetDeployment & {
  asset: Asset & { category: AssetCategory };
  employee: Employee;
  businessUnit: BusinessUnit;
  accountingApprover: Employee | null;
}

export interface CreateAssetData {
  itemCode: string;
  description: string;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  specifications?: Record<string, unknown>;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiry?: Date;
  categoryId: string;
  businessUnitId: string;
  quantity: number;
  status: AssetStatus;
  location?: string;
  notes?: string;
}

export interface UpdateAssetData extends Partial<CreateAssetData> {
  id: string;
}

export interface CreateAssetCategoryData {
  name: string;
  code: string;
  description: string;
}

export interface UpdateAssetCategoryData extends Partial<CreateAssetCategoryData> {
  id: string;
}

export interface CreateDeploymentData {
  assetId: string;
  employeeId: string;
  businessUnitId: string;
  transmittalNumber?: string; // Will be auto-generated if not provided
  expectedReturnDate?: Date;
  deploymentNotes?: string;
  deploymentCondition?: string;
}

export interface UpdateDeploymentData {
  id: string;
  status?: DeploymentStatus;
  deploymentNotes?: string;
  returnedDate?: Date;
  returnCondition?: string;
  returnNotes?: string;
  accountingNotes?: string;
  accountingApproverId?: string;
  accountingApprovedAt?: Date;
  deployedDate?: Date;
}

export interface AssetFilters {
  search?: string;
  categoryId?: string;
  status?: AssetStatus;
  minPrice?: number;
  maxPrice?: number;
}

export interface DeploymentFilters {
  search?: string;
  status?: DeploymentStatus;
  employeeId?: string;
  assetId?: string;
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

export interface BulkDeploymentData {
  assetId: string;
  employeeId: string;
  businessUnitId: string;
  deploymentNotes?: string;
}