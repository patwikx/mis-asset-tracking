// types/depreciation-types.ts
import { DepreciationMethod } from '@prisma/client';

export interface DepreciationCalculation {
  assetId: string;
  currentBookValue: number;
  depreciationAmount: number;
  newBookValue: number;
  accumulatedDepreciation: number;
  isFullyDepreciated: boolean;
  method: DepreciationMethod;
  calculationDate: Date;
}

export interface DepreciationPreview {
  currentBookValue: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  remainingValue: number;
  yearsRemaining: number;
  percentageDepreciated: number;
}

export interface DepreciationScheduleEntry {
  period: number;
  date: Date;
  bookValueStart: number;
  depreciationAmount: number;
  bookValueEnd: number;
  accumulatedDepreciation: number;
}

export interface DepreciationSummary {
  totalAssets: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  fullyDepreciatedAssets: number;
  assetsDueForDepreciation: number;
}

export interface AssetDepreciationHistory {
  id: string;
  depreciationDate: Date;
  periodStartDate: Date;
  periodEndDate: Date;
  bookValueStart: number;
  depreciationAmount: number;
  bookValueEnd: number;
  accumulatedDepreciation: number;
  method: DepreciationMethod;
  calculationBasis: Record<string, unknown>;
  unitsInPeriod?: number;
  notes?: string;
}

export interface CreateDepreciationData {
  assetId: string;
  depreciationAmount: number;
  periodStartDate: Date;
  periodEndDate: Date;
  unitsInPeriod?: number;
  notes?: string;
}