// app/(dashboard)/[businessUnitId]/audit-logs/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { AuditLogsPage } from '@/components/audit-logs/audit-logs-page';

export const metadata: Metadata = {
  title: 'Audit Logs | Asset Management System',
  description: 'View system audit logs and activity history',
};

interface AuditLogsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function AuditLogs({ params }: AuditLogsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <AuditLogsPage businessUnitId={businessUnitId} />;
}