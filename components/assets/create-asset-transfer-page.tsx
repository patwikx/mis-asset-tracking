/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/create-asset-transfer-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Calendar as CalendarIcon,
  Building,
  Package,
  Truck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getAssetsEligibleForTransfer,
  getBusinessUnitsForTransfer,
  createAssetTransfer
} from '@/lib/actions/asset-transfer-actions';
import type { AssetTransferData } from '@/types/asset-types';

interface CreateAssetTransferPageProps {
  businessUnitId: string;
}

export function CreateAssetTransferPage({ businessUnitId }: CreateAssetTransferPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assets, setAssets] = useState<Array<{
    id: string;
    itemCode: string;
    description: string;
    serialNumber?: string;
    location?: string;
    category: { name: string };
  }>>([]);
  
  const [businessUnits, setBusinessUnits] = useState<Array<{
    id: string;
    name: string;
    code: string;
  }>>([]);
  
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [assetSearch, setAssetSearch] = useState('');
  
  const [formData, setFormData] = useState<Partial<AssetTransferData>>({
    fromBusinessUnitId: businessUnitId,
    transferDate: new Date(),
    reason: '',
    transferMethod: '',
    fromLocation: '',
    toLocation: ''
  });

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/transfers`);
  };

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const assetsData = await getAssetsEligibleForTransfer(businessUnitId);
      setAssets(assetsData);
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId]);

  const loadBusinessUnits = useCallback(async () => {
    try {
      const businessUnitsData = await getBusinessUnitsForTransfer();
      setBusinessUnits(businessUnitsData.filter(unit => unit.id !== businessUnitId));
    } catch (error) {
      toast.error('Failed to load business units');
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadAssets();
    loadBusinessUnits();
  }, [loadAssets, loadBusinessUnits]);

  const filteredAssets = assets.filter(asset =>
    asset.itemCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.description.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset || !formData.toBusinessUnitId || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const transferData: AssetTransferData = {
        assetId: selectedAsset,
        fromBusinessUnitId: businessUnitId,
        toBusinessUnitId: formData.toBusinessUnitId!,
        transferDate: formData.transferDate!,
        reason: formData.reason!,
        transferMethod: formData.transferMethod,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        trackingNumber: formData.trackingNumber,
        estimatedArrival: formData.estimatedArrival,
        conditionBefore: formData.conditionBefore,
        transferNotes: formData.transferNotes,
        transferCost: formData.transferCost,
        insuranceValue: formData.insuranceValue
      };

      const result = await createAssetTransfer(transferData);
      
      if (result.success) {
        toast.success(result.message);
        router.push(`/${businessUnitId}/assets/transfers`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to create transfer request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Create Asset Transfer</h1>
            <p className="text-muted-foreground">Request transfer of an asset to another business unit</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Select Asset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item code, description, or serial number..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading-assets" disabled>Loading assets...</SelectItem>
                  ) : filteredAssets.length === 0 ? (
                    <SelectItem value="no-assets" disabled>No assets found</SelectItem>
                  ) : (
                    filteredAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.itemCode}</span>
                          <span className="text-sm text-muted-foreground">{asset.description}</span>
                          {asset.serialNumber && (
                            <span className="text-xs text-muted-foreground">SN: {asset.serialNumber}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination Business Unit *</Label>
                <Select 
                  value={formData.toBusinessUnitId || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, toBusinessUnitId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Transfer Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.transferDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.transferDate ? format(formData.transferDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.transferDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, transferDate: date }))}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason for Transfer *</Label>
              <Textarea
                placeholder="Explain why this asset needs to be transferred..."
                value={formData.reason || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Location</Label>
                <Input
                  placeholder="Current asset location"
                  value={formData.fromLocation || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>To Location</Label>
                <Input
                  placeholder="Destination location"
                  value={formData.toLocation || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping & Logistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Shipping & Logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transfer Method</Label>
                <Select 
                  value={formData.transferMethod || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, transferMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transfer method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courier">Courier Service</SelectItem>
                    <SelectItem value="pickup">Direct Pickup</SelectItem>
                    <SelectItem value="internal">Internal Transport</SelectItem>
                    <SelectItem value="mail">Mail/Post</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimated Arrival</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.estimatedArrival && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.estimatedArrival ? format(formData.estimatedArrival, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.estimatedArrival}
                      onSelect={(date) => setFormData(prev => ({ ...prev, estimatedArrival: date }))}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="Shipping tracking number"
                  value={formData.trackingNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Transfer Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.transferCost || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, transferCost: parseFloat(e.target.value) || undefined }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Insurance Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.insuranceValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceValue: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Condition Before Transfer</Label>
              <Textarea
                placeholder="Describe the current condition of the asset..."
                value={formData.conditionBefore || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, conditionBefore: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Transfer Notes</Label>
              <Textarea
                placeholder="Any additional notes or special instructions..."
                value={formData.transferNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, transferNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Transfer...' : 'Create Transfer Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}