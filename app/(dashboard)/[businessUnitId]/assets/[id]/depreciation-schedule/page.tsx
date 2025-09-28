// app/(dashboard)/[businessUnitId]/assets/[id]/depreciation-schedule/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAssetById } from '@/lib/actions/asset-actions';
import { serializeAssetWithRelations } from '@/lib/utils/serialization';
import { DepreciationSchedulePage } from '@/components/assets/depreciation/depreciation-schedule-page';

export const metadata: Metadata = {
  title: 'Depreciation Schedule | Asset Management System',
  description: 'View asset depreciation schedule',
};

interface DepreciationSchedulePageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function DepreciationSchedule({ params }: DepreciationSchedulePageProps) {
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

    // Serialize the asset data before passing to client component
    const serializedAsset = serializeAssetWithRelations(asset);

    return (
      <DepreciationSchedulePage
        asset={serializedAsset}
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching asset:', error);
    notFound();
  }
}