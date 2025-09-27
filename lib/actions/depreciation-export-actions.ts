// lib/actions/depreciation-export-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { Prisma, DepreciationMethod } from '@prisma/client';
import type { DepreciationReportData, DepreciationSummaryData, DepreciationAssetDetail, DepreciationMethodBreakdown, DepreciationCategoryBreakdown } from '@/types/depreciation-reports-types';

export async function getDepreciationReportData(
  businessUnitId: string,
  options: {
    includeSummary?: boolean;
    includeSchedule?: boolean;
    includeHistory?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ success: boolean; message: string; data?: DepreciationReportData }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const {
      startDate = new Date(new Date().getFullYear(), 0, 1), // Start of current year
      endDate = new Date() // Current date
    } = options;

    // Fetch assets with depreciation data
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        isActive: true,
        purchasePrice: { not: null },
        depreciationMethod: { not: null }
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
            status: 'DEPLOYED'
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
        }
      },
      orderBy: {
        itemCode: 'asc'
      }
    });

    // Calculate summary data
    const totalMonthlyDepreciation = assets.reduce((sum, asset) => sum + (asset.monthlyDepreciation?.toNumber() || 0), 0);
    const summary: DepreciationSummaryData = {
      totalAssets: assets.length,
      totalOriginalValue: assets.reduce((sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0), 0),
      totalCurrentBookValue: assets.reduce((sum, asset) => sum + (asset.currentBookValue?.toNumber() || 0), 0),
      totalAccumulatedDepreciation: assets.reduce((sum, asset) => sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0),
      totalMonthlyDepreciation: totalMonthlyDepreciation,
      totalAnnualDepreciation: totalMonthlyDepreciation * 12,
      fullyDepreciatedAssets: assets.filter(asset => asset.isFullyDepreciated).length,
      assetsDueForDepreciation: assets.filter(asset => 
        asset.nextDepreciationDate && asset.nextDepreciationDate <= new Date()
      ).length,
      averageAssetAge: assets.length > 0 ? assets.reduce((sum, asset) => {
        const purchaseDate = asset.purchaseDate || asset.createdAt;
        const ageInMonths = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return sum + ageInMonths;
      }, 0) / assets.length : 0,
      depreciationRate: 0 // Will calculate below
    };

    // Calculate depreciation rate
    if (summary.totalOriginalValue > 0) {
      summary.depreciationRate = (summary.totalAccumulatedDepreciation / summary.totalOriginalValue) * 100;
    }

    // Prepare asset details
    const assetDetails: DepreciationAssetDetail[] = assets.map(asset => {
      const currentDeployment = asset.deployments[0];
      const assignedTo = currentDeployment 
        ? `${currentDeployment.employee.firstName} ${currentDeployment.employee.lastName} (${currentDeployment.employee.employeeId})`
        : null;

      // Calculate remaining life in months
      const usefulLifeMonths = asset.usefulLifeMonths || (asset.usefulLifeYears ? asset.usefulLifeYears * 12 : 0);
      const purchaseDate = asset.purchaseDate || asset.createdAt;
      const monthsSincePurchase = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const remainingLifeMonths = Math.max(0, usefulLifeMonths - monthsSincePurchase);

      return {
        id: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        purchaseDate: asset.purchaseDate || asset.createdAt,
        purchasePrice: asset.purchasePrice?.toNumber() || 0,
        currentBookValue: asset.currentBookValue?.toNumber() || 0,
        accumulatedDepreciation: asset.accumulatedDepreciation?.toNumber() || 0,
        monthlyDepreciation: asset.monthlyDepreciation?.toNumber() || 0,
        depreciationMethod: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        usefulLifeMonths: usefulLifeMonths,
        remainingLifeMonths: remainingLifeMonths,
        salvageValue: asset.salvageValue?.toNumber() || 0,
        depreciationRate: asset.depreciationRate?.toNumber() || 0,
        isFullyDepreciated: asset.isFullyDepreciated,
        nextDepreciationDate: asset.nextDepreciationDate,
        location: asset.location,
        assignedTo: assignedTo
      };
    });

    // Calculate method breakdown
    const methodBreakdown: DepreciationMethodBreakdown[] = Object.values(DepreciationMethod).map(method => {
      const methodAssets = assets.filter(asset => asset.depreciationMethod === method);
      const totalValue = methodAssets.reduce((sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0), 0);
      const totalCurrentValue = methodAssets.reduce((sum, asset) => sum + (asset.currentBookValue?.toNumber() || 0), 0);
      const totalDepreciation = methodAssets.reduce((sum, asset) => sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0);

      return {
        method,
        assetCount: methodAssets.length,
        totalOriginalValue: totalValue,
        totalCurrentValue: totalCurrentValue,
        totalAccumulatedDepreciation: totalDepreciation,
        totalDepreciation: totalDepreciation, // Same as accumulated depreciation
        averageDepreciationRate: totalValue > 0 ? (totalDepreciation / totalValue) * 100 : 0
      };
    }).filter(breakdown => breakdown.assetCount > 0);

    // Calculate category breakdown
    const categoryBreakdown: DepreciationCategoryBreakdown[] = [];
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
      const totalDepreciation = categoryData.assets.reduce((sum, asset) => sum + (asset.accumulatedDepreciation?.toNumber() || 0), 0);

      categoryBreakdown.push({
        category: categoryName,
        assetCount: categoryData.assets.length,
        totalOriginalValue: totalValue,
        totalCurrentValue: categoryData.assets.reduce((sum, asset) => sum + (asset.currentBookValue?.toNumber() || 0), 0),
        totalDepreciation: totalDepreciation,
        averageAssetAge: categoryData.assets.length > 0 ? categoryData.assets.reduce((sum, asset) => {
          const purchaseDate = asset.purchaseDate || asset.createdAt;
          const ageInMonths = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
          return sum + ageInMonths;
        }, 0) / categoryData.assets.length : 0
      });
    });

    const reportData: DepreciationReportData = {
      reportId: crypto.randomUUID(), // Generate a unique report ID
      businessUnitId,
      generatedAt: new Date(),
      generatedBy: user.id,
      reportPeriod: {
        startDate,
        endDate
      },
      summary,
      assetDetails,
      methodBreakdown,
      categoryBreakdown
    };

    return {
      success: true,
      message: 'Report data prepared successfully',
      data: reportData
    };

  } catch (error) {
    console.error('Error preparing report data:', error);
    return { success: false, message: 'Failed to prepare report data' };
  }
}

// Keep Excel generation on server since it can be more complex
export async function generateDepreciationExcel(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getDepreciationReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Structure data for Excel export
    const excelData = {
      summary: {
        totalAssets: reportData.summary.totalAssets,
        totalOriginalValue: reportData.summary.totalOriginalValue,
        totalCurrentBookValue: reportData.summary.totalCurrentBookValue,
        totalAccumulatedDepreciation: reportData.summary.totalAccumulatedDepreciation,
        depreciationRate: reportData.summary.depreciationRate
      },
      assets: reportData.assetDetails.map(asset => ({
        'Item Code': asset.itemCode,
        'Description': asset.description,
        'Category': asset.category,
        'Purchase Date': asset.purchaseDate.toLocaleDateString(),
        'Purchase Price': asset.purchasePrice,
        'Current Book Value': asset.currentBookValue,
        'Accumulated Depreciation': asset.accumulatedDepreciation,
        'Monthly Depreciation': asset.monthlyDepreciation,
        'Depreciation Method': asset.depreciationMethod,
        'Useful Life (Months)': asset.usefulLifeMonths,
        'Remaining Life (Months)': asset.remainingLifeMonths,
        'Salvage Value': asset.salvageValue,
        'Depreciation Rate (%)': asset.depreciationRate,
        'Fully Depreciated': asset.isFullyDepreciated ? 'Yes' : 'No',
        'Location': asset.location || 'N/A',
        'Assigned To': asset.assignedTo || 'Unassigned'
      })),
      methodBreakdown: reportData.methodBreakdown,
      categoryBreakdown: reportData.categoryBreakdown
    };

    // Store the report data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Depreciation Report Excel - ${new Date().toLocaleDateString()}`,
        description: 'Generated depreciation report with Excel export',
        type: 'DEPRECIATION_REPORT',
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

// Keep CSV generation on server 
export async function generateDepreciationCSV(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getDepreciationReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Convert asset details to CSV format
    const csvHeaders = [
      'Item Code',
      'Description', 
      'Category',
      'Purchase Date',
      'Purchase Price',
      'Current Book Value',
      'Accumulated Depreciation',
      'Monthly Depreciation',
      'Depreciation Method',
      'Useful Life (Months)',
      'Remaining Life (Months)',
      'Salvage Value',
      'Depreciation Rate (%)',
      'Fully Depreciated',
      'Location',
      'Assigned To'
    ];

    const csvRows = reportData.assetDetails.map(asset => [
      asset.itemCode,
      asset.description,
      asset.category,
      asset.purchaseDate.toLocaleDateString(),
      asset.purchasePrice.toString(),
      asset.currentBookValue.toString(),
      asset.accumulatedDepreciation.toString(),
      asset.monthlyDepreciation.toString(),
      asset.depreciationMethod,
      asset.usefulLifeMonths.toString(),
      asset.remainingLifeMonths.toString(),
      asset.salvageValue.toString(),
      asset.depreciationRate.toString(),
      asset.isFullyDepreciated ? 'Yes' : 'No',
      asset.location || 'N/A',
      asset.assignedTo || 'Unassigned'
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Store the CSV data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Depreciation Report CSV - ${new Date().toLocaleDateString()}`,
        description: 'Generated depreciation report with CSV export',
        type: 'DEPRECIATION_REPORT',
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