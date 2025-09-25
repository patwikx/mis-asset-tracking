// components/reports/asset-reports-page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download, BarChart3, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createReport } from '@/lib/actions/report-actions';
import { ReportType } from '@/types/report-types';

interface AssetReportsPageProps {
  businessUnitId: string;
}

export function AssetReportsPage({ businessUnitId }: AssetReportsPageProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleBack = () => {
    router.push(`/dashboard/${businessUnitId}/reports`);
  };

  const handleGenerateReport = async (reportType: ReportType, name: string, description: string) => {
    setIsGenerating(reportType);
    try {
      const report = await createReport({
        name,
        description,
        type: reportType,
        parameters: {},
        businessUnitId
      });

      toast.success('Report generated successfully!');
      router.push(`/dashboard/${businessUnitId}/reports/${report.id}`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(null);
    }
  };

  const assetReportTypes = [
    {
      type: ReportType.ASSET_INVENTORY,
      name: 'Asset Inventory Report',
      description: 'Complete inventory of all assets with categories, values, and status',
      icon: Package,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      type: ReportType.ASSET_UTILIZATION,
      name: 'Asset Utilization Report',
      description: 'Analysis of asset usage, deployment rates, and efficiency metrics',
      icon: BarChart3,
      color: 'bg-green-100 text-green-800'
    },
    {
      type: ReportType.FINANCIAL_SUMMARY,
      name: 'Financial Summary Report',
      description: 'Asset values, depreciation, and financial overview',
      icon: FileText,
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      type: ReportType.MAINTENANCE_SCHEDULE,
      name: 'Maintenance Schedule Report',
      description: 'Upcoming maintenance schedules and asset condition tracking',
      icon: FileText,
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Asset Reports</h1>
            <p className="text-muted-foreground">Generate comprehensive asset-related reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assetReportTypes.map((reportType) => {
          const Icon = reportType.icon;
          const isLoading = isGenerating === reportType.type;
          
          return (
            <Card key={reportType.type} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{reportType.name}</CardTitle>
                      <Badge className={reportType.color}>
                        {reportType.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{reportType.description}</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleGenerateReport(
                      reportType.type,
                      reportType.name,
                      reportType.description
                    )}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Deployed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}