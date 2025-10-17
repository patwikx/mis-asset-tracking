// app/(dashboard)/[businessUnitId]/assets/disposals/bulk/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { BulkAssetDisposalPage } from '@/components/assets/bulk-asset-disposal-page';

export const metadata: Metadata = {
  title: 'Bulk Asset Disposal - MIS Asset Tracking',
  description: 'Dispose multiple assets at once with bulk processing'
};

interface BulkAssetDisposalPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function BulkAssetDisposal({ params }: BulkAssetDisposalPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <BulkAssetDisposalPage businessUnitId={businessUnitId} />;
}