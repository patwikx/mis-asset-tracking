// components/depreciation/depreciation-report-viewer.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Printer, 
  FileText, 
  BarChart3,
  Package,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import type { DepreciationReportData } from '@/types/depreciation-reports-types';

interface DepreciationReportViewerProps {
  report: DepreciationReportData;
  onExport: (format: 'PDF' | 'EXCEL' | 'CSV') => void;
  onPrint: () => void;
  isExporting?: boolean;
}

export function DepreciationReportViewer({ 
  report, 
  onExport, 
  onPrint,
  isExporting = false
}: DepreciationReportViewerProps) {
  const { summary, assetDetails, methodBreakdown, categoryBreakdown } = report;

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'STRAIGHT_LINE':
        return 'bg-blue-100 text-blue-800';
      case 'DECLINING_BALANCE':
        return 'bg-green-100 text-green-800';
      case 'UNITS_OF_PRODUCTION':
        return 'bg-purple-100 text-purple-800';
      case 'SUM_OF_YEARS_DIGITS':
        return 'bg-orange-100 text-orange-800';
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
    <div className="space-y-6 print:space-y-4" id="depreciation-report">
      {/* Report Header */}
      <div className="flex items-center justify-between print:block">
        <div className="print:text-center print:mb-6">
          <h1 className="text-2xl font-bold flex items-center print:justify-center">
            <FileText className="h-6 w-6 mr-2 print:hidden" />
            Asset Depreciation Report
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="text-center">
              <div className="text-xl font-bold">{summary.totalAssets}</div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatCurrency(summary.totalOriginalValue)}</div>
              <p className="text-sm text-muted-foreground">Original Value</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatCurrency(summary.totalCurrentBookValue)}</div>
              <p className="text-sm text-muted-foreground">Current Value</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{formatCurrency(summary.totalAccumulatedDepreciation)}</div>
              <p className="text-sm text-muted-foreground">Total Depreciated</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="text-center">
              <div className="text-lg font-semibold">{formatPercentage(summary.depreciationRate)}</div>
              <p className="text-sm text-muted-foreground">Depreciation Rate</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{summary.averageAssetAge.toFixed(1)} months</div>
              <p className="text-sm text-muted-foreground">Average Asset Age</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatCurrency(summary.totalMonthlyDepreciation)}</div>
              <p className="text-sm text-muted-foreground">Monthly Depreciation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method Breakdown */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle>Depreciation by Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {methodBreakdown.map((method, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className={getMethodColor(method.method)}>
                      {method.method.replace('_', ' ')}
                    </Badge>
                    <span className="font-medium">{method.assetCount} assets</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatPercentage(method.averageDepreciationRate)} avg. rate
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Value</p>
                    <p className="font-medium">{formatCurrency(method.totalOriginalValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Value</p>
                    <p className="font-medium">{formatCurrency(method.totalCurrentValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Depreciation</p>
                    <p className="font-medium">{formatCurrency(method.totalDepreciation)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader>
          <CardTitle>Depreciation by Category</CardTitle>
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
                    Avg. age: {category.averageAssetAge.toFixed(1)} months
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Value</p>
                    <p className="font-medium">{formatCurrency(category.totalOriginalValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Value</p>
                    <p className="font-medium">{formatCurrency(category.totalCurrentValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Depreciation</p>
                    <p className="font-medium">{formatCurrency(category.totalDepreciation)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-left py-2 px-2 font-medium">Asset Code</th>
                  <th className="text-left py-2 px-2 font-medium">Description</th>
                  <th className="text-left py-2 px-2 font-medium">Category</th>
                  <th className="text-right py-2 px-2 font-medium">Purchase Price</th>
                  <th className="text-right py-2 px-2 font-medium">Current Value</th>
                  <th className="text-right py-2 px-2 font-medium">Depreciation</th>
                  <th className="text-center py-2 px-2 font-medium">Method</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {assetDetails.slice(0, 50).map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-muted/25">
                    <td className="py-2 px-2 font-mono text-xs">{asset.itemCode}</td>
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{asset.description}</p>
                        {asset.assignedTo && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {asset.assignedTo}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">
                        {asset.category}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right font-medium">
                      {formatCurrency(asset.purchasePrice)}
                    </td>
                    <td className="py-2 px-2 text-right font-medium">
                      {formatCurrency(asset.currentBookValue)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div>
                        <p className="font-medium">{formatCurrency(asset.accumulatedDepreciation)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(asset.depreciationRate)}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Badge className={getMethodColor(asset.depreciationMethod)} variant="secondary">
                        {asset.depreciationMethod.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {asset.isFullyDepreciated ? (
                        <Badge variant="secondary">Fully Depreciated</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
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
          Asset Management System - Depreciation Report #{report.reportId}
        </p>
      </div>
    </div>
  );
}