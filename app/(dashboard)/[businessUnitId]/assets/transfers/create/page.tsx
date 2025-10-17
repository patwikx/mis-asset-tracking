// app/(dashboard)/[businessUnitId]/assets/transfers/create/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { CreateAssetTransferPage } from '@/components/assets/create-asset-transfer-page';

export const metadata: Metadata = {
  title: 'Create Asset Transfer - MIS Asset Tracking',
  description: 'Create a new inter-business unit asset transfer request'
};

interface CreateAssetTransferPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function CreateAssetTransfer({ params }: CreateAssetTransferPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <CreateAssetTransferPage businessUnitId={businessUnitId} />;
}