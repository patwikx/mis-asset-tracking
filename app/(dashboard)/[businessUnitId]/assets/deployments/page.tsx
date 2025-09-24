// app/(dashboard)/[businessUnitId]/assets/deployments/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DeploymentsPage } from '@/components/deployments/deployments-page';

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

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <DeploymentsPage />;
}