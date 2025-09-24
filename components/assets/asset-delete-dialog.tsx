// components/assets/asset-delete-dialog.tsx
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
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { AssetWithRelations } from '@/types/asset-types';
import { deleteAsset } from '@/lib/actions/asset-actions';

interface AssetDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetWithRelations | null;
  onSuccess: () => void;
}

export const AssetDeleteDialog: React.FC<AssetDeleteDialogProps> = ({
  open,
  onOpenChange,
  asset,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!asset) return;

    setIsLoading(true);
    try {
      const result = await deleteAsset(asset.id);
      
      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete the asset <strong>{asset.description}</strong> 
              ({asset.itemCode})?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The asset will be marked as inactive and 
              will no longer appear in your asset list.
            </p>
            {asset.deployments && asset.deployments.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This asset has deployment history. 
                  Make sure there are no active deployments before deleting.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Asset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};