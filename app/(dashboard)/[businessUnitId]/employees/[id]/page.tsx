// app/(dashboard)/[businessUnitId]/employees/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getEmployeeById } from '@/lib/actions/employee-actions';
import { EmployeeDetailPage } from '@/components/employees/employee-detail-page';

export const metadata: Metadata = {
  title: 'Employee Details | Asset Management System',
  description: 'View and manage employee details',
};

interface EmployeeDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function EmployeeDetail({ params }: EmployeeDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const employee = await getEmployeeById(id);
    
    if (!employee) {
      notFound();
    }

    // Verify the employee belongs to the current business unit
    if (employee.businessUnitId !== businessUnitId) {
      notFound();
    }

    return (
      <EmployeeDetailPage 
        employee={employee} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching employee:', error);
    notFound();
  }
}