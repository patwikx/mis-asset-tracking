// components/reports/asset-report-viewer.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, FileText, ChartBar as BarChart3, Package, Users, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { AssetReportData } from '@/types/asset-report-types';

interface AssetReportViewerProps {
  report: AssetReportData;
  onExport: (format: 'PDF' | 'EXCEL' | 'CSV') => void;
  onPrint: () => void;
  isExporting?: boolean;
}

export function AssetReportViewer({ 
  report, 
  onExport, 
  onPrint,
  isExporting = false
}: AssetReportViewerProps) {
  const { summary, assetDetails, categoryBreakdown, statusBreakdown, deploymentBreakdown } = report;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'DEPLOYED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800';
      case 'FULLY_DEPRECIATED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 print:space-y-4" id="asset-report">
      {/* Report Header */}
      <div className="flex items-center justify-between print:block">
        <div className="print:text-center print:mb-6">
          <h1 className="text-2xl font-bold flex items-center print:justify-center">
            <FileText className="h-6 w-6 mr-2 print:hidden" />
            Asset & Deployment Report
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
              <div className="text-xl font-bold">{summary.totalAssets}</div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.availableAssets}</div>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.deployedAssets}</div>
              <p className="text-sm text-muted-foreground">Deployed</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatCurrency(summary.totalAssetValue)}</div>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{summary.activeDeployments}</div>
              <p className="text-sm text-muted-foreground">Active Deployments</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="text-center">
              <div className="text-lg font-semibold">{formatPercentage(summary.utilizationRate)}</div>
              <p className="text-sm text-muted-foreground">Utilization Rate</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.averageAssetAge.toFixed(1)} months</div>
              <p className="text-sm text-muted-foreground">Average Asset Age</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.categoriesCount}</div>
              <p className="text-sm text-muted-foreground">Asset Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle>Assets by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryBreakdown.map((category, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{category.category}</span>
                    <Badge variant="outline">{category.assetCount} assets</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatPercentage(category.percentage)} of total
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Value</p>
                    <p className="font-medium">{formatCurrency(category.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-medium">{category.availableCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deployed</p>
                    <p className="font-medium">{category.deployedCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status & Deployment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
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
            <CardTitle>Deployment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deploymentBreakdown.map((deployment, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{deployment.status.replace('_', ' ')}</span>
                  </div>
                  <Badge variant="outline">{deployment.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Details Table */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Item Code</th>
                  <th className="text-left py-2 px-2 font-medium">Description</th>
                  <th className="text-left py-2 px-2 font-medium">Category</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-2 font-medium">Purchase Price</th>
                  <th className="text-left py-2 px-2 font-medium">Location</th>
                  <th className="text-left py-2 px-2 font-medium">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {assetDetails.slice(0, 50).map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-muted/25">
                    <td className="py-2 px-2 font-mono text-xs">{asset.itemCode}</td>
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{asset.description}</p>
                        {asset.serialNumber && (
                          <p className="text-xs text-muted-foreground">
                            SN: {asset.serialNumber}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">
                        {asset.category}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Badge className={getStatusColor(asset.status)} variant="secondary">
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right font-medium">
                      {asset.purchasePrice ? formatCurrency(asset.purchasePrice) : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-left">
                      {asset.location || 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-left">
                      {asset.assignedTo || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assetDetails.length > 50 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Showing first 50 assets. Export full report for complete data.</p>
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
          Asset Management System - Asset Report #{report.reportId}
        </p>
      </div>
    </div>
  );
}