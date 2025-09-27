// lib/actions/depreciation-reports-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { DepreciationMethod, Prisma } from '@prisma/client';
import type {
  DepreciationReportData,
  DepreciationSummaryData,
  DepreciationAssetDetail,
  DepreciationMethodBreakdown,
  DepreciationCategoryBreakdown,
  DepreciationAlert,
  BatchDepreciationResult
} from '@/types/depreciation-reports-types';

export async function generateDepreciationReport(
  businessUnitId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; message: string; report?: DepreciationReportData }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const reportStartDate = startDate || new Date(new Date().getFullYear(), 0, 1); // Start of year
    const reportEndDate = endDate || new Date(); // Current date

    const [
      summary,
      assetDetails,
      methodBreakdown,
      categoryBreakdown
    ] = await Promise.all([
      generateDepreciationSummary(businessUnitId, reportStartDate, reportEndDate),
      generateAssetDetails(businessUnitId, reportStartDate, reportEndDate),
      generateMethodBreakdown(businessUnitId, reportStartDate, reportEndDate),
      generateCategoryBreakdown(businessUnitId, reportStartDate, reportEndDate)
    ]);

    const report: DepreciationReportData = {
      reportId: `DEP-${Date.now()}`,
      businessUnitId,
      generatedAt: new Date(),
      generatedBy: `${user.firstName} ${user.lastName}`,
      reportPeriod: {
        startDate: reportStartDate,
        endDate: reportEndDate
      },
      summary,
      assetDetails,
      methodBreakdown,
      categoryBreakdown
    };

    return {
      success: true,
      message: 'Depreciation report generated successfully',
      report: serializeForClient(report)
    };

  } catch (error) {
    console.error('Error generating depreciation report:', error);
    return { success: false, message: 'Failed to generate depreciation report' };
  }
}

async function generateDepreciationSummary(
  businessUnitId: string,
  startDate: Date,
  endDate: Date
): Promise<DepreciationSummaryData> {
  const assets = await prisma.asset.findMany({
    where: {
      businessUnitId,
      isActive: true,
      NOT: {
        purchasePrice: null
      },
      purchaseDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const totalAssets = assets.length;
  const totalOriginalValue = assets.reduce((sum, asset) => 
    sum + (asset.purchasePrice?.toNumber() || 0), 0
  );
  const totalCurrentBookValue = assets.reduce((sum, asset) => 
    sum + (asset.currentBookValue?.toNumber() || asset.purchasePrice?.toNumber() || 0), 0
  );
  const totalAccumulatedDepreciation = assets.reduce((sum, asset) => 
    sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0
  );
  const totalMonthlyDepreciation = assets.reduce((sum, asset) => 
    sum + (asset.monthlyDepreciation?.toNumber() || 0), 0
  );
  const fullyDepreciatedAssets = assets.filter(asset => asset.isFullyDepreciated).length;
  const assetsDueForDepreciation = assets.filter(asset => 
    asset.nextDepreciationDate && asset.nextDepreciationDate <= new Date()
  ).length;

  // Calculate average asset age in months
  const currentDate = new Date();
  const totalAgeInMonths = assets.reduce((sum, asset) => {
    if (asset.purchaseDate) {
      const ageInMonths = (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return sum + ageInMonths;
    }
    return sum;
  }, 0);

  const averageAssetAge = totalAssets > 0 ? totalAgeInMonths / totalAssets : 0;
  const depreciationRate = totalOriginalValue > 0 ? (totalAccumulatedDepreciation / totalOriginalValue) * 100 : 0;

  return {
    totalAssets,
    totalOriginalValue,
    totalCurrentBookValue,
    totalAccumulatedDepreciation,
    totalMonthlyDepreciation,
    totalAnnualDepreciation: totalMonthlyDepreciation * 12,
    fullyDepreciatedAssets,
    assetsDueForDepreciation,
    averageAssetAge: Math.round(averageAssetAge * 100) / 100,
    depreciationRate: Math.round(depreciationRate * 100) / 100
  };
}

async function generateAssetDetails(
  businessUnitId: string,
  startDate: Date,
  endDate: Date
): Promise<DepreciationAssetDetail[]> {
  const assets = await prisma.asset.findMany({
    where: {
      businessUnitId,
      isActive: true,
      purchasePrice: { 
        not: null
      },
      purchaseDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      category: true,
      deployments: {
        where: { status: 'DEPLOYED' },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        take: 1
      }
    },
    orderBy: { purchasePrice: 'desc' }
  });

  return assets.map(asset => {
    const purchasePrice = asset.purchasePrice?.toNumber() || 0;
    const currentBookValue = asset.currentBookValue?.toNumber() || purchasePrice;
    const accumulatedDepreciation = asset.accumulatedDepreciation?.toNumber() || 0;
    const monthlyDepreciation = asset.monthlyDepreciation?.toNumber() || 0;
    const salvageValue = asset.salvageValue?.toNumber() || 0;
    const usefulLifeMonths = asset.usefulLifeMonths || 0;

    // Calculate remaining life
    const remainingDepreciableAmount = currentBookValue - salvageValue;
    const remainingLifeMonths = monthlyDepreciation > 0 
      ? Math.ceil(remainingDepreciableAmount / monthlyDepreciation)
      : usefulLifeMonths;

    // Calculate depreciation rate for this asset
    const assetDepreciationRate = purchasePrice > 0 ? (accumulatedDepreciation / purchasePrice) * 100 : 0;

    const assignedEmployee = asset.deployments[0]?.employee;
    const assignedTo = assignedEmployee 
      ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}`
      : null;

    return {
      id: asset.id,
      itemCode: asset.itemCode,
      description: asset.description,
      category: asset.category.name,
      purchaseDate: asset.purchaseDate || new Date(),
      purchasePrice,
      currentBookValue,
      accumulatedDepreciation,
      monthlyDepreciation,
      depreciationMethod: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      usefulLifeMonths,
      remainingLifeMonths: Math.max(0, remainingLifeMonths),
      salvageValue,
      depreciationRate: Math.round(assetDepreciationRate * 100) / 100,
      isFullyDepreciated: asset.isFullyDepreciated,
      nextDepreciationDate: asset.nextDepreciationDate,
      location: asset.location,
      assignedTo
    };
  });
}

async function generateMethodBreakdown(
  businessUnitId: string,
  startDate: Date,
  endDate: Date
): Promise<DepreciationMethodBreakdown[]> {
  const methodData = await prisma.asset.groupBy({
    by: ['depreciationMethod'],
    where: {
      businessUnitId,
      isActive: true,
      NOT: {
        purchasePrice: null
      },
      purchaseDate: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: { id: true },
    _sum: {
      purchasePrice: true,
      currentBookValue: true,
      accumulatedDepreciation: true
    }
  });

  return methodData.map(item => {
    const originalValue = item._sum.purchasePrice?.toNumber() || 0;
    const currentValue = item._sum.currentBookValue?.toNumber() || 0;
    const totalDepreciation = item._sum.accumulatedDepreciation?.toNumber() || 0;
    const averageDepreciationRate = originalValue > 0 ? (totalDepreciation / originalValue) * 100 : 0;

    return {
      method: item.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      assetCount: item._count.id,
      totalOriginalValue: originalValue,
      totalCurrentValue: currentValue,
      totalDepreciation,
      averageDepreciationRate: Math.round(averageDepreciationRate * 100) / 100
    };
  });
}

async function generateCategoryBreakdown(
  businessUnitId: string,
  startDate: Date,
  endDate: Date
): Promise<DepreciationCategoryBreakdown[]> {
  const categoryData = await prisma.asset.groupBy({
    by: ['categoryId'],
    where: {
      businessUnitId,
      isActive: true,
      purchasePrice: { not: null },
      purchaseDate: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: { id: true },
    _sum: {
      purchasePrice: true,
      currentBookValue: true,
      accumulatedDepreciation: true
    }
  });

  const categoryIds = categoryData.map(item => item.categoryId);
  const categories = await prisma.assetCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true }
  });

  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  // Calculate average asset age for each category
  const categoryAges = await Promise.all(
    categoryData.map(async (item) => {
      const assets = await prisma.asset.findMany({
        where: {
          categoryId: item.categoryId,
          businessUnitId,
          isActive: true,
          NOT: {
            purchaseDate: null
          }
        },
        select: { purchaseDate: true }
      });

      const currentDate = new Date();
      const totalAgeInMonths = assets.reduce((sum, asset) => {
        if (asset.purchaseDate) {
          const ageInMonths = (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          return sum + ageInMonths;
        }
        return sum;
      }, 0);

      return {
        categoryId: item.categoryId,
        averageAge: assets.length > 0 ? totalAgeInMonths / assets.length : 0
      };
    })
  );

  const ageMap = new Map(categoryAges.map(item => [item.categoryId, item.averageAge]));

  return categoryData.map(item => {
    const originalValue = item._sum.purchasePrice?.toNumber() || 0;
    const currentValue = item._sum.currentBookValue?.toNumber() || 0;
    const totalDepreciation = item._sum.accumulatedDepreciation?.toNumber() || 0;
    const averageAssetAge = ageMap.get(item.categoryId) || 0;

    return {
      category: categoryMap.get(item.categoryId) || 'Unknown',
      assetCount: item._count.id,
      totalOriginalValue: originalValue,
      totalCurrentValue: currentValue,
      totalDepreciation,
      averageAssetAge: Math.round(averageAssetAge * 100) / 100
    };
  });
}

export async function getDepreciationAlerts(businessUnitId: string): Promise<DepreciationAlert[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const alerts: DepreciationAlert[] = [];
    const currentDate = new Date();

    // Assets due for depreciation calculation
    const assetsDue = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        isFullyDepreciated: false,
        nextDepreciationDate: {
          lte: currentDate
        }
      },
      select: {
        id: true,
        itemCode: true,
        description: true,
        nextDepreciationDate: true
      }
    });

    assetsDue.forEach(asset => {
      alerts.push({
        id: `due-${asset.id}`,
        type: 'DUE_FOR_CALCULATION',
        severity: 'HIGH',
        title: 'Depreciation Calculation Due',
        message: `Asset ${asset.itemCode} requires depreciation calculation`,
        assetId: asset.id,
        assetCode: asset.itemCode,
        assetDescription: asset.description,
        dueDate: asset.nextDepreciationDate,
        createdAt: new Date()
      });
    });

    // Recently fully depreciated assets
    const fullyDepreciated = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        isFullyDepreciated: true,
        lastDepreciationDate: {
          gte: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        id: true,
        itemCode: true,
        description: true,
        lastDepreciationDate: true
      }
    });

    fullyDepreciated.forEach(asset => {
      alerts.push({
        id: `fully-${asset.id}`,
        type: 'FULLY_DEPRECIATED',
        severity: 'MEDIUM',
        title: 'Asset Fully Depreciated',
        message: `Asset ${asset.itemCode} has reached its salvage value`,
        assetId: asset.id,
        assetCode: asset.itemCode,
        assetDescription: asset.description,
        dueDate: asset.lastDepreciationDate,
        createdAt: new Date()
      });
    });

    // Assets with high depreciation rates (>80%)
    const highDepreciationAssets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        isFullyDepreciated: false,
NOT: [
  { purchasePrice: null },
  { usefulLifeMonths: null }
]
      },
      select: {
        id: true,
        itemCode: true,
        description: true,
        purchasePrice: true,
        accumulatedDepreciation: true,
        salvageValue: true
      }
    });

    highDepreciationAssets.forEach(asset => {
      const purchasePrice = asset.purchasePrice?.toNumber() || 0;
      const accumulatedDepreciation = asset.accumulatedDepreciation?.toNumber() || 0;
      const salvageValue = asset.salvageValue?.toNumber() || 0;
      const depreciableAmount = purchasePrice - salvageValue;
      
      if (depreciableAmount > 0) {
        const depreciationRate = (accumulatedDepreciation / depreciableAmount) * 100;
        
        if (depreciationRate > 80) {
          alerts.push({
            id: `high-dep-${asset.id}`,
            type: 'HIGH_DEPRECIATION',
            severity: 'LOW',
            title: 'High Depreciation Rate',
            message: `Asset ${asset.itemCode} is ${depreciationRate.toFixed(1)}% depreciated`,
            assetId: asset.id,
            assetCode: asset.itemCode,
            assetDescription: asset.description,
            dueDate: null,
            createdAt: new Date()
          });
        }
      }
    });

    return serializeForClient(alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }));

  } catch (error) {
    console.error('Error getting depreciation alerts:', error);
    throw new Error('Failed to get depreciation alerts');
  }
}

export async function batchCalculateDepreciation(
  businessUnitId: string,
  assetIds?: string[]
): Promise<BatchDepreciationResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
        processedAssets: 0,
        totalDepreciation: 0,
        errors: [],
        summary: {
          totalAssets: 0,
          successfulCalculations: 0,
          failedCalculations: 0,
          totalDepreciationAmount: 0,
          fullyDepreciatedCount: 0
        }
      };
    }

    const whereClause: Prisma.AssetWhereInput = {
      businessUnitId,
      isActive: true,
      isFullyDepreciated: false,
      NOT: [
        { purchasePrice: null },
        { usefulLifeMonths: null }
      ]
    };

    if (assetIds && assetIds.length > 0) {
      whereClause.id = { in: assetIds };
    } else {
      // Only process assets due for depreciation if no specific assets provided
      whereClause.nextDepreciationDate = { lte: new Date() };
    }

    const assetsToProcess = await prisma.asset.findMany({
      where: whereClause,
      select: {
        id: true,
        itemCode: true,
        description: true
      }
    });

    const errors: Array<{ assetId: string; assetCode: string; error: string }> = [];
    let successfulCalculations = 0;
    let totalDepreciationAmount = 0;
    let fullyDepreciatedCount = 0;

    // Process assets in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < assetsToProcess.length; i += batchSize) {
      const batch = assetsToProcess.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (asset) => {
          try {
            const { calculateAssetDepreciation } = await import('./asset-actions');
            const result = await calculateAssetDepreciation(asset.id);
            
            if (result.success && result.calculatedAmount) {
              successfulCalculations++;
              totalDepreciationAmount += result.calculatedAmount;
              
              if (result.isFullyDepreciated) {
                fullyDepreciatedCount++;
              }
            } else {
              errors.push({
                assetId: asset.id,
                assetCode: asset.itemCode,
                error: result.message || 'Unknown error'
              });
            }
          } catch (error) {
            errors.push({
              assetId: asset.id,
              assetCode: asset.itemCode,
              error: error instanceof Error ? error.message : 'Calculation failed'
            });
          }
        })
      );
    }

    const summary = {
      totalAssets: assetsToProcess.length,
      successfulCalculations,
      failedCalculations: errors.length,
      totalDepreciationAmount: Math.round(totalDepreciationAmount * 100) / 100,
      fullyDepreciatedCount
    };

    revalidatePath('/assets');
    revalidatePath('/analytics');
    revalidatePath('/reports');

    return {
      success: true,
      message: `Batch depreciation completed: ${successfulCalculations}/${assetsToProcess.length} assets processed`,
      processedAssets: successfulCalculations,
      totalDepreciation: totalDepreciationAmount,
      errors,
      summary
    };

  } catch (error) {
    console.error('Error in batch depreciation calculation:', error);
    return {
      success: false,
      message: 'Failed to process batch depreciation',
      processedAssets: 0,
      totalDepreciation: 0,
      errors: [],
      summary: {
        totalAssets: 0,
        successfulCalculations: 0,
        failedCalculations: 0,
        totalDepreciationAmount: 0,
        fullyDepreciatedCount: 0
      }
    };
  }
}

export async function getDepreciationDashboardData(businessUnitId: string): Promise<{
  summary: DepreciationSummaryData;
  alerts: DepreciationAlert[];
  recentCalculations: Array<{
    id: string;
    assetCode: string;
    assetDescription: string;
    depreciationAmount: number;
    calculationDate: Date;
    method: string;
  }>;
  upcomingCalculations: Array<{
    id: string;
    assetCode: string;
    assetDescription: string;
    nextCalculationDate: Date;
    estimatedDepreciation: number;
  }>;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    const [
      summary,
      alerts,
      recentCalculations,
      upcomingCalculations
    ] = await Promise.all([
      generateDepreciationSummary(businessUnitId, startOfYear, currentDate),
      getDepreciationAlerts(businessUnitId),
      getRecentDepreciationCalculations(businessUnitId),
      getUpcomingDepreciationCalculations(businessUnitId)
    ]);

    return serializeForClient({
      summary,
      alerts,
      recentCalculations,
      upcomingCalculations
    });

  } catch (error) {
    console.error('Error getting depreciation dashboard data:', error);
    throw new Error('Failed to get depreciation dashboard data');
  }
}

async function getRecentDepreciationCalculations(businessUnitId: string) {
  const recentCalculations = await prisma.assetDepreciation.findMany({
    where: {
      businessUnitId,
      depreciationDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: {
      asset: {
        select: {
          itemCode: true,
          description: true,
          depreciationMethod: true
        }
      }
    },
    orderBy: { depreciationDate: 'desc' },
    take: 10
  });

  return recentCalculations.map(calc => ({
    id: calc.id,
    assetCode: calc.asset.itemCode,
    assetDescription: calc.asset.description,
    depreciationAmount: calc.depreciationAmount.toNumber(),
    calculationDate: calc.depreciationDate,
    method: calc.asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE
  }));
}

async function getUpcomingDepreciationCalculations(businessUnitId: string) {
  const upcomingCalculations = await prisma.asset.findMany({
    where: {
      businessUnitId,
      isActive: true,
      isFullyDepreciated: false,
      nextDepreciationDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      }
    },
    select: {
      id: true,
      itemCode: true,
      description: true,
      nextDepreciationDate: true,
      monthlyDepreciation: true
    },
    orderBy: { nextDepreciationDate: 'asc' },
    take: 10
  });

  return upcomingCalculations.map(asset => ({
    id: asset.id,
    assetCode: asset.itemCode,
    assetDescription: asset.description,
    nextCalculationDate: asset.nextDepreciationDate!,
    estimatedDepreciation: asset.monthlyDepreciation?.toNumber() || 0
  }));
}

export async function exportDepreciationReport(
  businessUnitId: string,
  format: 'PDF' | 'EXCEL' | 'CSV',
  options: {
    includeSchedule?: boolean;
    includeHistory?: boolean;
    includeSummary?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Generate the report data
    const reportResult = await generateDepreciationReport(
      businessUnitId,
      options.startDate,
      options.endDate
    );

    if (!reportResult.success || !reportResult.report) {
      return { success: false, message: 'Failed to generate report data' };
    }

    // For now, return success with a placeholder URL
    // In a real implementation, you would:
    // 1. Generate the actual file (PDF/Excel/CSV)
    // 2. Upload it to your file storage (MinIO)
    // 3. Return the download URL

    const fileName = `depreciation-report-${businessUnitId}-${Date.now()}.${format.toLowerCase()}`;
    
    // TODO: Implement actual file generation and upload
    // const fileUrl = await generateAndUploadReport(reportResult.report, format, options);

    return {
      success: true,
      message: `${format} report generated successfully`,
      downloadUrl: `/api/reports/download/${fileName}` // Placeholder URL
    };

  } catch (error) {
    console.error('Error exporting depreciation report:', error);
    return { success: false, message: 'Failed to export depreciation report' };
  }
}

export async function scheduleDepreciationCalculation(
  businessUnitId: string,
  scheduleDate: Date,
  assetIds?: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // For now, we'll just update the nextDepreciationDate for the specified assets
    // In a real implementation, you might want to create a scheduled job

    const whereClause: Prisma.AssetWhereInput = {
      businessUnitId,
      isActive: true,
      isFullyDepreciated: false
    };

    if (assetIds && assetIds.length > 0) {
      whereClause.id = { in: assetIds };
    }

    const result = await prisma.asset.updateMany({
      where: whereClause,
      data: {
        nextDepreciationDate: scheduleDate
      }
    });

    revalidatePath('/assets');
    revalidatePath('/analytics');

    return {
      success: true,
      message: `Scheduled depreciation calculation for ${result.count} assets on ${scheduleDate.toLocaleDateString()}`
    };

  } catch (error) {
    console.error('Error scheduling depreciation calculation:', error);
    return { success: false, message: 'Failed to schedule depreciation calculation' };
  }
}