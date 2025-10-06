/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/create-asset-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calculator, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AssetStatus, DepreciationMethod } from '@prisma/client';
import { createAsset, getAssetCategories, getNextItemCode } from '@/lib/actions/asset-actions';
import type { DepreciationPreview } from '@/types/depreciation-types';

interface CreateAssetPageProps {
  businessUnitId: string;
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
  
  // Depreciation fields
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: string;
  usefulLifeMonths: string;
  salvageValue: string;
  depreciationRate: string;
  totalExpectedUnits: string;
  startDepreciationImmediately: boolean;
}

export function CreateAssetPage({ businessUnitId }: CreateAssetPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [depreciationPreview, setDepreciationPreview] = useState<DepreciationPreview | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
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
    notes: '',
    
    // Depreciation defaults
    depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    usefulLifeYears: '5',
    usefulLifeMonths: '',
    salvageValue: '0',
    depreciationRate: '20',
    totalExpectedUnits: '',
    startDepreciationImmediately: true
  });

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getAssetCategories();
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  }, []);

  const generateItemCode = useCallback(async () => {
    if (!businessUnitId || !formData.categoryId) return;
    
    setIsGeneratingCode(true);
    try {
      const nextCode = await getNextItemCode(businessUnitId, formData.categoryId);
      setFormData(prev => ({ ...prev, itemCode: nextCode }));
    } catch (error) {
      toast.error('Failed to generate item code');
      setFormData(prev => ({ ...prev, itemCode: 'Error generating code' }));
    } finally {
      setIsGeneratingCode(false);
    }
  }, [businessUnitId, formData.categoryId]);

  const calculateDepreciationPreview = useCallback(() => {
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const salvageValue = parseFloat(formData.salvageValue) || 0;
    const usefulLifeYears = parseFloat(formData.usefulLifeYears) || 0;
    const usefulLifeMonths = parseFloat(formData.usefulLifeMonths) || (usefulLifeYears * 12);

    if (purchasePrice <= 0 || usefulLifeMonths <= 0) {
      setDepreciationPreview(null);
      return;
    }

    const depreciableAmount = purchasePrice - salvageValue;
    let monthlyDepreciation = 0;

    switch (formData.depreciationMethod) {
      case DepreciationMethod.STRAIGHT_LINE:
        monthlyDepreciation = depreciableAmount / usefulLifeMonths;
        break;
      case DepreciationMethod.DECLINING_BALANCE:
        const rate = parseFloat(formData.depreciationRate) || 0;
        monthlyDepreciation = (purchasePrice * (rate / 100)) / 12;
        break;
      case DepreciationMethod.UNITS_OF_PRODUCTION:
        const totalUnits = parseFloat(formData.totalExpectedUnits) || 0;
        if (totalUnits > 0) {
          monthlyDepreciation = depreciableAmount / totalUnits; // Per unit
        }
        break;
      default:
        monthlyDepreciation = depreciableAmount / usefulLifeMonths;
    }

    const annualDepreciation = monthlyDepreciation * 12;
    const remainingValue = purchasePrice - salvageValue;
    const yearsRemaining = usefulLifeYears;

    setDepreciationPreview({
      currentBookValue: purchasePrice,
      monthlyDepreciation,
      annualDepreciation,
      remainingValue,
      yearsRemaining,
      percentageDepreciated: 0
    });
  }, [
    formData.purchasePrice,
    formData.salvageValue,
    formData.usefulLifeYears,
    formData.usefulLifeMonths,
    formData.depreciationMethod,
    formData.depreciationRate,
    formData.totalExpectedUnits
  ]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Generate item code when category changes
  useEffect(() => {
    if (formData.categoryId && businessUnitId) {
      generateItemCode();
    }
  }, [generateItemCode, formData.categoryId, businessUnitId]);

  // Calculate depreciation preview when relevant fields change
  useEffect(() => {
    calculateDepreciationPreview();
  }, [calculateDepreciationPreview]);

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets`);
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
        businessUnitId: businessUnitId,
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
        startDepreciationImmediately: formData.startDepreciationImmediately
      };

      const result = await createAsset(submitData);

      if (result.success) {
        toast.success(result.message);
        router.push(`/${businessUnitId}/assets`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | Date | undefined | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      categoryId,
      itemCode: 'Generating...'
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Create New Asset</h1>
            <p className="text-muted-foreground">Add a new asset to the system with depreciation tracking</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.categoryId}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Asset
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category *</Label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={handleCategoryChange}
                    required
                  >
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemCode">
                    Item Code *
                    <span className="text-sm text-muted-foreground ml-1">(Auto-generated)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="itemCode"
                      value={formData.itemCode}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      placeholder="Select category to generate"
                    />
                    {formData.categoryId && (
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
                </div>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => updateFormData('serialNumber', e.target.value)}
                    placeholder="e.g., MBP16M2001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelNumber">Model Number</Label>
                  <Input
                    id="modelNumber"
                    value={formData.modelNumber}
                    onChange={(e) => updateFormData('modelNumber', e.target.value)}
                    placeholder="e.g., A2485"
                  />
                </div>

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
                      {Object.values(AssetStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    placeholder="e.g., IT Storage Room"
                  />
                </div>
              </div>

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
            </CardContent>
          </Card>

          {/* Depreciation Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Depreciation Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {depreciationPreview ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Current Book Value</Label>
                    <p className="text-lg font-semibold">
                      ₱{depreciationPreview.currentBookValue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Monthly Depreciation</Label>
                    <p className="text-sm font-medium">
                      ₱{depreciationPreview.monthlyDepreciation.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Annual Depreciation</Label>
                    <p className="text-sm font-medium">
                      ₱{depreciationPreview.annualDepreciation.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Years Remaining</Label>
                    <p className="text-sm">{depreciationPreview.yearsRemaining} years</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enter purchase price and useful life to see depreciation preview
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <CalendarComponent
                      mode="single"
                      selected={formData.purchaseDate}
                      onSelect={(date: Date | undefined) => updateFormData('purchaseDate', date)}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>

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
                    <CalendarComponent
                      mode="single"
                      selected={formData.warrantyExpiry}
                      onSelect={(date: Date | undefined) => updateFormData('warrantyExpiry', date)}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Depreciation Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Depreciation Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="startDepreciationImmediately">Start Depreciation Immediately</Label>
                <p className="text-sm text-muted-foreground">Begin depreciation calculations from purchase date</p>
              </div>
              <Switch
                id="startDepreciationImmediately"
                checked={formData.startDepreciationImmediately}
                onCheckedChange={(checked) => updateFormData('startDepreciationImmediately', checked)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="depreciationMethod">Depreciation Method</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="salvageValue">Salvage Value</Label>
                <Input
                  id="salvageValue"
                  type="number"
                  step="0.01"
                  value={formData.salvageValue}
                  onChange={(e) => updateFormData('salvageValue', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usefulLifeYears">Useful Life (Years)</Label>
                <Input
                  id="usefulLifeYears"
                  type="number"
                  min="1"
                  value={formData.usefulLifeYears}
                  onChange={(e) => updateFormData('usefulLifeYears', e.target.value)}
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usefulLifeMonths">Useful Life (Months)</Label>
                <Input
                  id="usefulLifeMonths"
                  type="number"
                  min="1"
                  value={formData.usefulLifeMonths}
                  onChange={(e) => updateFormData('usefulLifeMonths', e.target.value)}
                  placeholder="Auto-calculated from years"
                />
              </div>
            </div>

            {/* Method-specific fields */}
            {formData.depreciationMethod === DepreciationMethod.DECLINING_BALANCE && (
              <div className="space-y-2">
                <Label htmlFor="depreciationRate">Depreciation Rate (%)</Label>
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
              </div>
            )}

            {formData.depreciationMethod === DepreciationMethod.UNITS_OF_PRODUCTION && (
              <div className="space-y-2">
                <Label htmlFor="totalExpectedUnits">Total Expected Units</Label>
                <Input
                  id="totalExpectedUnits"
                  type="number"
                  min="1"
                  value={formData.totalExpectedUnits}
                  onChange={(e) => updateFormData('totalExpectedUnits', e.target.value)}
                  placeholder="100000"
                />
              </div>
            )}

            {/* Method descriptions */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Method Description:</h4>
              {formData.depreciationMethod === DepreciationMethod.STRAIGHT_LINE && (
                <p className="text-sm text-muted-foreground">
                  Equal depreciation amount each period: (Cost - Salvage Value) ÷ Useful Life
                </p>
              )}
              {formData.depreciationMethod === DepreciationMethod.DECLINING_BALANCE && (
                <p className="text-sm text-muted-foreground">
                  Higher depreciation in early years: Book Value × Depreciation Rate
                </p>
              )}
              {formData.depreciationMethod === DepreciationMethod.UNITS_OF_PRODUCTION && (
                <p className="text-sm text-muted-foreground">
                  Depreciation based on usage: (Cost - Salvage Value) ÷ Total Units × Units Used
                </p>
              )}
              {formData.depreciationMethod === DepreciationMethod.SUM_OF_YEARS_DIGITS && (
                <p className="text-sm text-muted-foreground">
                  Accelerated depreciation using sum of years digits formula
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}