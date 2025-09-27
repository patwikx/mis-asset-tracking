// lib/actions/depreciation-export-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { Prisma } from '@prisma/client';
import type { DepreciationReportData } from '@/types/depreciation-reports-types';

export async function generateDepreciationPDF(
  reportData: DepreciationReportData
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // In a real implementation, you would use a PDF library like puppeteer or jsPDF
    // For now, we'll create a structured data response that can be used by the frontend
    
    const pdfData = {
      title: 'Asset Depreciation Report',
      generatedAt: reportData.generatedAt.toISOString(),
      generatedBy: reportData.generatedBy,
      businessUnitId: reportData.businessUnitId,
      summary: reportData.summary,
      assetDetails: reportData.assetDetails,
      methodBreakdown: reportData.methodBreakdown,
      categoryBreakdown: reportData.categoryBreakdown
    };

    // Store the report data temporarily (in a real app, you'd generate actual PDF)
    const reportRecord = await prisma.report.create({
      data: {
        name: `Depreciation Report - ${new Date().toLocaleDateString()}`,
        description: 'Generated depreciation report with PDF export',
        type: 'DEPRECIATION_REPORT',
        parameters: {
          format: 'PDF',
          startDate: reportData.reportPeriod.startDate.toISOString(),
          endDate: reportData.reportPeriod.endDate.toISOString()
        } as unknown as Prisma.InputJsonValue,
        data: pdfData as unknown as Prisma.InputJsonValue,
        generatedBy: user.id,
        businessUnitId: reportData.businessUnitId
      }
    });

    return {
      success: true,
      message: 'PDF report generated successfully',
      downloadUrl: `/api/reports/download/${reportRecord.id}/pdf`
    };

  } catch (error) {
    console.error('Error generating PDF report:', error);
    return { success: false, message: 'Failed to generate PDF report' };
  }
}

export async function generateDepreciationExcel(
  reportData: DepreciationReportData
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

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

export async function generateDepreciationCSV(
  reportData: DepreciationReportData
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

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