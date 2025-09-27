// lib/actions/depreciation-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { DepreciationMethod, AssetStatus, AssetHistoryAction, Prisma } from '@prisma/client';
import type {
  DepreciationCalculation,
  DepreciationScheduleEntry,
  DepreciationSummary,
  AssetDepreciationHistory,
} from '@/types/depreciation-types';

export async function calculateAssetDepreciation(
  assetId: string,
  unitsInPeriod?: number
): Promise<{ success: boolean; message: string; calculation?: DepreciationCalculation }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset || !asset.purchasePrice || !asset.usefulLifeMonths) {
      return { success: false, message: 'Asset not found or missing depreciation data' };
    }

    if (asset.isFullyDepreciated) {
      return { success: false, message: 'Asset is already fully depreciated' };
    }

    const currentBookValue = asset.currentBookValue?.toNumber() || asset.purchasePrice.toNumber();
    const salvageValue = asset.salvageValue?.toNumber() || 0;

    if (currentBookValue <= salvageValue) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { 
          isFullyDepreciated: true,
          status: AssetStatus.FULLY_DEPRECIATED
        }
      });
      return { success: false, message: 'Asset has reached its salvage value' };
    }

    const depreciationAmount = calculateDepreciationAmount(
      asset.purchasePrice.toNumber(),
      salvageValue,
      asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      asset.usefulLifeMonths,
      currentBookValue,
      asset.depreciationRate?.toNumber(),
      asset.totalExpectedUnits || undefined,
      unitsInPeriod
    );

    const newBookValue = Math.max(currentBookValue - depreciationAmount, salvageValue);
    const actualDepreciation = currentBookValue - newBookValue;
    const isFullyDepreciated = newBookValue <= salvageValue;

    // Create depreciation record
    const periodStart = asset.lastDepreciationDate || asset.depreciationStartDate || asset.purchaseDate || new Date();
    const periodEnd = new Date();

    await prisma.assetDepreciation.create({
      data: {
        assetId,
        businessUnitId: asset.businessUnitId,
        depreciationDate: periodEnd,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        bookValueStart: new Prisma.Decimal(currentBookValue),
        depreciationAmount: new Prisma.Decimal(actualDepreciation),
        bookValueEnd: new Prisma.Decimal(newBookValue),
        accumulatedDepreciation: new Prisma.Decimal(
          (asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation
        ),
        method: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        calculationBasis: {
          originalCost: asset.purchasePrice.toNumber(),
          salvageValue,
          usefulLifeMonths: asset.usefulLifeMonths,
          unitsInPeriod
        } as Prisma.InputJsonValue,
        unitsStart: unitsInPeriod ? asset.currentUnits : null,
        unitsEnd: unitsInPeriod ? asset.currentUnits + unitsInPeriod : null,
        unitsInPeriod,
        calculatedBy: user.id
      }
    });

    // Update asset
    const nextDepreciationDate = new Date(periodEnd);
    nextDepreciationDate.setMonth(nextDepreciationDate.getMonth() + 1);

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        currentBookValue: new Prisma.Decimal(newBookValue),
        accumulatedDepreciation: new Prisma.Decimal(
          (asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation
        ),
        lastDepreciationDate: periodEnd,
        nextDepreciationDate: isFullyDepreciated ? null : nextDepreciationDate,
        isFullyDepreciated,
        currentUnits: unitsInPeriod ? asset.currentUnits + unitsInPeriod : asset.currentUnits,
        status: isFullyDepreciated ? AssetStatus.FULLY_DEPRECIATED : asset.status
      }
    });

    // Create asset history entry
    await prisma.assetHistory.create({
      data: {
        assetId,
        action: AssetHistoryAction.DEPRECIATION_CALCULATED,
        businessUnitId: asset.businessUnitId,
        previousBookValue: new Prisma.Decimal(currentBookValue),
        newBookValue: new Prisma.Decimal(newBookValue),
        depreciationAmount: new Prisma.Decimal(actualDepreciation),
        notes: `Depreciation calculated: ${asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE}`,
        performedById: user.id,
        metadata: {
          method: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          unitsInPeriod
        } as Prisma.InputJsonValue
      }
    });

    const calculation: DepreciationCalculation = {
      assetId,
      currentBookValue,
      depreciationAmount: actualDepreciation,
      newBookValue,
      accumulatedDepreciation: (asset.accumulatedDepreciation?.toNumber() || 0) + actualDepreciation,
      isFullyDepreciated,
      method: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      calculationDate: periodEnd
    };

    revalidatePath('/assets');
    revalidatePath(`/assets/${assetId}`);

    return {
      success: true,
      message: `Depreciation calculated successfully`,
      calculation: serializeForClient(calculation)
    };

  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return { success: false, message: 'Failed to calculate depreciation' };
  }
}

export async function getAssetDepreciationHistory(assetId: string): Promise<AssetDepreciationHistory[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const history = await prisma.assetDepreciation.findMany({
      where: { assetId },
      orderBy: { depreciationDate: 'desc' }
    });

    const serializedHistory: AssetDepreciationHistory[] = history.map(entry => ({
      id: entry.id,
      depreciationDate: entry.depreciationDate,
      periodStartDate: entry.periodStartDate,
      periodEndDate: entry.periodEndDate,
      bookValueStart: entry.bookValueStart.toNumber(),
      depreciationAmount: entry.depreciationAmount.toNumber(),
      bookValueEnd: entry.bookValueEnd.toNumber(),
      accumulatedDepreciation: entry.accumulatedDepreciation.toNumber(),
      method: entry.method,
      calculationBasis: entry.calculationBasis as Record<string, unknown>,
      unitsInPeriod: entry.unitsInPeriod || undefined,
      notes: entry.notes || undefined
    }));

    return serializeForClient(serializedHistory);
  } catch (error) {
    console.error('Error fetching depreciation history:', error);
    throw new Error('Failed to fetch depreciation history');
  }
}

export async function getDepreciationSchedule(assetId: string): Promise<{
  success: boolean;
  message: string;
  schedule?: DepreciationScheduleEntry[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset || !asset.purchasePrice || !asset.usefulLifeMonths) {
      return { success: false, message: 'Asset not found or missing depreciation data' };
    }

    const schedule: DepreciationScheduleEntry[] = [];
    const purchasePrice = asset.purchasePrice.toNumber();
    const salvageValue = asset.salvageValue?.toNumber() || 0;
    const usefulLifeMonths = asset.usefulLifeMonths;
    const startDate = asset.depreciationStartDate || asset.purchaseDate || new Date();

    let currentBookValue = purchasePrice;
    let accumulatedDepreciation = 0;

    for (let period = 1; period <= usefulLifeMonths; period++) {
      const periodDate = new Date(startDate);
      periodDate.setMonth(periodDate.getMonth() + period - 1);

      const depreciationAmount = calculateDepreciationAmount(
        purchasePrice,
        salvageValue,
        asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        usefulLifeMonths,
        currentBookValue,
        asset.depreciationRate?.toNumber(),
        asset.totalExpectedUnits || undefined
      );

      const maxDepreciation = currentBookValue - salvageValue;
      const actualDepreciation = Math.min(depreciationAmount, maxDepreciation);
      const bookValueEnd = currentBookValue - actualDepreciation;
      accumulatedDepreciation += actualDepreciation;

      schedule.push({
        period,
        date: periodDate,
        bookValueStart: Math.round(currentBookValue * 100) / 100,
        depreciationAmount: Math.round(actualDepreciation * 100) / 100,
        bookValueEnd: Math.round(bookValueEnd * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100
      });

      currentBookValue = bookValueEnd;

      if (currentBookValue <= salvageValue) {
        break;
      }
    }

    return {
      success: true,
      message: 'Depreciation schedule calculated',
      schedule: serializeForClient(schedule)
    };

  } catch (error) {
    console.error('Error calculating depreciation schedule:', error);
    return { success: false, message: 'Failed to calculate depreciation schedule' };
  }
}

export async function getDepreciationSummary(businessUnitId: string): Promise<DepreciationSummary> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        businessUnitId,
        purchasePrice: { not: null }
      }
    });

    const totalAssets = assets.length;
    const totalOriginalValue = assets.reduce((sum, asset) => 
      sum + (asset.purchasePrice?.toNumber() || 0), 0
    );
    const totalCurrentValue = assets.reduce((sum, asset) => 
      sum + (asset.currentBookValue?.toNumber() || asset.purchasePrice?.toNumber() || 0), 0
    );
    const totalDepreciation = assets.reduce((sum, asset) => 
      sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0
    );
    const fullyDepreciatedAssets = assets.filter(asset => asset.isFullyDepreciated).length;
    const assetsDueForDepreciation = assets.filter(asset => 
      asset.nextDepreciationDate && asset.nextDepreciationDate <= new Date()
    ).length;

    return serializeForClient({
      totalAssets,
      totalOriginalValue,
      totalCurrentValue,
      totalDepreciation,
      fullyDepreciatedAssets,
      assetsDueForDepreciation
    });

  } catch (error) {
    console.error('Error getting depreciation summary:', error);
    throw new Error('Failed to get depreciation summary');
  }
}

export async function batchCalculateDepreciation(businessUnitId?: string): Promise<{
  success: boolean;
  message: string;
  processedAssets: number;
  totalDepreciation: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized', processedAssets: 0, totalDepreciation: 0 };
    }

    const whereClause: Prisma.AssetWhereInput = {
      isActive: true,
      isFullyDepreciated: false,
      nextDepreciationDate: {
        lte: new Date()
      },
      purchasePrice: { not: null },
      usefulLifeMonths: { not: null }
    };

    if (businessUnitId) {
      whereClause.businessUnitId = businessUnitId;
    }

    const assetsDue = await prisma.asset.findMany({
      where: whereClause
    });

    let processedAssets = 0;
    let totalDepreciation = 0;

    for (const asset of assetsDue) {
      const result = await calculateAssetDepreciation(asset.id);
      if (result.success && result.calculation) {
        processedAssets++;
        totalDepreciation += result.calculation.depreciationAmount;
      }
    }

    revalidatePath('/assets');
    revalidatePath('/analytics');

    return {
      success: true,
      message: `Processed ${processedAssets} assets for depreciation`,
      processedAssets,
      totalDepreciation
    };

  } catch (error) {
    console.error('Error in batch depreciation:', error);
    return { 
      success: false, 
      message: 'Failed to process batch depreciation',
      processedAssets: 0,
      totalDepreciation: 0
    };
  }
}

function calculateDepreciationAmount(
  purchasePrice: number,
  salvageValue: number,
  method: DepreciationMethod,
  usefulLifeMonths: number,
  currentBookValue: number,
  depreciationRate?: number,
  totalExpectedUnits?: number,
  unitsInPeriod?: number
): number {
  switch (method) {
    case DepreciationMethod.STRAIGHT_LINE:
      return (purchasePrice - salvageValue) / usefulLifeMonths;
    
    case DepreciationMethod.DECLINING_BALANCE:
      if (!depreciationRate) return 0;
      return currentBookValue * (depreciationRate / 12); // Monthly rate
    
    case DepreciationMethod.UNITS_OF_PRODUCTION:
      if (!totalExpectedUnits || !unitsInPeriod) return 0;
      const depreciationPerUnit = (purchasePrice - salvageValue) / totalExpectedUnits;
      return depreciationPerUnit * unitsInPeriod;
    
    case DepreciationMethod.SUM_OF_YEARS_DIGITS:
      const yearsRemaining = Math.ceil(usefulLifeMonths / 12);
      const totalYears = Math.ceil(usefulLifeMonths / 12);
      const sumOfYears = (totalYears * (totalYears + 1)) / 2;
      const yearlyDepreciation = ((purchasePrice - salvageValue) * yearsRemaining) / sumOfYears;
      return yearlyDepreciation / 12; // Monthly amount
    
    default:
      return 0;
  }
}

export async function updateAssetUnits(
  assetId: string,
  unitsProduced: number
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId, isActive: true }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    if (asset.depreciationMethod !== DepreciationMethod.UNITS_OF_PRODUCTION) {
      return { success: false, message: 'Asset does not use units of production depreciation method' };
    }

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        currentUnits: asset.currentUnits + unitsProduced
      }
    });

    // Create history entry
    await prisma.assetHistory.create({
      data: {
        assetId,
        action: AssetHistoryAction.UPDATED,
        businessUnitId: asset.businessUnitId,
        notes: `Units updated: +${unitsProduced} (Total: ${asset.currentUnits + unitsProduced})`,
        performedById: user.id,
        metadata: {
          unitsAdded: unitsProduced,
          previousUnits: asset.currentUnits,
          newUnits: asset.currentUnits + unitsProduced
        } as Prisma.InputJsonValue
      }
    });

    // If asset has accumulated enough units, trigger depreciation calculation
    if (asset.depreciationPerUnit && unitsProduced > 0) {
      await calculateAssetDepreciation(assetId, unitsProduced);
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${assetId}`);
    return { success: true, message: 'Asset units updated successfully' };

  } catch (error) {
    console.error('Error updating asset units:', error);
    return { success: false, message: 'Failed to update asset units' };
  }
}

export async function getAssetsDueForDepreciation(businessUnitId?: string): Promise<Array<{
  id: string;
  itemCode: string;
  description: string;
  currentBookValue: number;
  nextDepreciationDate: Date;
  monthlyDepreciation: number;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const whereClause: Prisma.AssetWhereInput = {
      isActive: true,
      isFullyDepreciated: false,
      nextDepreciationDate: {
        lte: new Date()
      }
    };

    if (businessUnitId) {
      whereClause.businessUnitId = businessUnitId;
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        id: true,
        itemCode: true,
        description: true,
        currentBookValue: true,
        nextDepreciationDate: true,
        monthlyDepreciation: true
      },
      orderBy: { nextDepreciationDate: 'asc' }
    });

    const serializedAssets = assets.map(asset => ({
      id: asset.id,
      itemCode: asset.itemCode,
      description: asset.description,
      currentBookValue: asset.currentBookValue?.toNumber() || 0,
      nextDepreciationDate: asset.nextDepreciationDate!,
      monthlyDepreciation: asset.monthlyDepreciation?.toNumber() || 0
    }));

    return serializeForClient(serializedAssets);

  } catch (error) {
    console.error('Error fetching assets due for depreciation:', error);
    throw new Error('Failed to fetch assets due for depreciation');
  }
}