// types/report-types.ts
import { JsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

export interface Report {
  id: string;
  name: string;
  description: string | null;
  type: string;
  parameters: JsonValue | null;
  generatedAt: Date;
  generatedBy: string;
  businessUnitId: string;
  data: JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReportType {
  ASSET_INVENTORY = 'ASSET_INVENTORY',
  DEPLOYMENT_SUMMARY = 'DEPLOYMENT_SUMMARY',
  EMPLOYEE_ASSETS = 'EMPLOYEE_ASSETS',
  ASSET_UTILIZATION = 'ASSET_UTILIZATION',
  FINANCIAL_SUMMARY = 'FINANCIAL_SUMMARY',
  MAINTENANCE_SCHEDULE = 'MAINTENANCE_SCHEDULE',
  AUDIT_TRAIL = 'AUDIT_TRAIL'
}

export interface CreateReportData {
  name: string;
  description?: string;
  type: ReportType;
  parameters: Prisma.InputJsonValue;
  businessUnitId: string;
}

export interface ReportFilters {
  search?: string;
  type?: string;
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

export interface AssetInventoryReport {
  totalAssets: number;
  assetsByCategory: Array<{
    categoryName: string;
    count: number;
    totalValue: number;
  }>;
  assetsByStatus: Array<{
    status: string;
    count: number;
  }>;
  topAssetsByValue: Array<{
    itemCode: string;
    description: string;
    purchasePrice: number;
  }>;
}

export interface DeploymentSummaryReport {
  totalDeployments: number;
  activeDeployments: number;
  pendingReturns: number;
  deploymentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  topEmployeesByAssets: Array<{
    employeeName: string;
    assetCount: number;
  }>;
}

export interface AnalyticsData {
  assetTrends: Array<{
    date: string;
    totalAssets: number;
    deployedAssets: number;
    availableAssets: number;
  }>;
  deploymentTrends: Array<{
    date: string;
    newDeployments: number;
    returns: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  utilizationRate: {
    deployed: number;
    available: number;
    maintenance: number;
    retired: number;
  };
}