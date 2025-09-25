// app/(dashboard)/[businessUnitId]/analytics/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AnalyticsPage } from '@/components/analytics/analytics-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Asset Management System',
  description: 'View system analytics and insights',
};

interface AnalyticsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Analytics({ params }: AnalyticsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <AnalyticsPage businessUnitId={businessUnitId} />;
}