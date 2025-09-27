// types/asset-report-types.ts
export interface AssetReportData {
  reportId: string;
  businessUnitId: string;
  generatedAt: Date;
  generatedBy: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: AssetSummaryData;
  assetDetails: AssetDetail[];
  categoryBreakdown: AssetCategoryBreakdown[];
  statusBreakdown: AssetStatusBreakdown[];
  deploymentBreakdown: DeploymentStatusBreakdown[];
}

export interface AssetSummaryData {
  totalAssets: number;
  availableAssets: number;
  deployedAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  totalAssetValue: number;
  averageAssetValue: number;
  activeDeployments: number;
  pendingApprovals: number;
  utilizationRate: number; // Percentage of assets deployed
  averageAssetAge: number; // In months
  categoriesCount: number;
}

export interface AssetDetail {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  status: string;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  currentBookValue: number | null;
  location: string | null;
  assignedTo: string | null;
  serialNumber: string | null;
  brand: string | null;
  warrantyExpiry: Date | null;
  lastMaintenanceDate: Date | null;
}

export interface AssetCategoryBreakdown {
  category: string;
  assetCount: number;
  totalValue: number;
  availableCount: number;
  deployedCount: number;
  maintenanceCount: number;
  percentage: number; // Percentage of total assets
}

export interface AssetStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  totalValue: number;
}

export interface DeploymentStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface AssetExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeDeployments: boolean;
  includeMaintenance: boolean;
  includeFinancials: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  assetIds?: string[];
  categories?: string[];
  statuses?: string[];
}