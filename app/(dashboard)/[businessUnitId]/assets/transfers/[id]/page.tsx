// app/(dashboard)/[businessUnitId]/assets/transfers/[id]/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { AssetTransferDetailsPage } from '@/components/assets/asset-transfer-details-page';

export const metadata: Metadata = {
  title: 'Asset Transfer Details - MIS Asset Tracking',
  description: 'View and manage asset transfer details'
};

interface AssetTransferDetailsPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function AssetTransferDetails({ params }: AssetTransferDetailsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId, id } = await params;

  return <AssetTransferDetailsPage businessUnitId={businessUnitId} transferId={id} />;
}