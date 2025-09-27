// app/(dashboard)/[businessUnitId]/depreciation/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { DepreciationDashboard } from '@/components/depreciation/depreciation-dashboard';


export const metadata: Metadata = {
  title: 'Depreciation Management | Asset Management System',
  description: 'Comprehensive asset depreciation tracking and reporting',
};

interface DepreciationPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function DepreciationPage({ params }: DepreciationPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <DepreciationDashboard businessUnitId={businessUnitId} />;
}