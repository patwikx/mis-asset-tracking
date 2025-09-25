// components/assets/asset-form-dialog.tsx
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AssetStatus } from '@prisma/client';
import type { 
  AssetWithRelations, 
  CreateAssetData, 
  UpdateAssetData 
} from '@/types/asset-types';
import { 
  createAsset, 
  updateAsset, 
  getAssetCategories,
  getNextItemCode
} from '@/lib/actions/asset-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  itemCode: string;
  description: string;
  serialNumber: string;
  modelNumber: string;
  brand: string;
  purchaseDate: Date | undefined;
  purchasePrice: string;
  warrantyExpiry: Date | undefined;
  categoryId: string;
  quantity: string;
  status: AssetStatus;
  location: string;
  notes: string;
}

export const AssetFormDialog: React.FC<AssetFormDialogProps> = ({
  open,
  onOpenChange,
  asset,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [statuses] = useState<AssetStatus[]>(Object.values(AssetStatus));
  const { businessUnitId } = useBusinessUnit();
  
  const [formData, setFormData] = useState<FormData>({
    itemCode: '',
    description: '',
    serialNumber: '',
    modelNumber: '',
    brand: '',
    purchaseDate: undefined,
    purchasePrice: '',
    warrantyExpiry: undefined,
    categoryId: '',
    quantity: '1',
    status: AssetStatus.AVAILABLE,
    location: '',
    notes: ''
  });

  const isEditing = !!asset;

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset]);

  // Generate item code when category changes (for new assets only)
  useEffect(() => {
    if (!isEditing && formData.categoryId && businessUnitId) {
      generateItemCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.categoryId, businessUnitId, isEditing]);

  const loadFormData = async () => {
    try {
      const categoriesData = await getAssetCategories();
      setCategories(categoriesData);

      if (asset) {
        setFormData({
          itemCode: asset.itemCode,
          description: asset.description,
          serialNumber: asset.serialNumber || '',
          modelNumber: asset.modelNumber || '',
          brand: asset.brand || '',
          purchaseDate: asset.purchaseDate || undefined,
          purchasePrice: asset.purchasePrice?.toString() || '',
          warrantyExpiry: asset.warrantyExpiry || undefined,
          categoryId: asset.categoryId,
          quantity: asset.quantity.toString(),
          status: asset.status,
          location: asset.location || '',
          notes: asset.notes || ''
        });
      } else {
        // Reset form for new asset
        setFormData({
          itemCode: 'Select category to generate',
          description: '',
          serialNumber: '',
          modelNumber: '',
          brand: '',
          purchaseDate: undefined,
          purchasePrice: '',
          warrantyExpiry: undefined,
          categoryId: '',
          quantity: '1',
          status: AssetStatus.AVAILABLE,
          location: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const generateItemCode = async () => {
    if (!businessUnitId || !formData.categoryId) return;
    
    setIsGeneratingCode(true);
    try {
      const nextCode = await getNextItemCode(businessUnitId, formData.categoryId);
      setFormData(prev => ({ ...prev, itemCode: nextCode }));
    } catch (error) {
      console.error('Error generating item code:', error);
      toast.error('Failed to generate item code');
      setFormData(prev => ({ ...prev, itemCode: 'Error generating code' }));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      categoryId,
      // Reset item code when category changes for new assets
      itemCode: isEditing ? prev.itemCode : 'Generating...'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        description: formData.description,
        serialNumber: formData.serialNumber || undefined,
        modelNumber: formData.modelNumber || undefined,
        brand: formData.brand || undefined,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        warrantyExpiry: formData.warrantyExpiry,
        categoryId: formData.categoryId,
        businessUnitId: businessUnitId!,
        quantity: parseInt(formData.quantity),
        status: formData.status,
        location: formData.location || undefined,
        notes: formData.notes || undefined
      };

      let result;
      if (isEditing) {
        result = await updateAsset({
          id: asset.id,
          ...submitData
        } as UpdateAssetData);
      } else {
        // For new assets, let the server generate the item code
        result = await createAsset(submitData as Omit<CreateAssetData, 'itemCode'>);
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

  const updateFormData = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Asset' : 'Create New Asset'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the asset information below.' 
              : 'Fill in the details to create a new asset. The item code will be generated automatically.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Code - Read Only */}
            <div className="space-y-2">
              <Label htmlFor="itemCode">
                Item Code {!isEditing && '*'}
                {!isEditing && (
                  <span className="text-sm text-muted-foreground ml-1">
                    (Auto-generated)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="itemCode"
                  value={formData.itemCode}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder={isEditing ? "" : "Select category to generate"}
                />
                {!isEditing && formData.categoryId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={generateItemCode}
                    disabled={isGeneratingCode}
                    title="Refresh item code"
                  >
                    <RefreshCw className={cn("h-3 w-3", isGeneratingCode && "animate-spin")} />
                  </Button>
                )}
              </div>
              {!isEditing && !formData.categoryId && (
                <p className="text-sm text-muted-foreground">
                  Select a category first to generate the item code
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2 mt-1.5">
              <Label htmlFor="categoryId">Category *</Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={handleCategoryChange}
                required
                disabled={isEditing} // Prevent category change when editing
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-sm text-muted-foreground">
                  Category cannot be changed when editing an asset
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="e.g., MacBook Pro 16-inch M2"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => updateFormData('serialNumber', e.target.value)}
                placeholder="e.g., MBP16M2001"
              />
            </div>

            {/* Model Number */}
            <div className="space-y-2">
              <Label htmlFor="modelNumber">Model Number</Label>
              <Input
                id="modelNumber"
                value={formData.modelNumber}
                onChange={(e) => updateFormData('modelNumber', e.target.value)}
                placeholder="e.g., A2485"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => updateFormData('brand', e.target.value)}
                placeholder="e.g., Apple"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => updateFormData('purchasePrice', e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => updateFormData('quantity', e.target.value)}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => updateFormData('status', value as AssetStatus)}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Date */}
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.purchaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.purchaseDate ? format(formData.purchaseDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.purchaseDate}
                    onSelect={(date: Date | undefined) => updateFormData('purchaseDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Warranty Expiry */}
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.warrantyExpiry && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.warrantyExpiry ? format(formData.warrantyExpiry, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.warrantyExpiry}
                    onSelect={(date: Date | undefined) => updateFormData('warrantyExpiry', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateFormData('location', e.target.value)}
              placeholder="e.g., IT Storage Room"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Additional notes about this asset..."
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
            <Button 
              type="submit" 
              disabled={isLoading || (!isEditing && !formData.categoryId)}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Asset' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};