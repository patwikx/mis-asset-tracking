// types/deployment-report-types.ts
export interface DeploymentReportData {
  reportId: string;
  businessUnitId: string;
  generatedAt: Date;
  generatedBy: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: DeploymentSummaryData;
  deploymentDetails: DeploymentDetail[];
  statusBreakdown: DeploymentStatusBreakdown[];
  employeeBreakdown: EmployeeDeploymentBreakdown[];
}

export interface DeploymentSummaryData {
  totalDeployments: number;
  activeDeployments: number;
  pendingApprovals: number;
  returnedDeployments: number;
  cancelledDeployments: number;
  utilizationRate: number; // Percentage of assets currently deployed
  averageDeploymentDuration: number; // In days
  uniqueEmployees: number;
  uniqueAssets: number;
}

export interface DeploymentDetail {
  id: string;
  transmittalNumber: string;
  assetCode: string;
  assetDescription: string;
  employeeId: string;
  employeeName: string;
  status: string;
  deployedDate: Date | null;
  expectedReturnDate: Date | null;
  returnedDate: Date | null;
  deploymentCondition: string | null;
  returnCondition: string | null;
  deploymentNotes: string | null;
}

export interface DeploymentStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface EmployeeDeploymentBreakdown {
  employeeId: string;
  employeeName: string;
  deploymentCount: number;
  activeDeployments: number;
}

export interface DeploymentExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeReturned: boolean;
  includeCancelled: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  employeeIds?: string[];
  statuses?: string[];
}