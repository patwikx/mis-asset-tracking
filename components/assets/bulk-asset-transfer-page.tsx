// components/assets/bulk-asset-transfer-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Calendar as CalendarIcon,
  Building,
  Package,

} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface BulkAssetTransferPageProps {
  businessUnitId: string;
}

interface AssetForTransfer {
  id: string;
  itemCode: string;
  description: string;
  serialNumber?: string;
  location?: string;
  category: { name: string };
  selected: boolean;
}

export function BulkAssetTransferPage({ businessUnitId }: BulkAssetTransferPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assets, setAssets] = useState<AssetForTransfer[]>([]);
  const [businessUnits, setBusinessUnits] = useState<Array<{
    id: string;
    name: string;
    code: string;
  }>>([]);
  
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  
  const [formData, setFormData] = useState({
    toBusinessUnitId: '',
    transferDate: new Date(),
    reason: '',
    transferMethod: '',
    fromLocation: '',
    toLocation: '',
    transferNotes: ''
  });

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/transfers`);
  };

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const assetsData = await getAssetsEligibleForTransfer(businessUnitId);
      setAssets(assetsData.map(asset => ({ ...asset, selected: false })));
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

  useEffect(() => {
    setSelectedCount(assets.filter(asset => asset.selected).length);
  }, [assets]);

  const filteredAssets = assets.filter(asset =>
    asset.itemCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.description.toLowerCase().includes(assetSearch.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    setAssets(prev => prev.map(asset => ({ ...asset, selected: checked })));
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, selected: checked } : asset
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedAssets = assets.filter(asset => asset.selected);
    
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset to transfer');
      return;
    }
    
    if (!formData.toBusinessUnitId || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Create transfers for each selected asset
      for (const asset of selectedAssets) {
        try {
          const transferData: AssetTransferData = {
            assetId: asset.id,
            fromBusinessUnitId: businessUnitId,
            toBusinessUnitId: formData.toBusinessUnitId,
            transferDate: formData.transferDate,
            reason: formData.reason,
            transferMethod: formData.transferMethod || undefined,
            fromLocation: formData.fromLocation || undefined,
            toLocation: formData.toLocation || undefined,
            transferNotes: formData.transferNotes || undefined
          };

          const result = await createAssetTransfer(transferData);
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to create transfer for asset ${asset.itemCode}:`, result.message);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error creating transfer for asset ${asset.itemCode}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} transfer request(s)`);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to create ${errorCount} transfer request(s)`);
      }
      
      if (successCount > 0) {
        router.push(`/${businessUnitId}/assets/transfers`);
      }
    } catch (error) {
      toast.error('Failed to create bulk transfer requests');
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
            <h1 className="text-2xl font-bold">Bulk Asset Transfer</h1>
            <p className="text-muted-foreground">Create transfer requests for multiple assets</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedCount} asset(s) selected
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={formData.toBusinessUnitId} 
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
                      onSelect={(date) => setFormData(prev => ({ ...prev, transferDate: date || new Date() }))}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason for Transfer *</Label>
              <Textarea
                placeholder="Explain why these assets need to be transferred..."
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Transfer Method</Label>
                <Select 
                  value={formData.transferMethod} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, transferMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
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
                <Label>From Location</Label>
                <Input
                  placeholder="Current location"
                  value={formData.fromLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>To Location</Label>
                <Input
                  placeholder="Destination location"
                  value={formData.toLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transfer Notes</Label>
              <Textarea
                placeholder="Any additional notes or special instructions..."
                value={formData.transferNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, transferNotes: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Asset Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Select Assets
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedCount} of {assets.length} selected
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedCount === assets.length && assets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading assets...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Checkbox
                            checked={asset.selected}
                            onCheckedChange={(checked) => handleSelectAsset(asset.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {asset.itemCode}
                        </TableCell>
                        <TableCell>
                          {asset.description}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {asset.serialNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {asset.category.name}
                        </TableCell>
                        <TableCell>
                          {asset.location || 'Not specified'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || selectedCount === 0}
          >
            {isSubmitting ? 'Creating Transfers...' : `Create ${selectedCount} Transfer Request(s)`}
          </Button>
        </div>
      </form>
    </div>
  );
}