// app/(dashboard)/[businessUnitId]/assets/transfers/bulk/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { BulkAssetTransferPage } from '@/components/assets/bulk-asset-transfer-page';

export const metadata: Metadata = {
  title: 'Bulk Asset Transfer - MIS Asset Tracking',
  description: 'Create bulk asset transfers between business units'
};

interface BulkAssetTransferPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function BulkAssetTransfer({ params }: BulkAssetTransferPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <BulkAssetTransferPage businessUnitId={businessUnitId} />;
}