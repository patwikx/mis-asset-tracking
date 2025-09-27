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

interface AssetDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetWithRelations | null;
  onSuccess: () => void;
  // Add optional override props for non-asset usage
  customTitle?: string;
  customDescription?: string;
  customItemName?: string;
  customItemCode?: string;
  customWarning?: string;
  customOnDelete?: () => Promise<void>;
}

export const AssetDeleteDialog: React.FC<AssetDeleteDialogProps> = ({
  open,
  onOpenChange,
  asset,
  onSuccess,
  customTitle,
  customDescription,
  customItemName,
  customItemCode,
  customWarning,
  customOnDelete
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      if (customOnDelete) {
        await customOnDelete();
      } else if (asset) {
        const { deleteAsset } = await import('@/lib/actions/asset-actions');
        const result = await deleteAsset(asset.id);
        
        if (result.success) {
          toast.success(result.message);
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const title = customTitle || 'Delete Asset';
  const itemName = customItemName || asset?.description || '';
  const itemCode = customItemCode || asset?.itemCode || '';
  const description = customDescription || 'This action cannot be undone. The asset will be marked as inactive and will no longer appear in your asset list.';
  const warning = customWarning || (asset?.deployments && asset.deployments.length > 0 ? 'This asset has deployment history. Make sure there are no active deployments before deleting.' : undefined);

  if (!asset && !customOnDelete) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{itemName}</strong>
              {itemCode && ` (${itemCode})`}?
            </p>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
            {warning && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> {warning}
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};