// app/(dashboard)/[businessUnitId]/deployments/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getDeploymentById } from '@/lib/actions/deployment-actions';
import { DeploymentDetailPage } from '@/components/deployments/deployment-detail-page';

export const metadata: Metadata = {
  title: 'Deployment Details | Asset Management System',
  description: 'View and manage deployment details',
};

interface DeploymentDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function DeploymentDetail({ params }: DeploymentDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const deployment = await getDeploymentById(id);
    
    if (!deployment) {
      notFound();
    }

    // Verify the deployment belongs to the current business unit
    if (deployment.businessUnitId !== businessUnitId) {
      notFound();
    }

    return (
      <DeploymentDetailPage 
        deployment={deployment} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching deployment:', error);
    notFound();
  }
}