// app/(dashboard)/[businessUnitId]/system-settings/[id]/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getSystemSettingById } from '@/lib/actions/system-settings-actions';
import { SystemSettingDetailPage } from '@/components/system-settings/system-setting-detail-page';

export const metadata: Metadata = {
  title: 'System Setting Details | Asset Management System',
  description: 'View and manage system setting details',
};

interface SystemSettingDetailPageProps {
  params: Promise<{
    businessUnitId: string;
    id: string;
  }>;
}

export default async function SystemSettingDetail({ params }: SystemSettingDetailPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId, id } = await params;

  try {
    const systemSetting = await getSystemSettingById(id);
    
    if (!systemSetting) {
      notFound();
    }

    return (
      <SystemSettingDetailPage 
        systemSetting={systemSetting} 
        businessUnitId={businessUnitId}
      />
    );
  } catch (error) {
    console.error('Error fetching system setting:', error);
    notFound();
  }
}