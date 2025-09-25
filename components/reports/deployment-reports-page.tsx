// components/reports/deployment-reports-page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download, Users, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createReport } from '@/lib/actions/report-actions';
import { ReportType } from '@/types/report-types';

interface DeploymentReportsPageProps {
  businessUnitId: string;
}

export function DeploymentReportsPage({ businessUnitId }: DeploymentReportsPageProps) {
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

  const deploymentReportTypes = [
    {
      type: ReportType.DEPLOYMENT_SUMMARY,
      name: 'Deployment Summary Report',
      description: 'Overview of all deployments, status distribution, and key metrics',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-800'
    },
    {
      type: ReportType.EMPLOYEE_ASSETS,
      name: 'Employee Assets Report',
      description: 'Assets assigned to employees with deployment history',
      icon: Users,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      type: ReportType.AUDIT_TRAIL,
      name: 'Deployment Audit Trail',
      description: 'Complete audit trail of deployment activities and changes',
      icon: FileText,
      color: 'bg-orange-100 text-orange-800'
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
            <h1 className="text-2xl font-bold">Deployment Reports</h1>
            <p className="text-muted-foreground">Generate deployment and assignment reports</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deploymentReportTypes.map((reportType) => {
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
          <CardTitle>Deployment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Active Deployments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Pending Returns</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">Employees</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-</div>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}