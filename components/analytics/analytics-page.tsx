// components/analytics/analytics-page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Calendar } from 'lucide-react';
import { getAnalyticsData } from '@/lib/actions/analytics-actions';
import type { AnalyticsData } from '@/types/report-types';

interface AnalyticsPageProps {
  businessUnitId: string;
}

export function AnalyticsPage({ businessUnitId }: AnalyticsPageProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnitId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsData(businessUnitId);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  const totalAssets = analyticsData.utilizationRate.deployed + 
                    analyticsData.utilizationRate.available + 
                    analyticsData.utilizationRate.maintenance + 
                    analyticsData.utilizationRate.retired;

  const utilizationPercentage = totalAssets > 0 
    ? (analyticsData.utilizationRate.deployed / totalAssets) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">View system analytics and insights</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+5.2% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deployed Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.utilizationRate.deployed}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{utilizationPercentage.toFixed(1)}% utilization</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.utilizationRate.available}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 mr-1" />
              <span>Ready for deployment</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.categoryDistribution.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4 mr-1" />
              <span>Asset categories</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Trends (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Asset trend chart will be displayed here</p>
              <p className="text-sm">Integration with charting library needed</p>
            </div>
            
            {/* Simple data display for now */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {analyticsData.assetTrends.slice(-3).map((trend, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <h4 className="font-medium">{trend.date}</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Total: {trend.totalAssets}</p>
                    <p>Deployed: {trend.deployedAssets}</p>
                    <p>Available: {trend.availableAssets}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.categoryDistribution.map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }}
                    />
                    <span className="font-medium">{category.category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{category.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{utilizationPercentage.toFixed(1)}%</div>
                <p className="text-muted-foreground">Overall Utilization Rate</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Deployed</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (analyticsData.utilizationRate.deployed / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{analyticsData.utilizationRate.deployed}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Available</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (analyticsData.utilizationRate.available / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{analyticsData.utilizationRate.available}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Maintenance</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-yellow-500 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (analyticsData.utilizationRate.maintenance / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{analyticsData.utilizationRate.maintenance}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Retired</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-gray-500 rounded-full"
                        style={{ width: `${totalAssets > 0 ? (analyticsData.utilizationRate.retired / totalAssets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{analyticsData.utilizationRate.retired}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-4 text-muted-foreground">
              <PieChart className="h-12 w-12 mx-auto mb-4" />
              <p>Deployment activity chart will be displayed here</p>
            </div>
            
            {/* Simple data display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.deploymentTrends.slice(-3).map((trend, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <h4 className="font-medium">{trend.date}</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>New Deployments: {trend.newDeployments}</p>
                    <p>Returns: {trend.returns}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}