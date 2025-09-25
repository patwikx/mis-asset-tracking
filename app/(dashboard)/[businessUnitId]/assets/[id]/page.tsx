// app/(dashboard)/[businessUnitId]/assets/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAssetById } from '@/lib/actions/asset-actions';
import { AssetDetailPage } from '@/components/assets/asset-detail-page';

export const metadata: Metadata = {
  title: 'Asset Details | Asset Management System',
  description: 'View and manage asset details',
};

interface AssetDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function AssetDetail({ params }: AssetDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const asset = await getAssetById(id);
    
    if (!asset) {
      notFound();
    }

    // Verify the asset belongs to the current business unit
    if (asset.businessUnitId !== businessUnitId) {
      notFound();
    }

    return (
      <AssetDetailPage 
        asset={asset} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching asset:', error);
    notFound();
  }
}