// app/(dashboard)/[businessUnitId]/assets/bulk-create/page.tsx

import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { BulkAssetCreationPage } from '@/components/assets/bulk-create-asset-page';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Bulk Create Assets - MIS Asset Tracking',
  description: 'Create multiple assets at once with CSV import and batch processing'
};

interface BulkCreateAssetPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function BulkCreateAsset({ params }: BulkCreateAssetPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <BulkAssetCreationPage businessUnitId={businessUnitId} />;
}