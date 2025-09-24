// components/dashboard/dashboard-charts.tsx
"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import type { 
  AssetByCategoryChart, 
  DeploymentTrendChart, 
  TopAssetsChart 
} from '@/types/dashboard-types';

interface DashboardChartsProps {
  assetsByCategory: AssetByCategoryChart[];
  deploymentTrends: DeploymentTrendChart[];
  topAssets: TopAssetsChart[];
}

// Color palette for charts (works well with both light and dark themes)
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

// Custom tooltip component for line chart
const CustomLineTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip component for bar chart
const CustomBarTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TopAssetsChart;
  }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white shadow-lg">
        <p className="font-medium mb-1">{data.description}</p>
        <p style={{ color: '#82ca9d' }}>Category: {data.category}</p>
        <p style={{ color: '#8884d8' }}>Deployments: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip component for pie chart
const CustomPieTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: AssetByCategoryChart;
  }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white shadow-lg">
        <p className="font-medium">{data.category}</p>
        <p className="text-blue-400">Count: {data.count}</p>
        <p className="text-green-400">Percentage: {data.percentage}%</p>
      </div>
    );
  }
  return null;
};

interface AssetsByCategoryProps {
  data: AssetByCategoryChart[];
}

const AssetsByCategory: React.FC<AssetsByCategoryProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets by Category</CardTitle>
          <CardDescription>Distribution of assets across categories</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by Category</CardTitle>
        <CardDescription>Distribution of assets across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface DeploymentTrendsProps {
  data: DeploymentTrendChart[];
}

const DeploymentTrends: React.FC<DeploymentTrendsProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployment Trends</CardTitle>
          <CardDescription>Monthly deployment and return trends</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment Trends</CardTitle>
        <CardDescription>Monthly deployment and return trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="deployments" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Deployments"
              />
              <Line 
                type="monotone" 
                dataKey="returns" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Returns"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface TopAssetsProps {
  data: TopAssetsChart[];
}

const TopAssets: React.FC<TopAssetsProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Deployed Assets</CardTitle>
          <CardDescription>Assets with the highest deployment frequency</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Most Deployed Assets</CardTitle>
        <CardDescription>Assets with the highest deployment frequency</CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="h-[300px] w-full overflow-visible relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 8)} // Show top 8 assets
              layout="horizontal"
              margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="description" 
                type="category" 
                tick={{ fontSize: 10 }}
                width={120}
              />
              <Tooltip 
                content={<CustomBarTooltip />}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }}
              />
              <Bar 
                dataKey="deploymentCount" 
                fill="#8884d8"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  assetsByCategory,
  deploymentTrends,
  topAssets
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-visible">
      <AssetsByCategory data={assetsByCategory} />
      <DeploymentTrends data={deploymentTrends} />
      <TopAssets data={topAssets} />
    </div>
  );
};