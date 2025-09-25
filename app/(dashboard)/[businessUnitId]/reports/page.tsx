// app/(dashboard)/[businessUnitId]/reports/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReportsPage } from '@/components/reports/reports-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports | Asset Management System',
  description: 'Generate and view system reports',
};

interface ReportsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Reports({ params }: ReportsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <ReportsPage businessUnitId={businessUnitId} />;
}