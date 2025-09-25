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

export default async function Employees() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <EmployeesPage />;
}