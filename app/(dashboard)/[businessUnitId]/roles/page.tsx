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

interface RolesPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Roles({ params }: RolesPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <RolesPage />;
}