// app/(dashboard)/[businessUnitId]/assets/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AssetsPage } from '@/components/assets/assets-page';



export default async function Assets() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <AssetsPage />;
}