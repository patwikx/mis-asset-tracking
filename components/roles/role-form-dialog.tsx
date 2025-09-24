// components/roles/role-form-dialog.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RoleWithCounts, CreateRoleData, UpdateRoleData } from '@/types/role-types';
import { createRole, updateRole } from '@/lib/actions/role-actions';

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleWithCounts | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  code: string;
  description: string;
}

export const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  open,
  onOpenChange,
  role,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: ''
  });

  const isEditing = !!role;

  useEffect(() => {
    if (open) {
      if (role) {
        setFormData({
          name: role.name,
          code: role.code,
          description: role.description || ''
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: ''
        });
      }
    }
  }, [open, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined
      };

      let result;
      if (isEditing) {
        result = await updateRole({
          id: role.id,
          ...submitData
        } as UpdateRoleData);
      } else {
        result = await createRole(submitData as CreateRoleData);
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the role information below.' 
              : 'Fill in the details to create a new role.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., Administrator"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Role Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => updateFormData('code', e.target.value)}
              placeholder="e.g., ADMIN"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Role description..."
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
              {isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};