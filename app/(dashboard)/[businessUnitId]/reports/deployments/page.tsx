// app/(dashboard)/[businessUnitId]/reports/deployments/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { DeploymentReportsPage } from '@/components/reports/deployment-reports-page';

export const metadata: Metadata = {
  title: 'Deployment Reports | Asset Management System',
  description: 'Generate and view deployment-related reports',
};

interface DeploymentReportsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function DeploymentReports({ params }: DeploymentReportsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <DeploymentReportsPage businessUnitId={businessUnitId} />;
}