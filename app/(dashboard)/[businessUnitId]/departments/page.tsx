// app/(dashboard)/[businessUnitId]/departments/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DepartmentsPage } from '@/components/departments/departments-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Departments | Asset Management System',
  description: 'Manage your organization\'s departments and divisions',
};

export default async function Departments() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <DepartmentsPage />;
}