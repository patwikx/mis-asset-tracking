// lib/actions/analytics-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type { AnalyticsData } from '@/types/report-types';

export async function getAnalyticsData(businessUnitId: string): Promise<AnalyticsData> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get date range for trends (last 12 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const [
      assetTrends,
      deploymentTrends,
      categoryDistribution,
      utilizationData
    ] = await Promise.all([
      getAssetTrends(businessUnitId, startDate, endDate),
      getDeploymentTrends(businessUnitId, startDate, endDate),
      getCategoryDistribution(businessUnitId),
      getUtilizationRate(businessUnitId)
    ]);

    return serializeForClient({
      assetTrends,
      deploymentTrends,
      categoryDistribution,
      utilizationRate: utilizationData
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    throw new Error('Failed to fetch analytics data');
  }
}

async function getAssetTrends(businessUnitId: string, startDate: Date, endDate: Date) {
  // Generate monthly data points
  const trends = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const [totalAssets, deployedAssets] = await Promise.all([
      prisma.asset.count({
        where: {
          businessUnitId,
          isActive: true,
          createdAt: { lte: monthEnd }
        }
      }),
      prisma.assetDeployment.count({
        where: {
          businessUnitId,
          status: 'DEPLOYED',
          deployedDate: { 
            gte: monthStart,
            lte: monthEnd 
          }
        }
      })
    ]);

    trends.push({
      date: monthStart.toISOString().slice(0, 7), // YYYY-MM format
      totalAssets,
      deployedAssets,
      availableAssets: totalAssets - deployedAssets
    });

    current.setMonth(current.getMonth() + 1);
  }

  return trends;
}

async function getDeploymentTrends(businessUnitId: string, startDate: Date, endDate: Date) {
  const trends = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const [newDeployments, returns] = await Promise.all([
      prisma.assetDeployment.count({
        where: {
          businessUnitId,
          deployedDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      }),
      prisma.assetDeployment.count({
        where: {
          businessUnitId,
          returnedDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
    ]);

    trends.push({
      date: monthStart.toISOString().slice(0, 7),
      newDeployments,
      returns
    });

    current.setMonth(current.getMonth() + 1);
  }

  return trends;
}

async function getCategoryDistribution(businessUnitId: string) {
  const categoryData = await prisma.asset.groupBy({
    by: ['categoryId'],
    where: { businessUnitId, isActive: true },
    _count: { id: true }
  });

  const totalAssets = categoryData.reduce((sum, item) => sum + item._count.id, 0);

  const categories = await prisma.assetCategory.findMany({
    where: {
      id: { in: categoryData.map(item => item.categoryId) }
    },
    select: { id: true, name: true }
  });

  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  return categoryData.map(item => ({
    category: categoryMap.get(item.categoryId) || 'Unknown',
    count: item._count.id,
    percentage: totalAssets > 0 ? (item._count.id / totalAssets) * 100 : 0
  }));
}

async function getUtilizationRate(businessUnitId: string) {
  const statusCounts = await prisma.asset.groupBy({
    by: ['status'],
    where: { businessUnitId, isActive: true },
    _count: { id: true }
  });

  const deployedCount = await prisma.assetDeployment.count({
    where: {
      businessUnitId,
      status: 'DEPLOYED'
    }
  });

  const statusMap = new Map(statusCounts.map(item => [item.status, item._count.id]));

  return {
    deployed: deployedCount,
    available: statusMap.get('AVAILABLE') || 0,
    maintenance: statusMap.get('IN_MAINTENANCE') || 0,
    retired: statusMap.get('RETIRED') || 0
  };
}