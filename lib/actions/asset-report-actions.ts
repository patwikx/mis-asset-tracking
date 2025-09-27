// lib/actions/asset-report-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { AssetStatus, DeploymentStatus, Prisma } from '@prisma/client';
import type { 
  AssetReportData, 
  AssetSummaryData, 
  AssetDetail, 
  AssetCategoryBreakdown, 
  AssetStatusBreakdown, 
  DeploymentStatusBreakdown 
} from '@/types/asset-report-types';

export async function getAssetReportData(
  businessUnitId: string,
  options: {
    includeDeployments?: boolean;
    includeMaintenance?: boolean;
    includeFinancials?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ success: boolean; message: string; data?: AssetReportData }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const {
      startDate = new Date(new Date().getFullYear(), 0, 1), // Start of current year
      endDate = new Date() // Current date
    } = options;

    // Fetch assets with related data
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true
      },
      include: {
        category: {
          select: {
            name: true,
            code: true
          }
        },
        deployments: {
          where: {
            status: DeploymentStatus.DEPLOYED
          },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true
              }
            }
          },
          take: 1
        },
        maintenanceRecords: {
          where: {
            isCompleted: true
          },
          orderBy: {
            completedDate: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        itemCode: 'asc'
      }
    });

    // Get deployment data
    const deployments = await prisma.assetDeployment.findMany({
      where: {
        businessUnitId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate summary data
    const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0), 0);
    const availableAssets = assets.filter(asset => asset.status === AssetStatus.AVAILABLE).length;
    const deployedAssets = assets.filter(asset => asset.status === AssetStatus.DEPLOYED).length;
    const maintenanceAssets = assets.filter(asset => asset.status === AssetStatus.IN_MAINTENANCE).length;
    const retiredAssets = assets.filter(asset => asset.status === AssetStatus.RETIRED).length;
    const activeDeployments = deployments.filter(d => d.status === DeploymentStatus.DEPLOYED).length;
    const pendingApprovals = deployments.filter(d => d.status === DeploymentStatus.PENDING_ACCOUNTING_APPROVAL).length;

    const summary: AssetSummaryData = {
      totalAssets: assets.length,
      availableAssets,
      deployedAssets,
      maintenanceAssets,
      retiredAssets,
      totalAssetValue,
      averageAssetValue: assets.length > 0 ? totalAssetValue / assets.length : 0,
      activeDeployments,
      pendingApprovals,
      utilizationRate: assets.length > 0 ? (deployedAssets / assets.length) * 100 : 0,
      averageAssetAge: assets.length > 0 ? assets.reduce((sum, asset) => {
        const purchaseDate = asset.purchaseDate || asset.createdAt;
        const ageInMonths = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return sum + ageInMonths;
      }, 0) / assets.length : 0,
      categoriesCount: [...new Set(assets.map(asset => asset.categoryId))].length
    };

    // Prepare asset details
    const assetDetails: AssetDetail[] = assets.map(asset => {
      const currentDeployment = asset.deployments[0];
      const assignedTo = currentDeployment 
        ? `${currentDeployment.employee.firstName} ${currentDeployment.employee.lastName} (${currentDeployment.employee.employeeId})`
        : null;

      const lastMaintenance = asset.maintenanceRecords[0];

      return {
        id: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        status: asset.status,
        purchaseDate: asset.purchaseDate,
        purchasePrice: asset.purchasePrice?.toNumber() || null,
        currentBookValue: asset.currentBookValue?.toNumber() || null,
        location: asset.location,
        assignedTo,
        serialNumber: asset.serialNumber,
        brand: asset.brand,
        warrantyExpiry: asset.warrantyExpiry,
        lastMaintenanceDate: lastMaintenance?.completedDate || null
      };
    });

    // Calculate category breakdown
    const categoryBreakdown: AssetCategoryBreakdown[] = [];
    const categoryMap = new Map<string, {
      name: string;
      assets: typeof assets;
    }>();

    assets.forEach(asset => {
      const categoryName = asset.category.name;
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          assets: []
        });
      }
      categoryMap.get(categoryName)!.assets.push(asset);
    });

    categoryMap.forEach((categoryData, categoryName) => {
      const totalValue = categoryData.assets.reduce((sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0), 0);
      const availableCount = categoryData.assets.filter(asset => asset.status === AssetStatus.AVAILABLE).length;
      const deployedCount = categoryData.assets.filter(asset => asset.status === AssetStatus.DEPLOYED).length;
      const maintenanceCount = categoryData.assets.filter(asset => asset.status === AssetStatus.IN_MAINTENANCE).length;

      categoryBreakdown.push({
        category: categoryName,
        assetCount: categoryData.assets.length,
        totalValue,
        availableCount,
        deployedCount,
        maintenanceCount,
        percentage: assets.length > 0 ? (categoryData.assets.length / assets.length) * 100 : 0
      });
    });

    // Calculate status breakdown
    const statusBreakdown: AssetStatusBreakdown[] = Object.values(AssetStatus).map(status => {
      const statusAssets = assets.filter(asset => asset.status === status);
      const totalValue = statusAssets.reduce((sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0), 0);

      return {
        status,
        count: statusAssets.length,
        percentage: assets.length > 0 ? (statusAssets.length / assets.length) * 100 : 0,
        totalValue
      };
    }).filter(breakdown => breakdown.count > 0);

    // Calculate deployment breakdown
    const deploymentBreakdown: DeploymentStatusBreakdown[] = Object.values(DeploymentStatus).map(status => {
      const statusDeployments = deployments.filter(deployment => deployment.status === status);

      return {
        status,
        count: statusDeployments.length,
        percentage: deployments.length > 0 ? (statusDeployments.length / deployments.length) * 100 : 0
      };
    }).filter(breakdown => breakdown.count > 0);

    const reportData: AssetReportData = {
      reportId: crypto.randomUUID(),
      businessUnitId,
      generatedAt: new Date(),
      generatedBy: `${user.firstName} ${user.lastName}`,
      reportPeriod: {
        startDate,
        endDate
      },
      summary,
      assetDetails,
      categoryBreakdown,
      statusBreakdown,
      deploymentBreakdown
    };

    return {
      success: true,
      message: 'Asset report data prepared successfully',
      data: reportData
    };

  } catch (error) {
    console.error('Error preparing asset report data:', error);
    return { success: false, message: 'Failed to prepare asset report data' };
  }
}

export async function generateAssetExcel(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getAssetReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Structure data for Excel export
    const excelData = {
      summary: {
        totalAssets: reportData.summary.totalAssets,
        availableAssets: reportData.summary.availableAssets,
        deployedAssets: reportData.summary.deployedAssets,
        totalAssetValue: reportData.summary.totalAssetValue,
        utilizationRate: reportData.summary.utilizationRate
      },
      assets: reportData.assetDetails.map(asset => ({
        'Item Code': asset.itemCode,
        'Description': asset.description,
        'Category': asset.category,
        'Status': asset.status,
        'Purchase Date': asset.purchaseDate?.toLocaleDateString() || 'N/A',
        'Purchase Price': asset.purchasePrice || 0,
        'Current Book Value': asset.currentBookValue || 0,
        'Serial Number': asset.serialNumber || 'N/A',
        'Brand': asset.brand || 'N/A',
        'Location': asset.location || 'N/A',
        'Assigned To': asset.assignedTo || 'Unassigned',
        'Warranty Expiry': asset.warrantyExpiry?.toLocaleDateString() || 'N/A'
      })),
      categoryBreakdown: reportData.categoryBreakdown,
      statusBreakdown: reportData.statusBreakdown,
      deploymentBreakdown: reportData.deploymentBreakdown
    };

    // Store the report data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Asset Report Excel - ${new Date().toLocaleDateString()}`,
        description: 'Generated asset report with Excel export',
        type: 'ASSET_INVENTORY',
        parameters: {
          format: 'EXCEL',
          startDate: reportData.reportPeriod.startDate.toISOString(),
          endDate: reportData.reportPeriod.endDate.toISOString()
        } as unknown as Prisma.InputJsonValue,
        data: excelData as unknown as Prisma.InputJsonValue,
        generatedBy: user.id,
        businessUnitId: reportData.businessUnitId
      }
    });

    return {
      success: true,
      message: 'Excel report generated successfully',
      downloadUrl: `/api/reports/download/${reportRecord.id}/excel`
    };

  } catch (error) {
    console.error('Error generating Excel report:', error);
    return { success: false, message: 'Failed to generate Excel report' };
  }
}

export async function generateAssetCSV(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getAssetReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Convert asset details to CSV format
    const csvHeaders = [
      'Item Code',
      'Description', 
      'Category',
      'Status',
      'Purchase Date',
      'Purchase Price',
      'Current Book Value',
      'Serial Number',
      'Brand',
      'Location',
      'Assigned To',
      'Warranty Expiry'
    ];

    const csvRows = reportData.assetDetails.map(asset => [
      asset.itemCode,
      asset.description,
      asset.category,
      asset.status,
      asset.purchaseDate?.toLocaleDateString() || 'N/A',
      asset.purchasePrice?.toString() || '0',
      asset.currentBookValue?.toString() || '0',
      asset.serialNumber || 'N/A',
      asset.brand || 'N/A',
      asset.location || 'N/A',
      asset.assignedTo || 'Unassigned',
      asset.warrantyExpiry?.toLocaleDateString() || 'N/A'
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Store the CSV data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Asset Report CSV - ${new Date().toLocaleDateString()}`,
        description: 'Generated asset report with CSV export',
        type: 'ASSET_INVENTORY',
        parameters: {
          format: 'CSV',
          startDate: reportData.reportPeriod.startDate.toISOString(),
          endDate: reportData.reportPeriod.endDate.toISOString()
        } as unknown as Prisma.InputJsonValue,
        data: { csvContent } as unknown as Prisma.InputJsonValue,
        generatedBy: user.id,
        businessUnitId: reportData.businessUnitId
      }
    });

    return {
      success: true,
      message: 'CSV report generated successfully',
      downloadUrl: `/api/reports/download/${reportRecord.id}/csv`
    };

  } catch (error) {
    console.error('Error generating CSV report:', error);
    return { success: false, message: 'Failed to generate CSV report' };
  }
}