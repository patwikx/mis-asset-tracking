// types/asset-types.ts
import { Asset, AssetCategory, AssetStatus, AssetDeployment, DeploymentStatus, Employee, BusinessUnit, Prisma } from '@prisma/client';

export type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    category: true;
    businessUnit: true;
    deployments: true;
    createdBy: true;
  };
}>;
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

// Bulk Asset Creation Types
export interface BulkAssetCreationData {
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
  
  // Depreciation fields
  depreciationMethod?: string;
  usefulLifeYears?: number;
  usefulLifeMonths?: number;
  salvageValue?: number;
  depreciationRate?: number;
  totalExpectedUnits?: number;
  startDepreciationImmediately?: boolean;
}

export interface BulkAssetCreationOptions {
  generateSequentialSerialNumbers: boolean;
  serialNumberPrefix?: string;
  serialNumberStartNumber?: number;
  serialNumberPadding?: number;
  autoGenerateItemCodes: boolean;
}

export interface BulkAssetCreationResult {
  success: boolean;
  message: string;
  createdCount: number;
  failedCount: number;
  createdAssetIds: string[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface BulkAssetValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface BulkAssetPreview {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: BulkAssetValidationError[];
  previewData: Array<{
    row: number;
    description: string;
    serialNumber?: string;
    itemCode?: string;
    purchasePrice?: number;
    categoryName?: string;
  }>;
}

// Enhanced Quantity Management Types
export interface BulkAssetUpdateData {
  assetIds: string[];
  updates: {
    status?: AssetStatus;
    location?: string;
    notes?: string;
    categoryId?: string;
    // Depreciation updates
    depreciationMethod?: string;
    usefulLifeYears?: number;
    usefulLifeMonths?: number;
    salvageValue?: number;
    depreciationRate?: number;
  };
}

export interface BulkAssetOperationResult {
  success: boolean;
  message: string;
  processedCount: number;
  failedCount: number;
  processedAssetIds: string[];
  errors: Array<{
    assetId: string;
    itemCode?: string;
    message: string;
  }>;
}

export interface BulkDeploymentCreationData {
  assetIds: string[];
  employeeId: string;
  businessUnitId: string;
  expectedReturnDate?: Date;
  deploymentNotes?: string;
  deploymentCondition?: string;
}

export interface BulkReturnData {
  deploymentIds: string[];
  returnCondition?: string;
  returnNotes?: string;
  returnDate?: Date;
}

export interface AssetSelectionCriteria {
  categoryIds?: string[];
  statuses?: AssetStatus[];
  locationPattern?: string;
  purchaseDateRange?: {
    from: Date;
    to: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
}

export interface BulkOperationPreview {
  operation: 'UPDATE' | 'DEPLOY' | 'RETURN' | 'DELETE';
  affectedAssets: Array<{
    id: string;
    itemCode: string;
    description: string;
    currentStatus: AssetStatus;
    currentLocation?: string;
    serialNumber?: string;
  }>;
  totalCount: number;
  warnings: string[];
  canProceed: boolean;
}

// Asset Disposal Types
export interface AssetDisposalData {
  assetId: string;
  disposalDate: Date;
  reason: 'SOLD' | 'DONATED' | 'SCRAPPED' | 'LOST' | 'STOLEN' | 'TRANSFERRED' | 'END_OF_LIFE' | 'DAMAGED_BEYOND_REPAIR' | 'OBSOLETE' | 'REGULATORY_COMPLIANCE';
  disposalMethod?: string;
  disposalLocation?: string;
  disposalValue?: number;
  disposalCost?: number;
  bookValueAtDisposal: number;
  recipientName?: string;
  recipientContact?: string;
  recipientAddress?: string;
  environmentalCompliance: boolean;
  dataWiped: boolean;
  complianceNotes?: string;
  condition?: string;
  notes?: string;
  internalReference?: string;
  documentationUrl?: string;
  certificateNumber?: string;
}

export interface AssetDisposalWithRelations {
  id: string;
  assetId: string;
  businessUnitId: string;
  disposalDate: Date;
  reason: string;
  disposalMethod?: string;
  disposalLocation?: string;
  disposalValue?: number;
  disposalCost?: number;
  netDisposalValue?: number;
  bookValueAtDisposal: number;
  gainLoss?: number;
  approvedBy?: string;
  approvedAt?: Date;
  documentationUrl?: string;
  certificateNumber?: string;
  recipientName?: string;
  recipientContact?: string;
  recipientAddress?: string;
  environmentalCompliance: boolean;
  dataWiped: boolean;
  complianceNotes?: string;
  condition?: string;
  notes?: string;
  internalReference?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  asset: {
    id: string;
    itemCode: string;
    description: string;
    serialNumber?: string;
    currentBookValue?: number;
  };
  businessUnit: {
    id: string;
    name: string;
    code: string;
  };
  createdByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  approvedByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export interface DisposalFilters {
  search?: string;
  reason?: 'SOLD' | 'DONATED' | 'SCRAPPED' | 'LOST' | 'STOLEN' | 'TRANSFERRED' | 'END_OF_LIFE' | 'DAMAGED_BEYOND_REPAIR' | 'OBSOLETE' | 'REGULATORY_COMPLIANCE';
  dateFrom?: Date;
  dateTo?: Date;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'ALL';
  minValue?: number;
  maxValue?: number;
}

export interface DisposalSummary {
  totalDisposals: number;
  totalDisposalValue: number;
  totalDisposalCost: number;
  netDisposalValue: number;
  totalGainLoss: number;
  pendingApprovals: number;
  disposalsByReason: Array<{
    reason: string;
    count: number;
    totalValue: number;
  }>;
}

export interface BulkDisposalData {
  assetIds: string[];
  disposalDate: Date;
  reason: 'SOLD' | 'DONATED' | 'SCRAPPED' | 'LOST' | 'STOLEN' | 'TRANSFERRED' | 'END_OF_LIFE' | 'DAMAGED_BEYOND_REPAIR' | 'OBSOLETE' | 'REGULATORY_COMPLIANCE';
  disposalMethod?: string;
  disposalLocation?: string;
  environmentalCompliance: boolean;
  dataWiped: boolean;
  complianceNotes?: string;
  notes?: string;
}

// Asset Transfer Types
export interface AssetTransferData {
  assetId: string;
  fromBusinessUnitId: string;
  toBusinessUnitId: string;
  fromLocation?: string;
  toLocation?: string;
  transferDate: Date;
  reason: string;
  transferMethod?: string;
  trackingNumber?: string;
  estimatedArrival?: Date;
  conditionBefore?: string;
  transferNotes?: string;
  transferCost?: number;
  insuranceValue?: number;
}

export interface AssetTransferWithRelations {
  id: string;
  assetId: string;
  transferNumber: string;
  fromBusinessUnitId: string;
  toBusinessUnitId: string;
  fromLocation?: string;
  toLocation?: string;
  transferDate: Date;
  requestedDate: Date;
  completedDate?: Date;
  status: string; // AssetTransferStatus enum
  reason: string;
  transferMethod?: string;
  trackingNumber?: string;
  estimatedArrival?: Date;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  transferNotes?: string;
  documentationUrl?: string;
  transferCost?: number;
  insuranceValue?: number;
  handedOverBy?: string;
  handedOverAt?: Date;
  receivedBy?: string;
  receivedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  asset: {
    id: string;
    itemCode: string;
    description: string;
    serialNumber?: string;
    currentBookValue?: number;
  };
  fromBusinessUnit: {
    id: string;
    name: string;
    code: string;
  };
  toBusinessUnit: {
    id: string;
    name: string;
    code: string;
  };
  requestedByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  approvedByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  rejectedByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  handedOverByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  receivedByEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  createdByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export interface TransferFilters {
  search?: string;
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  fromBusinessUnitId?: string;
  toBusinessUnitId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  requestedBy?: string;
}

export interface TransferSummary {
  totalTransfers: number;
  pendingApprovals: number;
  inTransit: number;
  completed: number;
  totalTransferCost: number;
  averageTransferTime: number; // in days
  transfersByBusinessUnit: Array<{
    businessUnitId: string;
    businessUnitName: string;
    outgoingTransfers: number;
    incomingTransfers: number;
  }>;
}

export interface BulkTransferData {
  assetIds: string[];
  toBusinessUnitId: string;
  toLocation?: string;
  transferDate: Date;
  reason: string;
  transferMethod?: string;
  estimatedArrival?: Date;
  transferNotes?: string;
}