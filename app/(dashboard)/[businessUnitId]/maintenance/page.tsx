// app/(dashboard)/[businessUnitId]/maintenance/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { MaintenancePage } from '@/components/maintenance/maintenance-page';

export const metadata: Metadata = {
  title: 'Asset Maintenance | Asset Management System',
  description: 'Manage asset maintenance records and schedules',
};


export default async function Maintenance() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }


  return <MaintenancePage />;
}