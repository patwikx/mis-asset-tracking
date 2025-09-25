// app/(dashboard)/[businessUnitId]/roles/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getRoleById } from '@/lib/actions/role-actions';
import { RoleDetailPage } from '@/components/roles/role-detail-page';

export const metadata: Metadata = {
  title: 'Role Details | Asset Management System',
  description: 'View and manage role details and permissions',
};

interface RoleDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function RoleDetail({ params }: RoleDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const role = await getRoleById(id);
    
    if (!role) {
      notFound();
    }

    return (
      <RoleDetailPage 
        role={role} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching role:', error);
    notFound();
  }
}