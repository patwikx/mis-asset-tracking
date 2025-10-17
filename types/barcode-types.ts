// types/barcode-types.ts

export interface AssetBarcode {
  barcodeValue: string;
  barcodeType: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13';
  barcodeGenerated: Date;
  tagNumber: string;
}

export interface AssetLookupResult {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  currentLocation?: string;
  assignedTo?: string;
  status: string;
  barcodeValue?: string;
  barcodeType?: string;
  tagNumber?: string;
}

export interface ScanResult {
  success: boolean;
  scannedValue: string;
  assetId?: string;
  asset?: AssetLookupResult;
  scanTimestamp: Date;
  scannedBy: string;
  error?: string;
}

export interface InventoryVerification {
  id: string;
  businessUnitId: string;
  verificationName: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalAssets: number;
  scannedAssets: number;
  verifiedAssets: number;
  discrepancies: number;
  createdBy: string;
  assignedTo: string[];
  locations: string[];
  categories: string[];
}

export interface VerificationItem {
  id: string;
  verificationId: string;
  assetId: string;
  expectedLocation: string;
  actualLocation?: string;
  expectedAssignee?: string;
  actualAssignee?: string;
  scannedAt?: Date;
  scannedBy?: string;
  status: 'PENDING' | 'VERIFIED' | 'DISCREPANCY' | 'NOT_FOUND';
  notes?: string;
  photos?: string[];
}

export interface BarcodeGenerationRequest {
  assetIds: string[];
  barcodeType: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13';
  includeCompanyLogo: boolean;
}

export interface QuickLookupFilters {
  searchTerm?: string;
  category?: string;
  location?: string;
  assignedTo?: string;
  status?: string;
  hasBarcode?: boolean; // Filter by barcode presence
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface BarcodeSettings {
  defaultBarcodeType: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13';
  includeCompanyLogo: boolean;
  autoGenerateOnAssetCreation: boolean;
  barcodePrefix: string;
}