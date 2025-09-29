// components/departments/department-delete-dialog.tsx
'use client'

import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DepartmentWithRelations } from '@/types/department-types';
import { deleteDepartment } from '@/lib/actions/department-actions';

interface DepartmentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: DepartmentWithRelations | null;
  onSuccess: () => void;
}

export const DepartmentDeleteDialog: React.FC<DepartmentDeleteDialogProps> = ({
  open,
  onOpenChange,
  department,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!department) return;

    setIsLoading(true);
    try {
      const result = await deleteDepartment(department.id);
      
      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete department &quot;{department?.name}&quot; ({department?.code})?
            This action cannot be undone and will deactivate the department record.
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
            Delete Department
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};