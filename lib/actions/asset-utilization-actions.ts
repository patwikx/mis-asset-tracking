// lib/actions/asset-utilization-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus } from '@prisma/client';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AssetUtilizationFilters,
  DeploymentRateAnalysis,
  IdleAssetAnalysis,
  CostCenterAllocation,
  ROICalculation,
  AssetUtilizationSummary,
  UtilizationTrendData,
  AssetPerformanceMetrics,
  UtilizationReportFilters
} from '@/types/asset-utilization-types';

// Helper function to calculate date ranges
function getDateRange(period: 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_YEAR' | 'CUSTOM', customStart?: Date, customEnd?: Date) {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (period) {
    case 'LAST_30_DAYS':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'LAST_90_DAYS':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'LAST_YEAR':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'CUSTOM':
      startDate = customStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = customEnd || now;
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

// Get deployment rate analysis
export async function getDeploymentRateAnalysis(
  businessUnitId: string,
  filters: AssetUtilizationFilters = {}
): Promise<DeploymentRateAnalysis> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { dateFrom, dateTo, categoryId } = filters;
    const dateRange = getDateRange('LAST_90_DAYS', dateFrom, dateTo);

    // Get total assets
    const totalAssets = await prisma.asset.count({
      where: {
        businessUnitId,
        isActive: true,
        status: { not: AssetStatus.DISPOSED },
        ...(categoryId && { categoryId })
      }
    });

    // Get currently deployed assets
    const deployedAssets = await prisma.asset.count({
      where: {
        businessUnitId,
        isActive: true,
        status: AssetStatus.DEPLOYED,
        ...(categoryId && { categoryId })
      }
    });

    const availableAssets = totalAssets - deployedAssets;
    const deploymentRate = totalAssets > 0 ? (deployedAssets / totalAssets) * 100 : 0; 
   // Get average deployment duration
    const deploymentDurations = await prisma.assetDeployment.findMany({
      where: {
        businessUnitId,
        deployedDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        },
        returnedDate: { not: null }
      },
      select: {
        deployedDate: true,
        returnedDate: true
      }
    });

    const averageDeploymentDuration = deploymentDurations.length > 0
      ? deploymentDurations.reduce((sum, deployment) => {
          if (deployment.deployedDate && deployment.returnedDate) {
            const duration = (deployment.returnedDate.getTime() - deployment.deployedDate.getTime()) / (1000 * 60 * 60 * 24);
            return sum + duration;
          }
          return sum;
        }, 0) / deploymentDurations.length
      : 0;

    // Get deployment trends (monthly)
    const deploymentTrends: Array<{ period: string; deploymentCount: number; deploymentRate: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth() - i, 1);
      const monthEnd = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth() - i + 1, 0);
      
      const monthlyDeployments = await prisma.assetDeployment.count({
        where: {
          businessUnitId,
          deployedDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const monthlyTotalAssets = await prisma.asset.count({
        where: {
          businessUnitId,
          isActive: true,
          createdAt: { lte: monthEnd }
        }
      });

      deploymentTrends.push({
        period: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        deploymentCount: monthlyDeployments,
        deploymentRate: monthlyTotalAssets > 0 ? (monthlyDeployments / monthlyTotalAssets) * 100 : 0
      });
    }

    // Get category breakdown
    const categories = await prisma.assetCategory.findMany({
      include: {
        assets: {
          where: {
            businessUnitId,
            isActive: true,
            status: { not: AssetStatus.DISPOSED }
          }
        }
      }
    });

    const categoryBreakdown = categories.map(category => {
      const categoryTotalAssets = category.assets.length;
      const categoryDeployedAssets = category.assets.filter(asset => asset.status === AssetStatus.DEPLOYED).length;
      
      return {
        categoryId: category.id,
        categoryName: category.name,
        totalAssets: categoryTotalAssets,
        deployedAssets: categoryDeployedAssets,
        deploymentRate: categoryTotalAssets > 0 ? (categoryDeployedAssets / categoryTotalAssets) * 100 : 0
      };
    });

    return serializeForClient({
      totalAssets,
      deployedAssets,
      availableAssets,
      deploymentRate,
      averageDeploymentDuration,
      deploymentTrends,
      categoryBreakdown
    });

  } catch (error) {
    console.error('Error getting deployment rate analysis:', error);
    throw new Error('Failed to get deployment rate analysis');
  }
}


// Get idle asset analysis
export async function getIdleAssetAnalysis(
  businessUnitId: string,
  filters: AssetUtilizationFilters = {}
): Promise<IdleAssetAnalysis> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { dateFrom, dateTo, categoryId } = filters;
    const dateRange = getDateRange('LAST_90_DAYS', dateFrom, dateTo);
    const idleThresholdDays = 30; // Assets idle for more than 30 days

    // Get assets that are available (not deployed)
    const availableAssets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: AssetStatus.AVAILABLE,
        ...(categoryId && { categoryId })
      },
      include: {
        category: true,
        deployments: {
          orderBy: { returnedDate: 'desc' },
          take: 1
        }
      }
    });

    const currentDate = new Date();
    const idleAssets = availableAssets.map(asset => {
      const lastDeployment = asset.deployments[0];
      const lastDeploymentDate = lastDeployment?.returnedDate;
      const daysSinceLastDeployment = lastDeploymentDate 
        ? Math.floor((currentDate.getTime() - lastDeploymentDate.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((currentDate.getTime() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Determine idle reason
      let idleReason: 'NEVER_DEPLOYED' | 'RETURNED_NOT_REDEPLOYED' | 'MAINTENANCE_OVERDUE' | 'DAMAGED' | 'OBSOLETE';
      let recommendedAction: 'REDEPLOY' | 'MAINTENANCE' | 'RETIRE' | 'DISPOSE';

      if (!lastDeployment) {
        idleReason = 'NEVER_DEPLOYED';
        recommendedAction = daysSinceLastDeployment > 365 ? 'RETIRE' : 'REDEPLOY';
      } else if (asset.status === AssetStatus.DAMAGED) {
        idleReason = 'DAMAGED';
        recommendedAction = 'MAINTENANCE';
      } else if (daysSinceLastDeployment > 365) {
        idleReason = 'OBSOLETE';
        recommendedAction = 'RETIRE';
      } else if (daysSinceLastDeployment > 90) {
        idleReason = 'MAINTENANCE_OVERDUE';
        recommendedAction = 'MAINTENANCE';
      } else {
        idleReason = 'RETURNED_NOT_REDEPLOYED';
        recommendedAction = 'REDEPLOY';
      }

      return {
        id: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        currentBookValue: asset.currentBookValue?.toNumber() || 0,
        lastDeploymentDate: lastDeploymentDate || undefined,
        daysSinceLastDeployment,
        location: asset.location || undefined,
        idleReason,
        recommendedAction
      };
    }).filter(asset => asset.daysSinceLastDeployment > idleThresholdDays);

    const totalIdleAssets = idleAssets.length;
    const idleAssetValue = idleAssets.reduce((sum, asset) => sum + asset.currentBookValue, 0);

    // Group by category
    const idleByCategory = idleAssets.reduce((acc, asset) => {
      const existing = acc.find(item => item.categoryName === asset.category);
      if (existing) {
        existing.idleCount++;
        existing.idleValue += asset.currentBookValue;
      } else {
        acc.push({
          categoryName: asset.category,
          idleCount: 1,
          idleValue: asset.currentBookValue,
          idlePercentage: 0 // Will calculate after
        });
      }
      return acc;
    }, [] as Array<{ categoryName: string; idleCount: number; idleValue: number; idlePercentage: number }>);

    // Calculate percentages
    idleByCategory.forEach(category => {
      category.idlePercentage = totalIdleAssets > 0 ? (category.idleCount / totalIdleAssets) * 100 : 0;
    });

    // Get idle trends (monthly for last 6 months)
    const idleTrends: Array<{ period: string; idleCount: number; idleValue: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      // This is a simplified calculation - in a real scenario, you'd want to track historical idle states
      const monthlyIdleCount = Math.floor(totalIdleAssets * (0.8 + Math.random() * 0.4)); // Simulated data
      const monthlyIdleValue = Math.floor(idleAssetValue * (0.8 + Math.random() * 0.4)); // Simulated data
      
      idleTrends.push({
        period: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        idleCount: monthlyIdleCount,
        idleValue: monthlyIdleValue
      });
    }

    return serializeForClient({
      totalIdleAssets,
      idleAssetValue,
      idleAssets,
      idleByCategory,
      idleTrends
    });

  } catch (error) {
    console.error('Error getting idle asset analysis:', error);
    throw new Error('Failed to get idle asset analysis');
  }

  }

// Get cost center allocations
export async function getCostCenterAllocations(
  businessUnitId: string,
  filters: AssetUtilizationFilters = {}
): Promise<CostCenterAllocation[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get departments as cost centers
    const departments = await prisma.department.findMany({
      where: { businessUnitId },
      include: {
        employees: {
          include: {
            deployments: {
              where: {
                status: 'DEPLOYED',
                returnedDate: null
              },
              include: {
                asset: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const costCenterAllocations: CostCenterAllocation[] = [];

    for (const department of departments) {
      // Get all assets deployed to employees in this department
      const deployedAssets = department.employees.flatMap(employee => 
        employee.deployments.map(deployment => deployment.asset)
      );

      const totalAssets = deployedAssets.length;
      const totalAssetValue = deployedAssets.reduce((sum, asset) => 
        sum + (asset.currentBookValue?.toNumber() || 0), 0
      );

      const deployedAssetValue = totalAssetValue; // All assets in this query are deployed
      const utilizationRate = 100; // All assets are currently deployed

      // Calculate monthly depreciation for allocated assets
      const monthlyDepreciation = deployedAssets.reduce((sum, asset) => {
        if (asset.depreciationMethod && asset.usefulLifeYears) {
          const originalValue = asset.purchasePrice?.toNumber() || 0;
          const monthlyDep = originalValue / (asset.usefulLifeYears * 12);
          return sum + monthlyDep;
        }
        return sum;
      }, 0);

      // Group assets by category
      const assetsByCategory = deployedAssets.reduce((acc, asset) => {
        const existing = acc.find(item => item.categoryName === asset.category.name);
        if (existing) {
          existing.assetCount++;
          existing.assetValue += asset.currentBookValue?.toNumber() || 0;
        } else {
          acc.push({
            categoryName: asset.category.name,
            assetCount: 1,
            assetValue: asset.currentBookValue?.toNumber() || 0
          });
        }
        return acc;
      }, [] as Array<{ categoryName: string; assetCount: number; assetValue: number }>);

      // Calculate allocated costs (simplified model)
      const allocatedCosts = {
        assetValue: totalAssetValue,
        depreciationCost: monthlyDepreciation,
        maintenanceCost: totalAssetValue * 0.02, // 2% of asset value annually / 12
        deploymentCost: totalAssets * 50, // $50 per asset deployment cost
        totalCost: 0
      };
      allocatedCosts.totalCost = allocatedCosts.depreciationCost + allocatedCosts.maintenanceCost + allocatedCosts.deploymentCost;

      costCenterAllocations.push({
        costCenterId: department.id,
        costCenterName: department.name,
        totalAssets,
        totalAssetValue,
        deployedAssets: totalAssets,
        deployedAssetValue,
        utilizationRate,
        monthlyDepreciation,
        allocatedCosts,
        assetsByCategory
      });
    }

    return serializeForClient(costCenterAllocations);

  } catch (error) {
    console.error('Error getting cost center allocations:', error);
    throw new Error('Failed to get cost center allocations');
  }
}


// Get ROI calculations for assets
export async function getAssetROICalculations(
  businessUnitId: string,
  filters: AssetUtilizationFilters = {}
): Promise<ROICalculation[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { categoryId } = filters;

    // Get assets with their deployment history
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        status: { not: AssetStatus.DISPOSED },
        purchasePrice: { not: null },
        ...(categoryId && { categoryId })
      },
      include: {
        category: true,
        deployments: {
          where: {
            deployedDate: { not: null }
          }
        }
      }
    });

    const roiCalculations: ROICalculation[] = [];
    const currentDate = new Date();

    for (const asset of assets) {
      const purchasePrice = asset.purchasePrice?.toNumber() || 0;
      const currentBookValue = asset.currentBookValue?.toNumber() || 0;
      const totalDepreciation = purchasePrice - currentBookValue;

      // Calculate deployment metrics
      const totalDeployments = asset.deployments.length;
      let totalDeploymentDays = 0;

      asset.deployments.forEach(deployment => {
        if (deployment.deployedDate) {
          const endDate = deployment.returnedDate || currentDate;
          const deploymentDays = Math.floor((endDate.getTime() - deployment.deployedDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDeploymentDays += deploymentDays;
        }
      });

      const averageDeploymentDuration = totalDeployments > 0 ? totalDeploymentDays / totalDeployments : 0;
      
      // Calculate utilization rate (percentage of time asset has been deployed since purchase)
      const assetAge = Math.floor((currentDate.getTime() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const utilizationRate = assetAge > 0 ? (totalDeploymentDays / assetAge) * 100 : 0;

      // Calculate financial metrics
      const costPerDeploymentDay = totalDeploymentDays > 0 ? purchasePrice / totalDeploymentDays : purchasePrice;
      const valueUtilized = (utilizationRate / 100) * purchasePrice;
      const remainingValue = currentBookValue;
      
      // ROI calculation: (Value Generated - Investment) / Investment * 100
      // Simplified: assume value generated is proportional to utilization
      const valueGenerated = valueUtilized * 1.2; // Assume 20% value multiplier for deployment
      const roi = purchasePrice > 0 ? ((valueGenerated - purchasePrice) / purchasePrice) * 100 : 0;

      // Payback period (days to break even)
      const dailyValue = purchasePrice / (asset.usefulLifeYears || 5) / 365;
      const paybackPeriod = dailyValue > 0 ? purchasePrice / dailyValue : undefined;

      // Performance rating
      let performanceRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      if (utilizationRate >= 80 && roi >= 20) {
        performanceRating = 'EXCELLENT';
      } else if (utilizationRate >= 60 && roi >= 10) {
        performanceRating = 'GOOD';
      } else if (utilizationRate >= 40 && roi >= 0) {
        performanceRating = 'FAIR';
      } else {
        performanceRating = 'POOR';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (utilizationRate < 50) {
        recommendations.push('Increase deployment frequency to improve utilization');
      }
      if (roi < 0) {
        recommendations.push('Consider retirement or disposal to reduce carrying costs');
      }
      if (totalDeployments === 0) {
        recommendations.push('Asset has never been deployed - evaluate necessity');
      }
      if (utilizationRate > 90) {
        recommendations.push('High utilization - consider acquiring similar assets');
      }

      roiCalculations.push({
        assetId: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        purchasePrice,
        currentBookValue,
        totalDepreciation,
        deploymentHistory: {
          totalDeployments,
          totalDeploymentDays,
          averageDeploymentDuration,
          utilizationRate
        },
        financialMetrics: {
          costPerDeploymentDay,
          valueUtilized,
          remainingValue,
          roi,
          paybackPeriod
        },
        performanceRating,
        recommendations
      });
    }

    // Sort by ROI descending
    roiCalculations.sort((a, b) => b.financialMetrics.roi - a.financialMetrics.roi);

    return serializeForClient(roiCalculations);

  } catch (error) {
    console.error('Error calculating asset ROI:', error);
    throw new Error('Failed to calculate asset ROI');
  }
}


// Get comprehensive asset utilization summary
export async function getAssetUtilizationSummary(
  businessUnitId: string,
  filters: UtilizationReportFilters
): Promise<AssetUtilizationSummary> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { dateRange } = filters;

    // Get all the component analyses
    const [deploymentRateAnalysis, idleAssetAnalysis, costCenterAllocations, roiCalculations] = await Promise.all([
      getDeploymentRateAnalysis(businessUnitId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }),
      getIdleAssetAnalysis(businessUnitId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }),
      getCostCenterAllocations(businessUnitId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }),
      getAssetROICalculations(businessUnitId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate })
    ]);

    // Calculate overall metrics
    const totalAssets = deploymentRateAnalysis.totalAssets;
    const totalAssetValue = roiCalculations.reduce((sum, roi) => sum + roi.purchasePrice, 0);
    const averageUtilizationRate = roiCalculations.length > 0 
      ? roiCalculations.reduce((sum, roi) => sum + roi.deploymentHistory.utilizationRate, 0) / roiCalculations.length 
      : 0;
    const totalIdleAssets = idleAssetAnalysis.totalIdleAssets;
    const totalIdleValue = idleAssetAnalysis.idleAssetValue;
    const averageROI = roiCalculations.length > 0 
      ? roiCalculations.reduce((sum, roi) => sum + roi.financialMetrics.roi, 0) / roiCalculations.length 
      : 0;

    // Get top performing and underperforming assets
    const topPerformingAssets = roiCalculations
      .filter(roi => roi.performanceRating === 'EXCELLENT' || roi.performanceRating === 'GOOD')
      .slice(0, 10);
    
    const underperformingAssets = roiCalculations
      .filter(roi => roi.performanceRating === 'POOR' || roi.performanceRating === 'FAIR')
      .slice(-10);

    // Generate recommendations
    const recommendations = [];

    if (averageUtilizationRate < 60) {
      recommendations.push({
        category: 'DEPLOYMENT' as const,
        priority: 'HIGH' as const,
        description: 'Low asset utilization detected across the organization',
        estimatedImpact: `Improving utilization to 75% could increase asset value realization by ${((75 - averageUtilizationRate) / 100 * totalAssetValue).toLocaleString()}`,
        actionItems: [
          'Review deployment processes and bottlenecks',
          'Implement proactive asset assignment workflows',
          'Consider asset redistribution between departments'
        ]
      });
    }

    if (totalIdleAssets > totalAssets * 0.2) {
      recommendations.push({
        category: 'MAINTENANCE' as const,
        priority: 'MEDIUM' as const,
        description: 'High number of idle assets identified',
        estimatedImpact: `Redeploying ${Math.floor(totalIdleAssets * 0.5)} idle assets could save ${(totalIdleValue * 0.1).toLocaleString()} in carrying costs`,
        actionItems: [
          'Audit idle assets for redeployment opportunities',
          'Implement regular asset rotation schedules',
          'Consider asset consolidation or disposal'
        ]
      });
    }

    if (averageROI < 10) {
      recommendations.push({
        category: 'RETIREMENT' as const,
        priority: 'HIGH' as const,
        description: 'Poor return on investment across asset portfolio',
        estimatedImpact: 'Retiring underperforming assets could reduce operational costs by 15-20%',
        actionItems: [
          'Evaluate assets with negative ROI for retirement',
          'Implement asset performance monitoring',
          'Review procurement strategies for future purchases'
        ]
      });
    }

    return serializeForClient({
      reportPeriod: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      overallMetrics: {
        totalAssets,
        totalAssetValue,
        averageUtilizationRate,
        totalIdleAssets,
        totalIdleValue,
        averageROI
      },
      deploymentRateAnalysis,
      idleAssetAnalysis,
      costCenterAllocations,
      topPerformingAssets,
      underperformingAssets,
      recommendations
    });

  } catch (error) {
    console.error('Error getting asset utilization summary:', error);
    throw new Error('Failed to get asset utilization summary');
  }
}



// Get utilization trend data for charts
export async function getUtilizationTrendData(
  businessUnitId: string,
  period: 'LAST_6_MONTHS' | 'LAST_YEAR' = 'LAST_6_MONTHS'
): Promise<UtilizationTrendData[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const currentDate = new Date();
    const months = period === 'LAST_YEAR' ? 12 : 6;
    const trendData: UtilizationTrendData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      // Get deployment rate for the month
      const monthlyDeployments = await prisma.assetDeployment.count({
        where: {
          businessUnitId,
          deployedDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const monthlyTotalAssets = await prisma.asset.count({
        where: {
          businessUnitId,
          isActive: true,
          createdAt: { lte: monthEnd }
        }
      });

      const deploymentRate = monthlyTotalAssets > 0 ? (monthlyDeployments / monthlyTotalAssets) * 100 : 0;

      // Simplified calculations for other metrics (in a real scenario, you'd want historical tracking)
      const utilizationRate = deploymentRate * 0.8; // Approximate utilization based on deployment rate
      const idleAssetCount = Math.floor(monthlyTotalAssets * (1 - deploymentRate / 100));
      const averageROI = 15 + Math.random() * 10; // Simulated ROI data

      trendData.push({
        period: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        deploymentRate,
        utilizationRate,
        idleAssetCount,
        averageROI
      });
    }

    return serializeForClient(trendData);

  } catch (error) {
    console.error('Error getting utilization trend data:', error);
    throw new Error('Failed to get utilization trend data');
  }
}
