// app/(dashboard)/[businessUnitId]/assets/categories/page.tsx
import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CategoriesPage } from '@/components/assets/categories/categories-page';

export default async function Categories() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return <CategoriesPage />;
}