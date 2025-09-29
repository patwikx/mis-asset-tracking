// components/reports/reports-page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, FileText, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getReports, createReport } from '@/lib/actions/report-actions';
import type { Report, ReportFilters, ReportType } from '@/types/report-types';
import { toast } from 'sonner';

interface ReportsPageProps {
  businessUnitId: string;
}

export function ReportsPage({ businessUnitId }: ReportsPageProps) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({});

  useEffect(() => {
    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnitId, filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await getReports(businessUnitId, filters);
      setReports(result.data);
    } catch (error) {
      toast.error(`Error loading reports: ${error}`)
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleGenerateReport = async (type: ReportType) => {
    try {
      const reportData = {
        name: `${type.replace('_', ' ')} Report - ${new Date().toLocaleDateString()}`,
        description: `Auto-generated ${type.replace('_', ' ').toLowerCase()} report`,
        type,
        parameters: {},
        businessUnitId
      };

      await createReport(reportData);
      loadReports(); // Refresh the list
    } catch (error) {
      toast.error(`Error generating report: ${error}`)
    }
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

  const handleReportClick = (reportId: string) => {
    router.push(`/${businessUnitId}/reports/${reportId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and view system reports</p>
        </div>
      </div>

      {/* Quick Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleGenerateReport('ASSET_INVENTORY' as ReportType)}
            >
              <FileText className="h-6 w-6 mb-2" />
              Asset Inventory
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleGenerateReport('DEPLOYMENT_SUMMARY' as ReportType)}
            >
              <FileText className="h-6 w-6 mb-2" />
              Deployment Summary
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleGenerateReport('EMPLOYEE_ASSETS' as ReportType)}
            >
              <FileText className="h-6 w-6 mb-2" />
              Employee Assets
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => handleGenerateReport('FINANCIAL_SUMMARY' as ReportType)}
            >
              <FileText className="h-6 w-6 mb-2" />
              Financial Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Generated Reports</CardTitle>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found. Generate your first report above.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleReportClick(report.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{report.name}</h3>
                        <Badge className={getReportTypeColor(report.type)}>
                          {report.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <p>Generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
                        <p>By: {report.generatedBy}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}