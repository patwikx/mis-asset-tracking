// components/user-profile-logout.tsx
'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function UserProfileLogout() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/sign-in' });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );
}