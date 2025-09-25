// app/(dashboard)/[businessUnitId]/departments/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getDepartmentById } from '@/lib/actions/department-actions';
import { DepartmentDetailPage } from '@/components/departments/department-detail-page';

export const metadata: Metadata = {
  title: 'Department Details | Asset Management System',
  description: 'View and manage department details',
};

interface DepartmentDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function DepartmentDetail({ params }: DepartmentDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const department = await getDepartmentById(id);
    
    if (!department) {
      notFound();
    }

    // Verify the department belongs to the current business unit
    if (department.businessUnitId !== businessUnitId) {
      notFound();
    }

    return (
      <DepartmentDetailPage 
        department={department} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching department:', error);
    notFound();
  }
}