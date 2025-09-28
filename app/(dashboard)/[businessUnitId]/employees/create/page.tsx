// app/(dashboard)/[businessUnitId]/employees/create/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { CreateEmployeePage } from '@/components/employees/create-employee-page';

export const metadata: Metadata = {
  title: 'Create Employee | Asset Management System',
  description: 'Add a new employee to the system',
};

interface CreateEmployeePageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function CreateEmployee({ params }: CreateEmployeePageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <CreateEmployeePage businessUnitId={businessUnitId} />;
}