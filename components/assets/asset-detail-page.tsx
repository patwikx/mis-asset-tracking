/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/asset-detail-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, X, CreditCard as Edit, Trash2, Calendar as CalendarIcon, Calculator, DollarSign, Package, Building, User, Clock, FileText, QrCode, Printer, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AssetStatus, DepreciationMethod } from '@prisma/client';
import { QRCode } from '@/components/ui/qr-code';
import { updateAsset, getAssetCategories } from '@/lib/actions/asset-actions';
import { DepreciationCard } from './depreciation/depreciation-card';
import { BatchDepreciationDialog } from '../depreciation/batch-depreciation-dialog';
import { useRouter } from 'next/navigation';
import type { SerializedAssetWithRelations } from '@/lib/utils/serialization';

interface AssetDetailPageProps {
  asset: SerializedAssetWithRelations;
  businessUnitId: string;
}

interface EditFormData {
  description: string;
  serialNumber: string;
  modelNumber: string;
  brand: string;
  purchaseDate: Date | undefined;
  purchasePrice: string;
  warrantyExpiry: Date | undefined;
  quantity: string;
  status: AssetStatus;
  location: string;
  notes: string;
  
  // Depreciation fields
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: string;
  usefulLifeMonths: string;
  salvageValue: string;
  depreciationRate: string;
  totalExpectedUnits: string;
}

export function AssetDetailPage({ asset, businessUnitId }: AssetDetailPageProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBatchDepreciation, setShowBatchDepreciation] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  
  const [formData, setFormData] = useState<EditFormData>({
    description: asset.description,
    serialNumber: asset.serialNumber || '',
    modelNumber: asset.modelNumber || '',
    brand: asset.brand || '',
    purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
    purchasePrice: asset.purchasePrice?.toString() || '',
    warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : undefined,
    quantity: asset.quantity.toString(),
    status: asset.status,
    location: asset.location || '',
    notes: asset.notes || '',
    
    // Depreciation fields
    depreciationMethod: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
    usefulLifeYears: asset.usefulLifeYears?.toString() || '',
    usefulLifeMonths: asset.usefulLifeMonths?.toString() || '',
    salvageValue: asset.salvageValue?.toString() || '0',
    depreciationRate: asset.depreciationRate?.toString() || '',
    totalExpectedUnits: asset.totalExpectedUnits?.toString() || '',
  });

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getAssetCategories();
      setCategories(categoriesData);
    } catch (error) {
      toast.error(`Error loading categories: ${error}`)
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      description: asset.description,
      serialNumber: asset.serialNumber || '',
      modelNumber: asset.modelNumber || '',
      brand: asset.brand || '',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
      purchasePrice: asset.purchasePrice?.toString() || '',
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : undefined,
      quantity: asset.quantity.toString(),
      status: asset.status,
      location: asset.location || '',
      notes: asset.notes || '',
      
      depreciationMethod: asset.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      usefulLifeYears: asset.usefulLifeYears?.toString() || '',
      usefulLifeMonths: asset.usefulLifeMonths?.toString() || '',
      salvageValue: asset.salvageValue?.toString() || '0',
      depreciationRate: asset.depreciationRate?.toString() || '',
      totalExpectedUnits: asset.totalExpectedUnits?.toString() || '',
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        id: asset.id,
        description: formData.description,
        serialNumber: formData.serialNumber || undefined,
        modelNumber: formData.modelNumber || undefined,
        brand: formData.brand || undefined,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        warrantyExpiry: formData.warrantyExpiry,
        quantity: parseInt(formData.quantity),
        status: formData.status,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        
        // Depreciation fields
        depreciationMethod: formData.depreciationMethod,
        usefulLifeYears: formData.usefulLifeYears ? parseInt(formData.usefulLifeYears) : undefined,
        usefulLifeMonths: formData.usefulLifeMonths ? parseInt(formData.usefulLifeMonths) : undefined,
        salvageValue: formData.salvageValue ? parseFloat(formData.salvageValue) : undefined,
        depreciationRate: formData.depreciationRate ? parseFloat(formData.depreciationRate) : undefined,
        totalExpectedUnits: formData.totalExpectedUnits ? parseInt(formData.totalExpectedUnits) : undefined,
      };

      const result = await updateAsset(updateData);

      if (result.success) {
        toast.success(result.message);
        setIsEditing(false);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: keyof EditFormData, value: string | Date | undefined | AssetStatus | DepreciationMethod) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'DEPLOYED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800';
      case 'FULLY_DEPRECIATED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentCategory = categories.find(cat => cat.id === asset.categoryId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">{asset.itemCode}</h1>
            <p className="text-muted-foreground">{asset.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/${businessUnitId}/assets/${asset.id}/depreciation-schedule`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBatchDepreciation(true)}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Batch Calculate
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Item Code</Label>
                <p className="mt-1 font-mono text-sm bg-muted p-2 rounded">{asset.itemCode}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                <p className="mt-1">{currentCategory?.name || 'Unknown Category'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              {isEditing ? (
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Asset description"
                />
              ) : (
                <p className="mt-1">{asset.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                {isEditing ? (
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => updateFormData('serialNumber', e.target.value)}
                    placeholder="Serial number"
                  />
                ) : (
                  <p className="mt-1">{asset.serialNumber || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelNumber">Model Number</Label>
                {isEditing ? (
                  <Input
                    id="modelNumber"
                    value={formData.modelNumber}
                    onChange={(e) => updateFormData('modelNumber', e.target.value)}
                    placeholder="Model number"
                  />
                ) : (
                  <p className="mt-1">{asset.modelNumber || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                {isEditing ? (
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => updateFormData('brand', e.target.value)}
                    placeholder="Brand"
                  />
                ) : (
                  <p className="mt-1">{asset.brand || 'N/A'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                {isEditing ? (
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => updateFormData('quantity', e.target.value)}
                  />
                ) : (
                  <p className="mt-1">{asset.quantity}</p>
                )}
              </div>

              {!asset.purchasePrice || !asset.usefulLifeMonths ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    <strong>Depreciation Not Configured:</strong> This asset is missing depreciation configuration.
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                    Purchase price and useful life are required for depreciation tracking.
                  </p>
                  {isEditing && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      You can configure depreciation settings below while editing.
                    </p>
                  )}
                </div>
              ) : null}
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => updateFormData('status', value as AssetStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AssetStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={getStatusColor(asset.status)}>
                      {asset.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                {isEditing ? (
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    placeholder="Asset location"
                  />
                ) : (
                  <p className="mt-1">{asset.location || 'N/A'}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateFormData('notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              ) : (
                <p className="mt-1">{asset.notes || 'No notes available'}</p>
              )}
            </div>

            {/* Financial Information Section */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Financial Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  {isEditing ? (
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => updateFormData('purchasePrice', e.target.value)}
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="mt-1">
                      {asset.purchasePrice 
                        ? `₱${asset.purchasePrice.toLocaleString()}` 
                        : 'N/A'
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  {isEditing ? (
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
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="mt-1">
                      {asset.purchaseDate 
                        ? format(new Date(asset.purchaseDate), 'PPP')
                        : 'N/A'
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Warranty Expiry</Label>
                  {isEditing ? (
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
                  ) : (
                    <p className="mt-1">
                      {asset.warrantyExpiry 
                        ? format(new Date(asset.warrantyExpiry), 'PPP')
                        : 'N/A'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Asset Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Business Unit</span>
                <span className="text-sm font-medium">{asset.businessUnit.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created By</span>
                <span className="text-sm font-medium">
                  {asset.createdBy.firstName} {asset.createdBy.lastName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created Date</span>
                <span className="text-sm font-medium">
                  {format(new Date(asset.createdAt), 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm font-medium">
                  {format(new Date(asset.updatedAt), 'PPP')}
                </span>
              </div>
              
              {/* Barcode Information */}
              {asset.barcodeValue && (
                <>
                  <hr className="my-4" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Barcode Type</span>
                      <span className="text-sm font-medium">{asset.barcodeType || 'QR_CODE'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tag Number</span>
                      <span className="text-sm font-medium font-mono">{asset.tagNumber || 'N/A'}</span>
                    </div>
                    {asset.barcodeGenerated && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Barcode Generated</span>
                        <span className="text-sm font-medium">
                          {format(new Date(asset.barcodeGenerated), 'PPP')}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Barcode Value</span>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono break-all">
                          {asset.barcodeValue}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(asset.barcodeValue || '');
                            toast.success('Barcode copied to clipboard');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* QR Code Display */}
                    <div className="flex justify-center pt-2">
                      <QRCode value={asset.barcodeValue} size={96} className="mx-auto" />
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Printer className="h-3 w-3 mr-2" />
                        Print
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`/${businessUnitId}/assets/barcodes`, '_blank')}
                      >
                        <QrCode className="h-3 w-3 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              {/* No Barcode Message */}
              {!asset.barcodeValue && (
                <>
                  <hr className="my-4" />
                  <div className="text-center py-4">
                    <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-muted-foreground mb-3">No barcode generated</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/${businessUnitId}/assets/barcodes`, '_blank')}
                    >
                      <QrCode className="h-3 w-3 mr-2" />
                      Generate Barcode
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Depreciation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depreciationMethod">Depreciation Method</Label>
              {isEditing ? (
                <Select 
                  value={formData.depreciationMethod} 
                  onValueChange={(value) => updateFormData('depreciationMethod', value as DepreciationMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DepreciationMethod.STRAIGHT_LINE}>
                      Straight Line
                    </SelectItem>
                    <SelectItem value={DepreciationMethod.DECLINING_BALANCE}>
                      Declining Balance
                    </SelectItem>
                    <SelectItem value={DepreciationMethod.UNITS_OF_PRODUCTION}>
                      Units of Production
                    </SelectItem>
                    <SelectItem value={DepreciationMethod.SUM_OF_YEARS_DIGITS}>
                      Sum of Years Digits
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1">
                  {asset.depreciationMethod?.replace('_', ' ') || 'Straight Line'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salvageValue">Salvage Value</Label>
              {isEditing ? (
                <Input
                  id="salvageValue"
                  type="number"
                  step="0.01"
                  value={formData.salvageValue}
                  onChange={(e) => updateFormData('salvageValue', e.target.value)}
                  placeholder="0.00"
                />
              ) : (
                <p className="mt-1">
                  ₱{(asset.salvageValue || 0).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usefulLifeYears">Useful Life (Years)</Label>
              {isEditing ? (
                <Input
                  id="usefulLifeYears"
                  type="number"
                  min="1"
                  value={formData.usefulLifeYears}
                  onChange={(e) => updateFormData('usefulLifeYears', e.target.value)}
                  placeholder="5"
                />
              ) : (
                <p className="mt-1">
                  {asset.usefulLifeYears || Math.ceil((asset.usefulLifeMonths || 0) / 12)} years
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usefulLifeMonths">Useful Life (Months)</Label>
              {isEditing ? (
                <Input
                  id="usefulLifeMonths"
                  type="number"
                  min="1"
                  value={formData.usefulLifeMonths}
                  onChange={(e) => updateFormData('usefulLifeMonths', e.target.value)}
                  placeholder="Auto-calculated from years"
                />
              ) : (
                <p className="mt-1">{asset.usefulLifeMonths || 'N/A'} months</p>
              )}
            </div>
          </div>

          {/* Method-specific fields */}
          {(isEditing ? formData.depreciationMethod : asset.depreciationMethod) === DepreciationMethod.DECLINING_BALANCE && (
            <div className="space-y-2">
              <Label htmlFor="depreciationRate">Depreciation Rate (%)</Label>
              {isEditing ? (
                <Input
                  id="depreciationRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.depreciationRate}
                  onChange={(e) => updateFormData('depreciationRate', e.target.value)}
                  placeholder="20.00"
                />
              ) : (
                <p className="mt-1">{asset.depreciationRate || 0}%</p>
              )}
            </div>
          )}

          {(isEditing ? formData.depreciationMethod : asset.depreciationMethod) === DepreciationMethod.UNITS_OF_PRODUCTION && (
            <div className="space-y-2">
              <Label htmlFor="totalExpectedUnits">Total Expected Units</Label>
              {isEditing ? (
                <Input
                  id="totalExpectedUnits"
                  type="number"
                  min="1"
                  value={formData.totalExpectedUnits}
                  onChange={(e) => updateFormData('totalExpectedUnits', e.target.value)}
                  placeholder="100000"
                />
              ) : (
                <p className="mt-1">{asset.totalExpectedUnits?.toLocaleString() || 'N/A'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Depreciation Information */}
      <DepreciationCard 
        asset={asset} 
        onDepreciationCalculated={() => {
          window.location.reload();
        }}
      />

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Deployment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asset.deployments && asset.deployments.length > 0 ? (
            <div className="space-y-3">
              {asset.deployments.slice(0, 10).map((deployment) => (
                <div key={deployment.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Transmittal: {deployment.transmittalNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {deployment.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    {deployment.deployedDate && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Deployed: {format(new Date(deployment.deployedDate), 'PPP')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {format(new Date(deployment.createdAt), 'MMM dd, yyyy')}
                  </Badge>
                </div>
              ))}
              {asset.deployments.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing 10 of {asset.deployments.length} deployments
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No deployment history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <BatchDepreciationDialog
        open={showBatchDepreciation}
        onOpenChange={setShowBatchDepreciation}
        businessUnitId={businessUnitId}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}