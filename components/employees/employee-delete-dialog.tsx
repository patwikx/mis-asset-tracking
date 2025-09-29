/* eslint-disable @typescript-eslint/no-unused-vars */
// components/employees/employee-delete-dialog.tsx
'use client'

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EmployeeWithRelations } from '@/types/employee-types';
import { deleteEmployee } from '@/lib/actions/employee-actions';

interface EmployeeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeWithRelations | null;
  onSuccess: () => void;
}

export const EmployeeDeleteDialog: React.FC<EmployeeDeleteDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!employee) return;

    setIsLoading(true);
    try {
      const result = await deleteEmployee(employee.id);
      
      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
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
          <AlertDialogTitle>Delete Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete employee &quot;{employee?.firstName} {employee?.lastName}&quot; ({employee?.employeeId})?
            This action cannot be undone and will deactivate the employee record.
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
            Delete Employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};