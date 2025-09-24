// components/dashboard/stats-cards.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  Users, 
  BarChart3, 
  FileText, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import type { DashboardStats } from '@/types/dashboard-types';

interface StatsCardsProps {
  stats: DashboardStats;
}

interface StatCardProps {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  isAlert?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  isAlert = false 
}) => {
  const formatValue = (val: number): string => {
    return val.toLocaleString();
  };

  const getChangeColor = (changeValue: number): string => {
    if (isAlert) {
      return changeValue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
    }
    return changeValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getChangePrefix = (changeValue: number): string => {
    return changeValue > 0 ? '+' : '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <p className={`text-xs ${getChangeColor(change)}`}>
          {getChangePrefix(change)}{change}% from last month
        </p>
      </CardContent>
    </Card>
  );
};

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Total Assets"
        value={stats.totalAssets}
        change={stats.totalAssetsChange}
        icon={Package}
      />
      
      <StatCard
        title="Active Employees"
        value={stats.activeEmployees}
        change={stats.activeEmployeesChange}
        icon={Users}
      />

      <StatCard
        title="Active Deployments"
        value={stats.activeDeployments}
        change={stats.activeDeploymentsChange}
        icon={BarChart3}
      />

      <StatCard
        title="Pending Approvals"
        value={stats.pendingApprovals}
        change={stats.pendingApprovalsChange}
        icon={Clock}
        isAlert
      />

      <StatCard
        title="Maintenance Alerts"
        value={stats.maintenanceAlerts}
        change={0}
        icon={AlertTriangle}
        isAlert
      />

      <StatCard
        title="Reports Generated"
        value={stats.reportsGenerated}
        change={stats.reportsChange}
        icon={FileText}
      />
    </div>
  );
};