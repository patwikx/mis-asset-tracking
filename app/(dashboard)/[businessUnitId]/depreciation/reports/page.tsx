// app/(dashboard)/[businessUnitId]/depreciation/reports/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { DepreciationReportsPage } from '@/components/depreciation';


export const metadata: Metadata = {
  title: 'Depreciation Reports | Asset Management System',
  description: 'Generate and view detailed depreciation reports',
};

interface DepreciationReportsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function DepreciationReports({ params }: DepreciationReportsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <DepreciationReportsPage businessUnitId={businessUnitId} />;
}