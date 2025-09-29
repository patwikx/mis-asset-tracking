// components/system-settings/system-setting-form-dialog.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SystemSettingWithRelations, CreateSystemSettingData, UpdateSystemSettingData } from '@/types/system-settings-types';
import { createSystemSetting, updateSystemSetting } from '@/lib/actions/system-settings-actions';

interface SystemSettingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting?: SystemSettingWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  key: string;
  value: string;
  description: string;
  category: string;
}

export const SystemSettingFormDialog: React.FC<SystemSettingFormDialogProps> = ({
  open,
  onOpenChange,
  setting,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    key: '',
    value: '',
    description: '',
    category: ''
  });

  const isEditing = !!setting;

  useEffect(() => {
    if (open) {
      if (setting) {
        setFormData({
          key: setting.key,
          value: setting.value,
          description: setting.description || '',
          category: setting.category || ''
        });
      } else {
        setFormData({
          key: '',
          value: '',
          description: '',
          category: ''
        });
      }
    }
  }, [open, setting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        key: formData.key,
        value: formData.value,
        description: formData.description || undefined,
        category: formData.category || undefined
      };

      let result;
      if (isEditing) {
        result = await updateSystemSetting({
          id: setting.id,
          ...submitData
        } as UpdateSystemSettingData);
      } else {
        result = await createSystemSetting(submitData as CreateSystemSettingData);
      }

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

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit System Setting' : 'Create New System Setting'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the system setting information below.' 
              : 'Fill in the details to create a new system setting.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Setting Key *</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => updateFormData('key', e.target.value)}
              placeholder="e.g., app.name"
              required
              disabled={isEditing} // Don't allow key changes when editing
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Setting Value *</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => updateFormData('value', e.target.value)}
              placeholder="e.g., Asset Management System"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => updateFormData('category', e.target.value)}
              placeholder="e.g., Application"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Setting description..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Setting' : 'Create Setting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};