// components/reports/report-detail-page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Report, AssetInventoryReport, DeploymentSummaryReport } from '@/types/report-types';

interface ReportDetailPageProps {
  report: Report;
  businessUnitId: string;
}

export function ReportDetailPage({ report, businessUnitId }: ReportDetailPageProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push(`/dashboard/${businessUnitId}/reports`);
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET_INVENTORY':
        return 'bg-blue-100 text-blue-800';
      case 'DEPLOYMENT_SUMMARY':
        return 'bg-green-100 text-green-800';
      case 'EMPLOYEE_ASSETS':
        return 'bg-purple-100 text-purple-800';
      case 'FINANCIAL_SUMMARY':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAssetInventoryReport = (data: AssetInventoryReport) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assetsByCategory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{data.assetsByCategory.reduce((sum, cat) => sum + cat.totalValue, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.assetsByCategory.map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{category.categoryName}</p>
                    <p className="text-sm text-muted-foreground">
                      ₱{category.totalValue.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{category.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.assetsByStatus.map((status, index) => (
                <div key={index} className="flex justify-between items-center">
                  <p className="font-medium capitalize">{status.status.toLowerCase()}</p>
                  <Badge variant="secondary">{status.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Assets by Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topAssetsByValue.map((asset, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{asset.itemCode}</p>
                  <p className="text-sm text-muted-foreground">{asset.description}</p>
                </div>
                <p className="font-medium">₱{asset.purchasePrice.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDeploymentSummaryReport = (data: DeploymentSummaryReport) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDeployments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeDeployments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingReturns}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployments by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.deploymentsByStatus.map((status, index) => (
                <div key={index} className="flex justify-between items-center">
                  <p className="font-medium capitalize">{status.status.toLowerCase()}</p>
                  <Badge variant="secondary">{status.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Employees by Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topEmployeesByAssets.map((employee, index) => (
                <div key={index} className="flex justify-between items-center">
                  <p className="font-medium">{employee.employeeName}</p>
                  <Badge variant="secondary">{employee.assetCount}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderReportData = () => {
    switch (report.type) {
      case 'ASSET_INVENTORY':
        return renderAssetInventoryReport(report.data as unknown as AssetInventoryReport);
      case 'DEPLOYMENT_SUMMARY':
        return renderDeploymentSummaryReport(report.data as unknown as DeploymentSummaryReport);
      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Report data visualization not implemented for this report type.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{report.name}</h1>
            <p className="text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Report Information</CardTitle>
            <Badge className={getReportTypeColor(report.type)}>
              {report.type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Generated Date</label>
              <p className="mt-1">{new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Generated By</label>
              <p className="mt-1">{report.generatedBy}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Report Type</label>
              <p className="mt-1">{report.type.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge className="mt-1 bg-green-100 text-green-800">
                {report.isActive ? 'Active' : 'Archived'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderReportData()}
    </div>
  );
}