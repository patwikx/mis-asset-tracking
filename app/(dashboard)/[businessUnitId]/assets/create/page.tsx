// app/(dashboard)/[businessUnitId]/assets/create/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { CreateAssetPage } from '@/components/assets/create-asset-page';


export const metadata: Metadata = {
  title: 'Create Asset | Asset Management System',
  description: 'Create a new asset in the system',
};

interface CreateAssetPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function CreateAsset({ params }: CreateAssetPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <CreateAssetPage businessUnitId={businessUnitId} />;
}