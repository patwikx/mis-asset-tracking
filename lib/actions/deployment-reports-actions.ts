// lib/actions/deployment-report-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { DeploymentStatus, Prisma } from '@prisma/client';
import type { 
  DeploymentReportData, 
  DeploymentSummaryData, 
  DeploymentDetail, 
  DeploymentStatusBreakdown, 
  EmployeeDeploymentBreakdown 
} from '@/types/deployment-report-types';

export async function getDeploymentReportData(
  businessUnitId: string,
  options: {
    includeReturned?: boolean;
    includeCancelled?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ success: boolean; message: string; data?: DeploymentReportData }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const {
      startDate = new Date(new Date().getFullYear(), 0, 1), // Start of current year
      endDate = new Date() // Current date
    } = options;

    // Fetch deployments with related data
    const deployments = await prisma.assetDeployment.findMany({
      where: {
        businessUnitId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        asset: {
          select: {
            itemCode: true,
            description: true,
            category: {
              select: {
                name: true
              }
            }
          }
        },
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            position: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate summary data
    const totalDeployments = deployments.length;
    const activeDeployments = deployments.filter(d => d.status === DeploymentStatus.DEPLOYED).length;
    const pendingApprovals = deployments.filter(d => d.status === DeploymentStatus.PENDING_ACCOUNTING_APPROVAL).length;
    const returnedDeployments = deployments.filter(d => d.status === DeploymentStatus.RETURNED).length;
    const cancelledDeployments = deployments.filter(d => d.status === DeploymentStatus.CANCELLED).length;

    // Calculate utilization rate (active deployments vs total assets)
    const totalAssets = await prisma.asset.count({
      where: { businessUnitId, isActive: true }
    });
    const utilizationRate = totalAssets > 0 ? (activeDeployments / totalAssets) * 100 : 0;

    // Calculate average deployment duration
    const completedDeployments = deployments.filter(d => 
      d.deployedDate && (d.returnedDate || d.status === DeploymentStatus.RETURNED)
    );
    const totalDuration = completedDeployments.reduce((sum, deployment) => {
      if (deployment.deployedDate && deployment.returnedDate) {
        const duration = deployment.returnedDate.getTime() - deployment.deployedDate.getTime();
        return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
      }
      return sum;
    }, 0);
    const averageDeploymentDuration = completedDeployments.length > 0 
      ? totalDuration / completedDeployments.length 
      : 0;

    const uniqueEmployees = new Set(deployments.map(d => d.employeeId)).size;
    const uniqueAssets = new Set(deployments.map(d => d.assetId)).size;

    const summary: DeploymentSummaryData = {
      totalDeployments,
      activeDeployments,
      pendingApprovals,
      returnedDeployments,
      cancelledDeployments,
      utilizationRate,
      averageDeploymentDuration,
      uniqueEmployees,
      uniqueAssets
    };

    // Prepare deployment details
    const deploymentDetails: DeploymentDetail[] = deployments.map(deployment => ({
      id: deployment.id,
      transmittalNumber: deployment.transmittalNumber,
      assetCode: deployment.asset.itemCode,
      assetDescription: deployment.asset.description,
      employeeId: deployment.employee.employeeId,
      employeeName: `${deployment.employee.firstName} ${deployment.employee.lastName}`,
      status: deployment.status,
      deployedDate: deployment.deployedDate,
      expectedReturnDate: deployment.expectedReturnDate,
      returnedDate: deployment.returnedDate,
      deploymentCondition: deployment.deploymentCondition,
      returnCondition: deployment.returnCondition,
      deploymentNotes: deployment.deploymentNotes
    }));

    // Calculate status breakdown
    const statusBreakdown: DeploymentStatusBreakdown[] = Object.values(DeploymentStatus).map(status => {
      const statusDeployments = deployments.filter(deployment => deployment.status === status);

      return {
        status,
        count: statusDeployments.length,
        percentage: totalDeployments > 0 ? (statusDeployments.length / totalDeployments) * 100 : 0
      };
    }).filter(breakdown => breakdown.count > 0);

    // Calculate employee breakdown
    const employeeMap = new Map<string, {
      employee: typeof deployments[0]['employee'];
      deployments: typeof deployments;
    }>();

    deployments.forEach(deployment => {
      const employeeId = deployment.employeeId;
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employee: deployment.employee,
          deployments: []
        });
      }
      employeeMap.get(employeeId)!.deployments.push(deployment);
    });

    const employeeBreakdown: EmployeeDeploymentBreakdown[] = Array.from(employeeMap.entries())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([employeeId, data]) => ({
        employeeId: data.employee.employeeId,
        employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
        deploymentCount: data.deployments.length,
        activeDeployments: data.deployments.filter(d => d.status === DeploymentStatus.DEPLOYED).length
      }))
      .sort((a, b) => b.deploymentCount - a.deploymentCount)
      .slice(0, 10); // Top 10 employees

    const reportData: DeploymentReportData = {
      reportId: crypto.randomUUID(),
      businessUnitId,
      generatedAt: new Date(),
      generatedBy: `${user.firstName} ${user.lastName}`,
      reportPeriod: {
        startDate,
        endDate
      },
      summary,
      deploymentDetails,
      statusBreakdown,
      employeeBreakdown
    };

    return {
      success: true,
      message: 'Deployment report data prepared successfully',
      data: reportData
    };

  } catch (error) {
    console.error('Error preparing deployment report data:', error);
    return { success: false, message: 'Failed to prepare deployment report data' };
  }
}

export async function generateDeploymentExcel(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getDeploymentReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Structure data for Excel export
    const excelData = {
      summary: {
        totalDeployments: reportData.summary.totalDeployments,
        activeDeployments: reportData.summary.activeDeployments,
        pendingApprovals: reportData.summary.pendingApprovals,
        returnedDeployments: reportData.summary.returnedDeployments,
        utilizationRate: reportData.summary.utilizationRate
      },
      deployments: reportData.deploymentDetails.map(deployment => ({
        'Transmittal Number': deployment.transmittalNumber,
        'Asset Code': deployment.assetCode,
        'Asset Description': deployment.assetDescription,
        'Employee ID': deployment.employeeId,
        'Employee Name': deployment.employeeName,
        'Status': deployment.status,
        'Deployed Date': deployment.deployedDate?.toLocaleDateString() || 'N/A',
        'Expected Return Date': deployment.expectedReturnDate?.toLocaleDateString() || 'N/A',
        'Returned Date': deployment.returnedDate?.toLocaleDateString() || 'N/A',
        'Deployment Condition': deployment.deploymentCondition || 'N/A',
        'Return Condition': deployment.returnCondition || 'N/A',
        'Notes': deployment.deploymentNotes || 'N/A'
      })),
      statusBreakdown: reportData.statusBreakdown,
      employeeBreakdown: reportData.employeeBreakdown
    };

    // Store the report data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Deployment Report Excel - ${new Date().toLocaleDateString()}`,
        description: 'Generated deployment report with Excel export',
        type: 'DEPLOYMENT_SUMMARY',
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

export async function generateDeploymentCSV(
  businessUnitId: string
): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await getDeploymentReportData(businessUnitId);
    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const reportData = result.data;

    // Convert deployment details to CSV format
    const csvHeaders = [
      'Transmittal Number',
      'Asset Code',
      'Asset Description',
      'Employee ID',
      'Employee Name',
      'Status',
      'Deployed Date',
      'Expected Return Date',
      'Returned Date',
      'Deployment Condition',
      'Return Condition',
      'Notes'
    ];

    const csvRows = reportData.deploymentDetails.map(deployment => [
      deployment.transmittalNumber,
      deployment.assetCode,
      deployment.assetDescription,
      deployment.employeeId,
      deployment.employeeName,
      deployment.status,
      deployment.deployedDate?.toLocaleDateString() || 'N/A',
      deployment.expectedReturnDate?.toLocaleDateString() || 'N/A',
      deployment.returnedDate?.toLocaleDateString() || 'N/A',
      deployment.deploymentCondition || 'N/A',
      deployment.returnCondition || 'N/A',
      deployment.deploymentNotes || 'N/A'
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Store the CSV data
    const reportRecord = await prisma.report.create({
      data: {
        name: `Deployment Report CSV - ${new Date().toLocaleDateString()}`,
        description: 'Generated deployment report with CSV export',
        type: 'DEPLOYMENT_SUMMARY',
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