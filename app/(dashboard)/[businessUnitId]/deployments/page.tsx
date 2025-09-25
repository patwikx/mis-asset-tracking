// app/(dashboard)/[businessUnitId]/deployments/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DeploymentsPage } from '@/components/deployments/deployments-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deployments | Asset Management System',
  description: 'Manage asset deployments and assignments',
};

interface DeploymentsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Deployments({ params }: DeploymentsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <DeploymentsPage businessUnitId={businessUnitId} />;
}