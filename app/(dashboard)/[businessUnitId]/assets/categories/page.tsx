// app/(dashboard)/[businessUnitId]/assets/categories/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CategoriesPage } from '@/components/assets/categories/categories-page';

interface CategoriesPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function Categories({ params }: CategoriesPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Await params before using its properties
  const { businessUnitId } = await params;

  return <CategoriesPage />;
}