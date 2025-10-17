// app/(dashboard)/[businessUnitId]/assets/bulk-operations/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { BulkOperationsPage } from '@/components/assets/bulk-operations-page';

export const metadata: Metadata = {
  title: 'Bulk Operations - MIS Asset Tracking',
  description: 'Perform bulk operations on multiple assets including updates, deployments, and returns'
};

interface BulkOperationsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function BulkOperations({ params }: BulkOperationsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { businessUnitId } = await params;

  return <BulkOperationsPage businessUnitId={businessUnitId} />;
}