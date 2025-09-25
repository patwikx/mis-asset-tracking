// lib/actions/report-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { Prisma } from '@prisma/client';
import { ReportType } from '@/types/report-types';
import type {
  Report,
  CreateReportData,
  ReportFilters,
  PaginationParams,
  PaginatedResponse,
  AssetInventoryReport,
  DeploymentSummaryReport
} from '@/types/report-types';

export async function getReports(
  businessUnitId: string,
  filters: ReportFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<Report>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, type, dateFrom, dateTo } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: Prisma.ReportWhereInput = {
      isActive: true,
      businessUnitId,
    };

    if (type) {
      where.type = type;
    }

    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: dateFrom,
        lte: dateTo
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.report.count({ where })
    ]);

    return serializeForClient({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Failed to fetch reports');
  }
}

export async function getReportById(id: string): Promise<Report | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const report = await prisma.report.findUnique({
      where: { 
        id,
        isActive: true
      }
    });

    return report ? serializeForClient(report) : null;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw new Error('Failed to fetch report');
  }
}

export async function generateAssetInventoryReport(businessUnitId: string): Promise<AssetInventoryReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const [
      totalAssets,
      assetsByCategory,
      assetsByStatus,
      topAssetsByValue
    ] = await Promise.all([
      prisma.asset.count({
        where: { businessUnitId, isActive: true }
      }),
      prisma.asset.groupBy({
        by: ['categoryId'],
        where: { businessUnitId, isActive: true },
        _count: { id: true },
        _sum: { purchasePrice: true }
      }),
      prisma.asset.groupBy({
        by: ['status'],
        where: { businessUnitId, isActive: true },
        _count: { id: true }
      }),
      prisma.asset.findMany({
        where: { businessUnitId, isActive: true },
        select: {
          itemCode: true,
          description: true,
          purchasePrice: true
        },
        orderBy: { purchasePrice: 'desc' },
        take: 10
      })
    ]);

    const categoryDetails = await prisma.assetCategory.findMany({
      where: {
        id: { in: assetsByCategory.map(item => item.categoryId) }
      },
      select: { id: true, name: true }
    });

    const categoryMap = new Map(categoryDetails.map(cat => [cat.id, cat.name]));

    return serializeForClient({
      totalAssets,
      assetsByCategory: assetsByCategory.map(item => ({
        categoryName: categoryMap.get(item.categoryId) || 'Unknown',
        count: item._count.id,
        totalValue: item._sum.purchasePrice ? item._sum.purchasePrice.toNumber() : 0
      })),
      assetsByStatus: assetsByStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      topAssetsByValue: topAssetsByValue.map(asset => ({
        itemCode: asset.itemCode,
        description: asset.description,
        purchasePrice: asset.purchasePrice ? asset.purchasePrice.toNumber() : 0
      }))
    });
  } catch (error) {
    console.error('Error generating asset inventory report:', error);
    throw new Error('Failed to generate asset inventory report');
  }
}

export async function generateDeploymentSummaryReport(businessUnitId: string): Promise<DeploymentSummaryReport> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const [
      totalDeployments,
      activeDeployments,
      pendingReturns,
      deploymentsByStatus,
      topEmployeesByAssets
    ] = await Promise.all([
      prisma.assetDeployment.count({
        where: { businessUnitId }
      }),
      prisma.assetDeployment.count({
        where: { businessUnitId, status: 'DEPLOYED' }
      }),
      prisma.assetDeployment.count({
        where: { businessUnitId, status: 'RETURNED' }
      }),
      prisma.assetDeployment.groupBy({
        by: ['status'],
        where: { businessUnitId },
        _count: { id: true }
      }),
      prisma.assetDeployment.groupBy({
        by: ['employeeId'],
        where: { businessUnitId, status: 'DEPLOYED' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ]);

    const employeeIds = topEmployeesByAssets.map(item => item.employeeId);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true }
    });

    const employeeMap = new Map(employees.map(emp => [
      emp.id, 
      `${emp.firstName} ${emp.lastName}`
    ]));

    return serializeForClient({
      totalDeployments,
      activeDeployments,
      pendingReturns,
      deploymentsByStatus: deploymentsByStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      topEmployeesByAssets: topEmployeesByAssets.map(item => ({
        employeeName: employeeMap.get(item.employeeId) || 'Unknown',
        assetCount: item._count.id
      }))
    });
  } catch (error) {
    console.error('Error generating deployment summary report:', error);
    throw new Error('Failed to generate deployment summary report');
  }
}

export async function createReport(data: CreateReportData): Promise<Report> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Type-safe report data generation
    let reportData: AssetInventoryReport | DeploymentSummaryReport | Record<string, unknown>;

    // Generate report data based on type
    switch (data.type) {
      case ReportType.ASSET_INVENTORY:
        reportData = await generateAssetInventoryReport(data.businessUnitId);
        break;
      case ReportType.DEPLOYMENT_SUMMARY:
        reportData = await generateDeploymentSummaryReport(data.businessUnitId);
        break;
      default:
        reportData = { message: 'Report type not implemented yet' };
    }

    // Prepare report create data with proper types
    const reportCreateData: Prisma.ReportCreateInput = {
      name: data.name,
      description: data.description,
      type: data.type,
      parameters: data.parameters 
        ? data.parameters as Prisma.InputJsonValue 
        : Prisma.JsonNull,
      businessUnitId: data.businessUnitId,
      generatedBy: user.id,
      generatedAt: new Date(),
      data: reportData as Prisma.InputJsonValue,
      isActive: true
    };

    const report = await prisma.report.create({
      data: reportCreateData
    });

    revalidatePath(`/dashboard/${data.businessUnitId}/reports`);
    return serializeForClient(report);
  } catch (error) {
    console.error('Error creating report:', error);
    throw new Error('Failed to create report');
  }
}

export async function deleteReport(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const report = await prisma.report.findUnique({
      where: { id },
      select: { businessUnitId: true }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    await prisma.report.update({
      where: { id },
      data: { isActive: false }
    });

    revalidatePath(`/dashboard/${report.businessUnitId}/reports`);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw new Error('Failed to delete report');
  }
}