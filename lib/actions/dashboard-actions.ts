// lib/actions/dashboard-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import type { DashboardData, DashboardStats, RecentDeployment, SystemAlert, AssetByCategoryChart, DeploymentTrendChart, TopAssetsChart } from '@/types/dashboard-types';
import { AssetStatus, DeploymentStatus } from '@prisma/client';

export async function getDashboardData(businessUnitId: string): Promise<DashboardData> {
  try {
    // Run all queries in parallel for better performance
    const [
      stats,
      recentDeployments,
      systemAlerts,
      assetsByCategory,
      deploymentTrends,
      topAssets
    ] = await Promise.all([
      getDashboardStats(businessUnitId),
      getRecentDeployments(businessUnitId),
      getSystemAlerts(businessUnitId),
      getAssetsByCategory(businessUnitId),
      getDeploymentTrends(businessUnitId),
      getTopAssets(businessUnitId)
    ]);

    return {
      stats,
      recentDeployments,
      systemAlerts,
      assetsByCategory,
      deploymentTrends,
      topAssets
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

async function getDashboardStats(businessUnitId: string): Promise<DashboardStats> {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get current stats
  const [
    totalAssets,
    activeEmployees,
    activeDeployments,
    pendingApprovals,
    maintenanceAlerts,
    reportsGenerated
  ] = await Promise.all([
    prisma.asset.count({
      where: { businessUnitId, isActive: true }
    }),
    
    prisma.employee.count({
      where: { businessUnitId, isActive: true }
    }),
    
    prisma.assetDeployment.count({
      where: { 
        businessUnitId, 
        status: DeploymentStatus.DEPLOYED,
        returnedDate: null
      }
    }),
    
    prisma.assetDeployment.count({
      where: { 
        businessUnitId, 
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
      }
    }),
    
    prisma.asset.count({
      where: { 
        businessUnitId, 
        status: AssetStatus.IN_MAINTENANCE,
        isActive: true
      }
    }),
    
    // Assuming you track reports in audit logs or another table
    prisma.auditLog.count({
      where: {
        tableName: 'reports',
        action: 'CREATE',
        timestamp: {
          gte: currentMonth
        }
      }
    })
  ]);

  // Get previous month stats for comparison
  const [
    prevTotalAssets,
    prevActiveEmployees,
    prevActiveDeployments,
    prevReportsGenerated
  ] = await Promise.all([
    prisma.asset.count({
      where: { 
        businessUnitId, 
        isActive: true,
        createdAt: { lt: currentMonth }
      }
    }),
    
    prisma.employee.count({
      where: { 
        businessUnitId, 
        isActive: true,
        createdAt: { lt: currentMonth }
      }
    }),
    
    prisma.assetDeployment.count({
      where: { 
        businessUnitId, 
        status: DeploymentStatus.DEPLOYED,
        deployedDate: {
          gte: lastMonth,
          lt: currentMonth
        }
      }
    }),
    
    prisma.auditLog.count({
      where: {
        tableName: 'reports',
        action: 'CREATE',
        timestamp: {
          gte: lastMonth,
          lt: currentMonth
        }
      }
    })
  ]);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalAssets,
    totalAssetsChange: calculateChange(totalAssets, prevTotalAssets),
    activeEmployees,
    activeEmployeesChange: calculateChange(activeEmployees, prevActiveEmployees),
    activeDeployments,
    activeDeploymentsChange: calculateChange(activeDeployments, prevActiveDeployments),
    pendingApprovals,
    pendingApprovalsChange: 0, // You might want to track this over time
    maintenanceAlerts,
    lowStockItems: 0, // Implement based on your stock tracking logic
    reportsGenerated,
    reportsChange: calculateChange(reportsGenerated, prevReportsGenerated)
  };
}

async function getRecentDeployments(businessUnitId: string): Promise<RecentDeployment[]> {
  const deployments = await prisma.assetDeployment.findMany({
    where: { businessUnitId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      asset: {
        select: { description: true }
      },
      employee: {
        select: { firstName: true, lastName: true }
      }
    }
  });

  return deployments.map(deployment => ({
    id: deployment.id,
    assetDescription: deployment.asset.description,
    employeeName: `${deployment.employee.firstName} ${deployment.employee.lastName}`,
    deployedDate: deployment.deployedDate || deployment.createdAt,
    status: deployment.status
  }));
}

async function getSystemAlerts(businessUnitId: string): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = [];
  
  // Maintenance alerts
  const maintenanceAssets = await prisma.asset.findMany({
    where: {
      businessUnitId,
      status: AssetStatus.IN_MAINTENANCE,
      isActive: true
    },
    take: 5,
    select: {
      id: true,
      description: true,
      updatedAt: true
    }
  });

  maintenanceAssets.forEach(asset => {
    alerts.push({
      id: `maintenance-${asset.id}`,
      type: 'MAINTENANCE_DUE',
      title: 'Asset in Maintenance',
      message: `${asset.description} requires maintenance attention`,
      severity: 'MEDIUM',
      createdAt: asset.updatedAt,
      relatedId: asset.id
    });
  });

  // Pending approvals
  const pendingApprovals = await prisma.assetDeployment.findMany({
    where: {
      businessUnitId,
      status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
    },
    take: 5,
    include: {
      asset: { select: { description: true } }
    }
  });

  pendingApprovals.forEach(deployment => {
    alerts.push({
      id: `approval-${deployment.id}`,
      type: 'APPROVAL_PENDING',
      title: 'Pending Approval',
      message: `Asset deployment for ${deployment.asset.description} needs approval`,
      severity: 'HIGH',
      createdAt: deployment.createdAt,
      relatedId: deployment.id
    });
  });

  // Warranty expiry (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringWarranties = await prisma.asset.findMany({
    where: {
      businessUnitId,
      isActive: true,
      warrantyExpiry: {
        lte: thirtyDaysFromNow,
        gt: new Date()
      }
    },
    take: 5,
    select: {
      id: true,
      description: true,
      warrantyExpiry: true
    }
  });

  expiringWarranties.forEach(asset => {
    alerts.push({
      id: `warranty-${asset.id}`,
      type: 'WARRANTY_EXPIRY',
      title: 'Warranty Expiring Soon',
      message: `Warranty for ${asset.description} expires on ${asset.warrantyExpiry?.toLocaleDateString()}`,
      severity: 'LOW',
      createdAt: new Date(),
      relatedId: asset.id
    });
  });

  return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

async function getAssetsByCategory(businessUnitId: string): Promise<AssetByCategoryChart[]> {
  const assetsByCategory = await prisma.asset.groupBy({
    by: ['categoryId'],
    where: {
      businessUnitId,
      isActive: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });

  const totalAssets = assetsByCategory.reduce((sum, item) => sum + item._count.id, 0);

  // Get category names
  const categoryIds = assetsByCategory.map(item => item.categoryId);
  const categories = await prisma.assetCategory.findMany({
    where: {
      id: { in: categoryIds }
    },
    select: {
      id: true,
      name: true
    }
  });

  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  return assetsByCategory.map(item => ({
    category: categoryMap.get(item.categoryId) || 'Unknown',
    count: item._count.id,
    percentage: Math.round((item._count.id / totalAssets) * 100)
  }));
}

async function getDeploymentTrends(businessUnitId: string): Promise<DeploymentTrendChart[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deploymentTrends = await prisma.assetDeployment.findMany({
    where: {
      businessUnitId,
      createdAt: { gte: sixMonthsAgo }
    },
    select: {
      createdAt: true,
      returnedDate: true
    }
  });

  const monthlyData = new Map<string, { deployments: number; returns: number }>();

  // Initialize months
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyData.set(monthKey, { deployments: 0, returns: 0 });
  }

  // Count deployments and returns
  deploymentTrends.forEach(deployment => {
    const deploymentMonth = deployment.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
    const data = monthlyData.get(deploymentMonth);
    if (data) {
      data.deployments++;
    }

    if (deployment.returnedDate) {
      const returnMonth = deployment.returnedDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      const returnData = monthlyData.get(returnMonth);
      if (returnData) {
        returnData.returns++;
      }
    }
  });

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      deployments: data.deployments,
      returns: data.returns
    }))
    .reverse();
}

async function getTopAssets(businessUnitId: string): Promise<TopAssetsChart[]> {
  const topAssets = await prisma.asset.findMany({
    where: {
      businessUnitId,
      isActive: true
    },
    include: {
      deployments: {
        select: {
          id: true
        }
      },
      category: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      deployments: {
        _count: 'desc'
      }
    },
    take: 10
  });

  return topAssets.map(asset => ({
    description: asset.description,
    deploymentCount: asset.deployments.length,
    category: asset.category.name
  }));
}