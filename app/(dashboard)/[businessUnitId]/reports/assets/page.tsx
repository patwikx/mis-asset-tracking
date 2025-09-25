// app/(dashboard)/[businessUnitId]/reports/assets/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { AssetReportsPage } from '@/components/reports/asset-reports-page';

export const metadata: Metadata = {
  title: 'Asset Reports | Asset Management System',
  description: 'Generate and view asset-related reports',
};

interface AssetReportsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AssetReports({ params }: AssetReportsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <AssetReportsPage businessUnitId={businessUnitId} />;
}