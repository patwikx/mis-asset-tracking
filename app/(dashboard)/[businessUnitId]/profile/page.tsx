// app/(dashboard)/[businessUnitId]/profile/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next/types';
import { ProfilePage } from '@/components/profile';


export const metadata: Metadata = {
  title: 'Profile | Asset Management System',
  description: 'View your profile and assigned assets',
};

interface ProfilePageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Profile({ params }: ProfilePageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const { businessUnitId } = await params;

  return <ProfilePage businessUnitId={businessUnitId} user={session.user} />;
}