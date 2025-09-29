// components/system-settings/system-setting-delete-dialog.tsx
'use client'

import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SystemSettingWithRelations } from '@/types/system-settings-types';
import { deleteSystemSetting } from '@/lib/actions/system-settings-actions';

interface SystemSettingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: SystemSettingWithRelations | null;
  onSuccess: () => void;
}

export const SystemSettingDeleteDialog: React.FC<SystemSettingDeleteDialogProps> = ({
  open,
  onOpenChange,
  setting,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!setting) return;

    setIsLoading(true);
    try {
      const result = await deleteSystemSetting(setting.id);
      
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
          <AlertDialogTitle>Delete System Setting</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete system setting &quot;{setting?.key}&quot;?
            This action cannot be undone and will deactivate the setting record.
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
            Delete Setting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};