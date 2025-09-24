// app/(dashboard)/[businessUnitId]/assets/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AssetsPage } from '@/components/assets/assets-page';

interface AssetsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Assets({ params }: AssetsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <AssetsPage />;
}