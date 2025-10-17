// app/(dashboard)/[businessUnitId]/assets/disposals/create/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { CreateAssetDisposalPage } from '@/components/assets/create-asset-disposal-page';

export const metadata: Metadata = {
  title: 'Create Asset Disposal - MIS Asset Tracking',
  description: 'Create a new asset disposal record'
};

interface CreateAssetDisposalPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function CreateAssetDisposal({ params }: CreateAssetDisposalPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <CreateAssetDisposalPage businessUnitId={businessUnitId} />;
}