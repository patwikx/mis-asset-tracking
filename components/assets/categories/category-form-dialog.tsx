// components/assets/categories/category-form-dialog.tsx
'use client'

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { 
  AssetCategoryWithCounts, 
  CreateAssetCategoryData, 
  UpdateAssetCategoryData 
} from '@/types/asset-types';
import { 
  createAssetCategory, 
  updateAssetCategory 
} from '@/lib/actions/asset-category-actions';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AssetCategoryWithCounts | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  code: string;
  description: string;
}

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  onOpenChange,
  category,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: ''
  });

  const isEditing = !!category;

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          name: category.name,
          code: category.code,
          description: category.description || ''
        });
      } else {
        // Reset form for new category
        setFormData({
          name: '',
          code: '',
          description: ''
        });
      }
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isEditing) {
        result = await updateAssetCategory({
          id: category.id,
          ...formData
        } as UpdateAssetCategoryData);
      } else {
        result = await createAssetCategory(formData as CreateAssetCategoryData);
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

  // Auto-generate code from name
  const handleNameChange = (value: string) => {
    updateFormData('name', value);
    
    // Only auto-generate code if we're creating a new category and code is empty
    if (!isEditing && !formData.code) {
      const generatedCode = value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 10);
      updateFormData('code', generatedCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the category information below.' 
              : 'Fill in the details to create a new asset category.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Laptops"
              required
            />
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Category Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => updateFormData('code', e.target.value.toUpperCase())}
              placeholder="e.g., LAPTOP"
              required
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this category (max 10 characters)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Brief description of this category..."
              rows={3}
              required
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
              {isEditing ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};