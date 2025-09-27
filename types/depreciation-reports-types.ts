// types/depreciation-report-types.ts
export interface DepreciationReportData {
  reportId: string;
  businessUnitId: string;
  generatedAt: Date;
  generatedBy: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: DepreciationSummaryData;
  assetDetails: DepreciationAssetDetail[];
  methodBreakdown: DepreciationMethodBreakdown[];
  categoryBreakdown: DepreciationCategoryBreakdown[];
}

export interface DepreciationSummaryData {
  totalAssets: number;
  totalOriginalValue: number;
  totalCurrentBookValue: number;
  totalAccumulatedDepreciation: number;
  totalMonthlyDepreciation: number;
  totalAnnualDepreciation: number;
  fullyDepreciatedAssets: number;
  assetsDueForDepreciation: number;
  averageAssetAge: number;
  depreciationRate: number; // Overall depreciation rate
}

export interface DepreciationAssetDetail {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  purchaseDate: Date;
  purchasePrice: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  depreciationMethod: string;
  usefulLifeMonths: number;
  remainingLifeMonths: number;
  salvageValue: number;
  depreciationRate: number;
  isFullyDepreciated: boolean;
  nextDepreciationDate: Date | null;
  location: string | null;
  assignedTo: string | null;
}

export interface DepreciationMethodBreakdown {
  method: string;
  assetCount: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  averageDepreciationRate: number;
}

export interface DepreciationCategoryBreakdown {
  category: string;
  assetCount: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  averageAssetAge: number;
}

export interface DepreciationAlert {
  id: string;
  type: 'DUE_FOR_CALCULATION' | 'FULLY_DEPRECIATED' | 'HIGH_DEPRECIATION' | 'SCHEDULE_REVIEW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  assetId: string;
  assetCode: string;
  assetDescription: string;
  dueDate: Date | null;
  createdAt: Date;
}

export interface BatchDepreciationResult {
  success: boolean;
  message: string;
  processedAssets: number;
  totalDepreciation: number;
  errors: Array<{
    assetId: string;
    assetCode: string;
    error: string;
  }>;
  summary: {
    totalAssets: number;
    successfulCalculations: number;
    failedCalculations: number;
    totalDepreciationAmount: number;
    fullyDepreciatedCount: number;
  };
}

export interface DepreciationExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeSchedule: boolean;
  includeHistory: boolean;
  includeSummary: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  assetIds?: string[];
  categories?: string[];
}