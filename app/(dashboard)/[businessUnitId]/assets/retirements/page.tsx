// app/(dashboard)/[businessUnitId]/assets/retirements/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { AssetRetirementsPage } from '@/components/assets/asset-retirements-page';

export const metadata: Metadata = {
  title: 'Asset Retirements - MIS Asset Tracking',
  description: 'Manage asset retirement workflow and end-of-life processing'
};

interface AssetRetirementsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AssetRetirements({ params }: AssetRetirementsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <AssetRetirementsPage businessUnitId={businessUnitId} />;
}