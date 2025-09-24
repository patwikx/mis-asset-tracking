// app/(dashboard)/[businessUnitId]/employees/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { EmployeesPage } from '@/components/employees/employees-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employees | Asset Management System',
  description: 'Manage your organization\'s employees and staff members',
};

interface EmployeesPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Employees({ params }: EmployeesPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <EmployeesPage />;
}