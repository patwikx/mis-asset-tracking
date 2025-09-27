// components/depreciation/depreciation-dashboard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingDown, TriangleAlert as AlertTriangle, FileText, Download, Calendar, DollarSign, ChartBar as BarChart3, Clock, CircleCheck as CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  getDepreciationDashboardData,
  batchCalculateDepreciation,
} from '@/lib/actions/depreciation-reports-actions';
import { 
  getDepreciationReportData, 
  generateDepreciationExcel, 
  generateDepreciationCSV 
} from '@/lib/actions/depreciation-export-actions';
import { generateDepreciationPDF } from '@/lib/utils/pdf-generator';
import type {
  DepreciationSummaryData,
  DepreciationAlert
} from '@/types/depreciation-reports-types';

interface DepreciationDashboardProps {
  businessUnitId: string;
}

export function DepreciationDashboard({ businessUnitId }: DepreciationDashboardProps) {
  const [dashboardData, setDashboardData] = useState<{
    summary: DepreciationSummaryData;
    alerts: DepreciationAlert[];
    recentCalculations: Array<{
      id: string;
      assetCode: string;
      assetDescription: string;
      depreciationAmount: number;
      calculationDate: Date;
      method: string;
    }>;
    upcomingCalculations: Array<{
      id: string;
      assetCode: string;
      assetDescription: string;
      nextCalculationDate: Date;
      estimatedDepreciation: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getDepreciationDashboardData(businessUnitId);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading depreciation dashboard:', error);
      toast.error('Failed to load depreciation data');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleBatchCalculation = async () => {
    setIsBatchProcessing(true);
    try {
      const result = await batchCalculateDepreciation(businessUnitId);
      
      if (result.success) {
        toast.success(result.message);
        loadDashboardData(); // Refresh data
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error in batch calculation:', error);
      toast.error('Failed to process batch depreciation');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleExportReport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    setIsExporting(true);
    try {
      if (format === 'PDF') {
        // For PDF, get the full report data and use client-side generation
        const result = await getDepreciationReportData(businessUnitId);
        
        if (result.success && result.data) {
          generateDepreciationPDF(result.data);
          toast.success('PDF exported successfully');
        } else {
          toast.error(result.message);
        }
      } else {
        // For Excel and CSV, use server-side generation
        let result;
        switch (format) {
          case 'EXCEL':
            result = await generateDepreciationExcel(businessUnitId);
            break;
          case 'CSV':
            result = await generateDepreciationCSV(businessUnitId);
            break;
        }
        
        if (result && result.success) {
          toast.success(result.message);
          if (result.downloadUrl) {
            window.open(result.downloadUrl, '_blank');
          }
        } else {
          toast.error(result?.message || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading depreciation data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Unable to load depreciation data</p>
          <Button onClick={loadDashboardData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { summary, alerts, recentCalculations, upcomingCalculations } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Calculator className="h-6 w-6 mr-2" />
            Depreciation Management
          </h1>
          <p className="text-muted-foreground">
            Comprehensive asset depreciation tracking and reporting
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleExportReport('PDF')}
            disabled={isExporting}
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExportReport('EXCEL')}
            disabled={isExporting}
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Excel
          </Button>
          <Button 
            onClick={handleBatchCalculation}
            disabled={isBatchProcessing}
          >
            {isBatchProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Batch Calculate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAssets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Assets with depreciation tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{summary.totalOriginalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Original purchase value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              Current Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{summary.totalCurrentBookValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current book value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Depreciation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.depreciationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall depreciation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Depreciation Progress</span>
              <span className="text-sm font-medium">{summary.depreciationRate.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(summary.depreciationRate, 100)} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold">₱{summary.totalAccumulatedDepreciation.toLocaleString()}</div>
                <p className="text-muted-foreground">Total Depreciated</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">₱{summary.totalMonthlyDepreciation.toLocaleString()}</div>
                <p className="text-muted-foreground">Monthly Depreciation</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{summary.fullyDepreciatedAssets}</div>
                <p className="text-muted-foreground">Fully Depreciated</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{summary.assetsDueForDepreciation}</div>
                <p className="text-muted-foreground">Due for Calculation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Depreciation Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No depreciation alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        <p className="text-xs mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Asset: {alert.assetCode}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{alerts.length - 5} more alerts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Calculations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalculations.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent calculations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalculations.map((calc) => (
                  <div key={calc.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{calc.assetCode}</p>
                      <p className="text-xs text-muted-foreground">{calc.assetDescription}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(calc.calculationDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        ₱{calc.depreciationAmount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {calc.method.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Calculations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Upcoming Calculations ({upcomingCalculations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingCalculations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming calculations scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingCalculations.map((calc) => (
                <div key={calc.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{calc.assetCode}</p>
                    <p className="text-sm text-muted-foreground">{calc.assetDescription}</p>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {format(new Date(calc.nextCalculationDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ₱{calc.estimatedDepreciation.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Estimated</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleExportReport('PDF')}
              disabled={isExporting}
            >
              <FileText className="h-5 w-5 mb-1" />
              <span className="text-xs">Generate PDF Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleExportReport('EXCEL')}
              disabled={isExporting}
            >
              <Download className="h-5 w-5 mb-1" />
              <span className="text-xs">Export to Excel</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={handleBatchCalculation}
              disabled={isBatchProcessing}
            >
              <Calculator className="h-5 w-5 mb-1" />
              <span className="text-xs">Batch Calculate</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={loadDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mb-1" />
              <span className="text-xs">Refresh Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}