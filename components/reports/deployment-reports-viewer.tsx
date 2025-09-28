// components/reports/deployment-report-viewer.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, FileText, ChartBar as BarChart3, Users, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DeploymentReportData } from '@/types/deployment-report-types';

interface DeploymentReportViewerProps {
  report: DeploymentReportData;
  onExport: (format: 'PDF' | 'EXCEL' | 'CSV') => void;
  onPrint: () => void;
  isExporting?: boolean;
}

export function DeploymentReportViewer({ 
  report, 
  onExport, 
  onPrint,
  isExporting = false
}: DeploymentReportViewerProps) {
  const { summary, deploymentDetails, statusBreakdown, employeeBreakdown } = report;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_ACCOUNTING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 print:space-y-4" id="deployment-report">
      {/* Report Header */}
      <div className="flex items-center justify-between print:block">
        <div className="print:text-center print:mb-6">
          <h1 className="text-2xl font-bold flex items-center print:justify-center">
            <FileText className="h-6 w-6 mr-2 print:hidden" />
            Deployment & Assignment Report
          </h1>
          <p className="text-muted-foreground">
            Generated on {format(report.generatedAt, 'MMMM dd, yyyy')} by {report.generatedBy}
          </p>
          <p className="text-sm text-muted-foreground">
            Report Period: {format(report.reportPeriod.startDate, 'MMM dd, yyyy')} - {format(report.reportPeriod.endDate, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex space-x-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onPrint} disabled={isExporting}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExport('PDF')}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExport('EXCEL')}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onExport('CSV')}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            CSV
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:grid-cols-5">
            <div className="text-center">
              <div className="text-xl font-bold">{summary.totalDeployments}</div>
              <p className="text-sm text-muted-foreground">Total Deployments</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.activeDeployments}</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.pendingApprovals}</div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.returnedDeployments}</div>
              <p className="text-sm text-muted-foreground">Returned</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatPercentage(summary.utilizationRate)}</div>
              <p className="text-sm text-muted-foreground">Utilization Rate</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.averageDeploymentDuration.toFixed(1)} days</div>
              <p className="text-sm text-muted-foreground">Avg. Deployment Duration</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.uniqueEmployees}</div>
              <p className="text-sm text-muted-foreground">Employees with Assets</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.uniqueAssets}</div>
              <p className="text-sm text-muted-foreground">Assets Deployed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Employee Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Deployments by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusBreakdown.map((status, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status.status)}>
                      {status.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{status.count}</span>
                    <span className="text-sm text-muted-foreground">
                      ({formatPercentage(status.percentage)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Top Employees by Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employeeBreakdown.map((employee, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{employee.employeeName}</span>
                  </div>
                  <Badge variant="outline">{employee.deploymentCount}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Details Table */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle>Deployment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Transmittal #</th>
                  <th className="text-left py-2 px-2 font-medium">Asset</th>
                  <th className="text-left py-2 px-2 font-medium">Employee</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                  <th className="text-center py-2 px-2 font-medium">Deployed Date</th>
                  <th className="text-center py-2 px-2 font-medium">Expected Return</th>
                  <th className="text-center py-2 px-2 font-medium">Returned Date</th>
                </tr>
              </thead>
              <tbody>
                {deploymentDetails.slice(0, 50).map((deployment, index) => (
                  <tr key={index} className="border-b hover:bg-muted/25">
                    <td className="py-2 px-2 font-mono text-xs">{deployment.transmittalNumber}</td>
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{deployment.assetDescription}</p>
                        <p className="text-xs text-muted-foreground">
                          {deployment.assetCode}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{deployment.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {deployment.employeeId}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Badge className={getStatusColor(deployment.status)} variant="secondary">
                        {deployment.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center text-xs">
                      {deployment.deployedDate ? format(deployment.deployedDate, 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-center text-xs">
                      {deployment.expectedReturnDate ? format(deployment.expectedReturnDate, 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-center text-xs">
                      {deployment.returnedDate ? format(deployment.returnedDate, 'MMM dd, yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deploymentDetails.length > 50 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Showing first 50 deployments. Export full report for complete data.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Footer */}
      <div className="text-center text-sm text-muted-foreground print:mt-8">
        <Separator className="mb-4" />
        <p>
          This report was generated on {format(report.generatedAt, 'MMMM dd, yyyy \'at\' HH:mm')} 
          by {report.generatedBy}
        </p>
        <p className="mt-1">
          Asset Management System - Deployment Report #{report.reportId}
        </p>
      </div>
    </div>
  );
}