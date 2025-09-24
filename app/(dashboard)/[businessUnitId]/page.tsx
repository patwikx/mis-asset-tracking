// app/(dashboard)/[businessUnitId]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDashboardData } from '@/lib/actions/dashboard-actions';
import { StatsCards } from '@/components/dashboard/stat-cards';
import { RecentDeployments } from '@/components/dashboard/recent-deployments';
import { SystemAlerts } from '@/components/dashboard/system-alerts';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

interface DashboardPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  try {
    const dashboardData = await getDashboardData(businessUnitId);

    return (
      <div className="space-y-6">
        {/* Dashboard Header */}
        <DashboardHeader 
          userName={session.user.name || 'User'}
          businessUnitName={session.user.businessUnit?.name || 'Unknown'}
        />

        {/* Stats Cards */}
        <StatsCards stats={dashboardData.stats} />

        {/* Quick Actions */}
        <QuickActions 
          businessUnitId={businessUnitId}
          userRole={session.user.role?.code || 'USER'}
        />

        {/* Charts Section */}
        <DashboardCharts 
          assetsByCategory={dashboardData.assetsByCategory}
          deploymentTrends={dashboardData.deploymentTrends}
          topAssets={dashboardData.topAssets}
        />

        {/* Recent Activity Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <RecentDeployments deployments={dashboardData.recentDeployments} />
          <SystemAlerts alerts={dashboardData.systemAlerts} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading dashboard:', error);
    
    return (
      <div className="space-y-6">
        <DashboardHeader 
          userName={session.user.name || 'User'}
          businessUnitName={session.user.businessUnit?.name || 'Unknown'}
        />
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Unable to load dashboard data
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      </div>
    );
  }
}