// types/asset-utilization-types.ts

export interface AssetUtilizationFilters {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  businessUnitId?: string;
  status?: 'AVAILABLE' | 'DEPLOYED' | 'IN_MAINTENANCE' | 'RETIRED' | 'LOST' | 'DAMAGED' | 'DISPOSED' | 'FULLY_DEPRECIATED';
  deploymentStatus?: 'ACTIVE' | 'IDLE' | 'ALL';
  utilizationThreshold?: number; // Percentage threshold for utilization
}

export interface DeploymentRateAnalysis {
  totalAssets: number;
  deployedAssets: number;
  availableAssets: number;
  deploymentRate: number; // Percentage
  averageDeploymentDuration: number; // Days
  deploymentTrends: Array<{
    period: string; // Month/Quarter
    deploymentCount: number;
    deploymentRate: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    totalAssets: number;
    deployedAssets: number;
    deploymentRate: number;
  }>;
}

export interface IdleAssetAnalysis {
  totalIdleAssets: number;
  idleAssetValue: number;
  idleAssets: Array<{
    id: string;
    itemCode: string;
    description: string;
    category: string;
    currentBookValue: number;
    lastDeploymentDate?: Date;
    daysSinceLastDeployment?: number;
    location?: string;
    idleReason: 'NEVER_DEPLOYED' | 'RETURNED_NOT_REDEPLOYED' | 'MAINTENANCE_OVERDUE' | 'DAMAGED' | 'OBSOLETE';
    recommendedAction: 'REDEPLOY' | 'MAINTENANCE' | 'RETIRE' | 'DISPOSE';
  }>;
  idleByCategory: Array<{
    categoryName: string;
    idleCount: number;
    idleValue: number;
    idlePercentage: number;
  }>;
  idleTrends: Array<{
    period: string;
    idleCount: number;
    idleValue: number;
  }>;
}

export interface CostCenterAllocation {
  costCenterId: string;
  costCenterName: string;
  totalAssets: number;
  totalAssetValue: number;
  deployedAssets: number;
  deployedAssetValue: number;
  utilizationRate: number;
  monthlyDepreciation: number;
  allocatedCosts: {
    assetValue: number;
    depreciationCost: number;
    maintenanceCost: number;
    deploymentCost: number;
    totalCost: number;
  };
  assetsByCategory: Array<{
    categoryName: string;
    assetCount: number;
    assetValue: number;
  }>;
}

export interface ROICalculation {
  assetId: string;
  itemCode: string;
  description: string;
  category: string;
  purchasePrice: number;
  currentBookValue: number;
  totalDepreciation: number;
  deploymentHistory: {
    totalDeployments: number;
    totalDeploymentDays: number;
    averageDeploymentDuration: number;
    utilizationRate: number; // Percentage of time deployed
  };
  financialMetrics: {
    costPerDeploymentDay: number;
    valueUtilized: number; // Based on deployment usage
    remainingValue: number;
    roi: number; // Return on Investment percentage
    paybackPeriod?: number; // Days to break even
  };
  performanceRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  recommendations: string[];
}

export interface AssetUtilizationSummary {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  overallMetrics: {
    totalAssets: number;
    totalAssetValue: number;
    averageUtilizationRate: number;
    totalIdleAssets: number;
    totalIdleValue: number;
    averageROI: number;
  };
  deploymentRateAnalysis: DeploymentRateAnalysis;
  idleAssetAnalysis: IdleAssetAnalysis;
  costCenterAllocations: CostCenterAllocation[];
  topPerformingAssets: ROICalculation[];
  underperformingAssets: ROICalculation[];
  recommendations: {
    category: 'DEPLOYMENT' | 'MAINTENANCE' | 'RETIREMENT' | 'PROCUREMENT';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    estimatedImpact: string;
    actionItems: string[];
  }[];
}

export interface UtilizationTrendData {
  period: string;
  deploymentRate: number;
  utilizationRate: number;
  idleAssetCount: number;
  averageROI: number;
}

export interface AssetPerformanceMetrics {
  assetId: string;
  itemCode: string;
  description: string;
  category: string;
  metrics: {
    utilizationScore: number; // 0-100
    reliabilityScore: number; // 0-100 (based on maintenance frequency)
    costEfficiencyScore: number; // 0-100
    overallScore: number; // 0-100
  };
  benchmarks: {
    categoryAverage: number;
    industryStandard: number;
    targetUtilization: number;
  };
}

export interface UtilizationReportFilters {
  reportType: 'SUMMARY' | 'DEPLOYMENT_ANALYSIS' | 'IDLE_ASSETS' | 'COST_CENTER' | 'ROI_ANALYSIS' | 'PERFORMANCE_METRICS';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  businessUnitIds?: string[];
  categoryIds?: string[];
  costCenterIds?: string[];
  includeDisposed?: boolean;
  utilizationThreshold?: number;
  sortBy?: 'UTILIZATION' | 'ROI' | 'VALUE' | 'IDLE_DAYS';
  sortOrder?: 'ASC' | 'DESC';
}