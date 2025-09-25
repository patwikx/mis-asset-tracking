// app/(dashboard)/[businessUnitId]/roles/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { RolesPage } from '@/components/roles/roles-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roles | Asset Management System',
  description: 'Manage user roles and permissions',
};

export default async function Roles() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <RolesPage />;
}