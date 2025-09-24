// app/(dashboard)/[businessUnitId]/system-settings/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SystemSettingsPage } from '@/components/system-settings/system-settings-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Settings | Asset Management System',
  description: 'Manage application configuration and settings',
};

interface SystemSettingsPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function SystemSettings({ params }: SystemSettingsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <SystemSettingsPage />;
}