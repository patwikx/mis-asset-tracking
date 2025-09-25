// components/roles/role-delete-dialog.tsx
'use client'

import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RoleWithCounts } from '@/types/role-types';
import { deleteRole } from '@/lib/actions/role-actions';

interface RoleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleWithCounts | null;
  onSuccess: () => void;
}

export const RoleDeleteDialog: React.FC<RoleDeleteDialogProps> = ({
  open,
  onOpenChange,
  role,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!role) return;

    setIsLoading(true);
    try {
      const result = await deleteRole(role.id);
      
      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete role &quot;{role?.name}&quot; ({role?.code})?
            This action cannot be undone and will deactivate the role record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};