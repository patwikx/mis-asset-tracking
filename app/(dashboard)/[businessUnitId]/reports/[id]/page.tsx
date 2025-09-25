// app/(dashboard)/[businessUnitId]/reports/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getReportById } from '@/lib/actions/report-actions';
import { ReportDetailPage } from '@/components/reports/report-detail-page';

export const metadata: Metadata = {
  title: 'Report Details | Asset Management System',
  description: 'View detailed report information',
};

interface ReportDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function ReportDetail({ params }: ReportDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const report = await getReportById(id);
    
    if (!report) {
      notFound();
    }

    // Verify the report belongs to the current business unit
    if (report.businessUnitId !== businessUnitId) {
      notFound();
    }

    return (
      <ReportDetailPage 
        report={report} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching report:', error);
    notFound();
  }
}