// app/(dashboard)/[businessUnitId]/assets/disposals/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { AssetDisposalsPage } from '@/components/assets/asset-disposals-page';

export const metadata: Metadata = {
  title: 'Asset Disposals - MIS Asset Tracking',
  description: 'Manage asset disposals and end-of-life processing'
};

interface AssetDisposalsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AssetDisposals({ params }: AssetDisposalsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <AssetDisposalsPage businessUnitId={businessUnitId} />;
}