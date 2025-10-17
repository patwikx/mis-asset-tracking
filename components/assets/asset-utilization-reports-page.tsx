// components/assets/asset-utilization-reports-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Using custom tab implementation instead of @/components/ui/tabs
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getDeploymentRateAnalysis,
  getIdleAssetAnalysis,
  getCostCenterAllocations,
  getAssetROICalculations,
  getAssetUtilizationSummary,
  getUtilizationTrendData
} from '@/lib/actions/asset-utilization-actions';
import type {
  DeploymentRateAnalysis,
  IdleAssetAnalysis,
  CostCenterAllocation,
  ROICalculation,
  AssetUtilizationSummary,
  UtilizationTrendData,
  AssetUtilizationFilters
} from '@/types/asset-utilization-types';

interface AssetUtilizationReportsPageProps {
  businessUnitId: string;
}

// Helper function to get performance color
const getPerformanceColor = (rating: string): string => {
  switch (rating) {
    case 'EXCELLENT':
      return 'bg-green-500';
    case 'GOOD':
      return 'bg-blue-500';
    case 'FAIR':
      return 'bg-yellow-500';
    case 'POOR':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value: number): string => {
  return `${Math.round(value * 10) / 10}%`;
};

export function AssetUtilizationReportsPage({ businessUnitId }: AssetUtilizationReportsPageProps) {

  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [utilizationSummary, setUtilizationSummary] = useState<AssetUtilizationSummary | null>(null);
  const [deploymentAnalysis, setDeploymentAnalysis] = useState<DeploymentRateAnalysis | null>(null);
  const [idleAnalysis, setIdleAnalysis] = useState<IdleAssetAnalysis | null>(null);
  const [costCenterData, setCostCenterData] = useState<CostCenterAllocation[]>([]);
  const [roiData, setRoiData] = useState<ROICalculation[]>([]);
  const [trendData, setTrendData] = useState<UtilizationTrendData[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState<AssetUtilizationFilters>({
    dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    dateTo: new Date()
  });


  const loadUtilizationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, deployment, idle, costCenter, roi, trends] = await Promise.all([
        getAssetUtilizationSummary(businessUnitId, {
          reportType: 'SUMMARY',
          dateRange: {
            startDate: filters.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            endDate: filters.dateTo || new Date()
          }
        }),
        getDeploymentRateAnalysis(businessUnitId, filters),
        getIdleAssetAnalysis(businessUnitId, filters),
        getCostCenterAllocations(businessUnitId, filters),
        getAssetROICalculations(businessUnitId, filters),
        getUtilizationTrendData(businessUnitId, 'LAST_6_MONTHS')
      ]);

      setUtilizationSummary(summary);
      setDeploymentAnalysis(deployment);
      setIdleAnalysis(idle);
      setCostCenterData(costCenter);
      setRoiData(roi);
      setTrendData(trends);
    } catch (error) {
      toast.error('Failed to load utilization data');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters]);

  useEffect(() => {
    loadUtilizationData();
  }, [loadUtilizationData]);

  const handleFiltersChange = (newFilters: Partial<AssetUtilizationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExportReport = () => {
    // TODO: Implement PDF export functionality
    toast.info('Export functionality coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Asset Utilization Reports</h1>
            <p className="text-muted-foreground">Analyze deployment rates, idle assets, cost allocations, and ROI</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadUtilizationData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date: Date | undefined) => handleFiltersChange({ dateFrom: date })}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date: Date | undefined) => handleFiltersChange({ dateTo: date })}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Utilization Threshold</Label>
              <Select 
                value={filters.utilizationThreshold?.toString() || ''} 
                onValueChange={(value) => handleFiltersChange({ 
                  utilizationThreshold: value ? parseInt(value) : undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-assets">All Assets</SelectItem>
                  <SelectItem value="25">Below 25%</SelectItem>
                  <SelectItem value="50">Below 50%</SelectItem>
                  <SelectItem value="75">Below 75%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card> 
     {/* Overview Metrics */}
      {utilizationSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{utilizationSummary.overallMetrics.totalAssets}</div>
              <p className="text-xs text-muted-foreground">
                Value: {formatCurrency(utilizationSummary.overallMetrics.totalAssetValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(utilizationSummary.overallMetrics.averageUtilizationRate)}
              </div>
              <Progress 
                value={utilizationSummary.overallMetrics.averageUtilizationRate} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Idle Assets</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{utilizationSummary.overallMetrics.totalIdleAssets}</div>
              <p className="text-xs text-muted-foreground">
                Value: {formatCurrency(utilizationSummary.overallMetrics.totalIdleValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${utilizationSummary.overallMetrics.averageROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(utilizationSummary.overallMetrics.averageROI)}
              </div>
              <p className="text-xs text-muted-foreground">
                Return on Investment
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Reports Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'deployment', label: 'Deployment Analysis' },
              { id: 'idle', label: 'Idle Assets' },
              { id: 'cost-center', label: 'Cost Centers' },
              { id: 'roi', label: 'ROI Analysis' }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'overview' && (
            <div className="space-y-6">
          {/* Recommendations */}
          {utilizationSummary?.recommendations && utilizationSummary.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {utilizationSummary.recommendations.map((rec, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{rec.description}</h4>
                      <Badge variant={rec.priority === 'HIGH' ? 'destructive' : rec.priority === 'MEDIUM' ? 'default' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.estimatedImpact}</p>
                    <ul className="text-sm space-y-1">
                      {rec.actionItems.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center">
                          <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Top and Bottom Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Top Performing Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {utilizationSummary?.topPerformingAssets.slice(0, 5).map((asset) => (
                    <div key={asset.assetId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{asset.itemCode}</div>
                        <div className="text-sm text-muted-foreground">{asset.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatPercentage(asset.financialMetrics.roi)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(asset.deploymentHistory.utilizationRate)} util
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Underperforming Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                  Underperforming Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {utilizationSummary?.underperformingAssets.slice(0, 5).map((asset) => (
                    <div key={asset.assetId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{asset.itemCode}</div>
                        <div className="text-sm text-muted-foreground">{asset.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatPercentage(asset.financialMetrics.roi)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(asset.deploymentHistory.utilizationRate)} util
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-6">
          {deploymentAnalysis && (
            <>
              {/* Deployment Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Deployment Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatPercentage(deploymentAnalysis.deploymentRate)}</div>
                    <p className="text-sm text-muted-foreground">
                      {deploymentAnalysis.deployedAssets} of {deploymentAnalysis.totalAssets} assets deployed
                    </p>
                    <Progress value={deploymentAnalysis.deploymentRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Avg Deployment Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{Math.round(deploymentAnalysis.averageDeploymentDuration)}</div>
                    <p className="text-sm text-muted-foreground">days per deployment</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Available Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{deploymentAnalysis.availableAssets}</div>
                    <p className="text-sm text-muted-foreground">ready for deployment</p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Deployment by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deploymentAnalysis.categoryBreakdown.map((category) => (
                      <div key={category.categoryId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category.categoryName}</span>
                          <span className="text-sm text-muted-foreground">
                            {category.deployedAssets}/{category.totalAssets} ({formatPercentage(category.deploymentRate)})
                          </span>
                        </div>
                        <Progress value={category.deploymentRate} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
            </div>
          )}

          {activeTab === 'idle' && (
            <div className="space-y-6">
          {idleAnalysis && (
            <>
              {/* Idle Asset Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Idle Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{idleAnalysis.totalIdleAssets}</div>
                    <p className="text-sm text-muted-foreground">
                      Value: {formatCurrency(idleAnalysis.idleAssetValue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Idle by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {idleAnalysis.idleByCategory.slice(0, 3).map((category) => (
                        <div key={category.categoryName} className="flex justify-between">
                          <span className="text-sm">{category.categoryName}</span>
                          <span className="text-sm font-medium">{category.idleCount}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        idleAnalysis.idleAssets.reduce((acc, asset) => {
                          acc[asset.recommendedAction] = (acc[asset.recommendedAction] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([action, count]) => (
                        <div key={action} className="flex justify-between">
                          <span className="text-sm">{action.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Idle Assets Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Idle Assets Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Days Idle</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Recommended Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {idleAnalysis.idleAssets.slice(0, 10).map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{asset.itemCode}</div>
                                <div className="text-sm text-muted-foreground">{asset.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>{asset.daysSinceLastDeployment}</TableCell>
                            <TableCell>{formatCurrency(asset.currentBookValue)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {asset.idleReason.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={asset.recommendedAction === 'RETIRE' ? 'destructive' : 'default'}>
                                {asset.recommendedAction}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
            </div>
          )}

          {activeTab === 'cost-center' && (
            <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Center Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Center</TableHead>
                      <TableHead>Assets</TableHead>
                      <TableHead>Asset Value</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Monthly Costs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterData.map((center) => (
                      <TableRow key={center.costCenterId}>
                        <TableCell className="font-medium">{center.costCenterName}</TableCell>
                        <TableCell>{center.totalAssets}</TableCell>
                        <TableCell>{formatCurrency(center.totalAssetValue)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={center.utilizationRate} className="flex-1" />
                            <span className="text-sm">{formatPercentage(center.utilizationRate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(center.allocatedCosts.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
            </div>
          )}

          {activeTab === 'roi' && (
            <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roiData.slice(0, 20).map((asset) => (
                      <TableRow key={asset.assetId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.itemCode}</div>
                            <div className="text-sm text-muted-foreground">{asset.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{formatCurrency(asset.purchasePrice)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={asset.deploymentHistory.utilizationRate} className="flex-1" />
                            <span className="text-sm">{formatPercentage(asset.deploymentHistory.utilizationRate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={asset.financialMetrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercentage(asset.financialMetrics.roi)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPerformanceColor(asset.performanceRating)}>
                            {asset.performanceRating}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}