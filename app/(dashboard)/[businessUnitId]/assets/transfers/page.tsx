// app/(dashboard)/[businessUnitId]/assets/transfers/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { AssetTransfersPage } from '@/components/assets/asset-transfers-page';

export const metadata: Metadata = {
  title: 'Asset Transfers - MIS Asset Tracking',
  description: 'Manage inter-business unit asset transfers and approvals'
};

interface AssetTransfersPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AssetTransfers({ params }: AssetTransfersPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <AssetTransfersPage businessUnitId={businessUnitId} />;
}