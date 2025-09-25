// app/(dashboard)/[businessUnitId]/assets/deployments/create/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CreateDeploymentPage } from '@/components/deployments/create-deployment-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Deployment | Asset Management System',
  description: 'Create new asset deployments',
};

export default async function CreateDeployment() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <CreateDeploymentPage />;
}