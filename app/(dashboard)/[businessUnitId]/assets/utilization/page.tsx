// app/(dashboard)/[businessUnitId]/assets/utilization/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { AssetUtilizationReportsPage } from '@/components/assets/asset-utilization-reports-page';

export const metadata: Metadata = {
  title: 'Asset Utilization Reports - MIS Asset Tracking',
  description: 'Analyze asset deployment rates, idle assets, cost center allocations, and ROI'
};

interface AssetUtilizationReportsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AssetUtilizationReports({ params }: AssetUtilizationReportsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <AssetUtilizationReportsPage businessUnitId={businessUnitId} />;
}