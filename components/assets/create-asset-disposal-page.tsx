/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/create-asset-disposal-page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle, DollarSign, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  createAssetDisposal,
  getAssetsEligibleForDisposal
} from '@/lib/actions/asset-disposal-actions';
import type { AssetDisposalData } from '@/types/asset-types';

interface CreateAssetDisposalPageProps {
  businessUnitId: string;
}

// Helper function to get disposal reason color
const getDisposalReasonColor = (reason: string): string => {
  switch (reason) {
    case 'SOLD':
      return 'bg-green-500';
    case 'DONATED':
      return 'bg-blue-500';
    case 'SCRAPPED':
      return 'bg-gray-500';
    case 'LOST':
    case 'STOLEN':
      return 'bg-red-500';
    case 'TRANSFERRED':
      return 'bg-purple-500';
    case 'END_OF_LIFE':
    case 'OBSOLETE':
      return 'bg-orange-500';
    case 'DAMAGED_BEYOND_REPAIR':
      return 'bg-red-600';
    case 'REGULATORY_COMPLIANCE':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format disposal reason text
const formatDisposalReason = (reason: string): string => {
  return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function CreateAssetDisposalPage({ businessUnitId }: CreateAssetDisposalPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [eligibleAssets, setEligibleAssets] = useState<Array<{
    id: string;
    itemCode: string;
    description: string;
    currentBookValue?: number;
    serialNumber?: string;
    category: { name: string };
  }>>([]);
  
  const [formData, setFormData] = useState<{
    assetId: string;
    disposalDate: Date;
    reason: AssetDisposalData['reason'] | '';
    disposalMethod: string;
    disposalLocation: string;
    disposalValue: string;
    disposalCost: string;
    recipientName: string;
    recipientContact: string;
    recipientAddress: string;
    environmentalCompliance: boolean;
    dataWiped: boolean;
    complianceNotes: string;
    condition: string;
    notes: string;
    internalReference: string;
    documentationUrl: string;
    certificateNumber: string;
  }>({
    assetId: '',
    disposalDate: new Date(),
    reason: '',
    disposalMethod: '',
    disposalLocation: '',
    disposalValue: '',
    disposalCost: '',
    recipientName: '',
    recipientContact: '',
    recipientAddress: '',
    environmentalCompliance: false,
    dataWiped: false,
    complianceNotes: '',
    condition: '',
    notes: '',
    internalReference: '',
    documentationUrl: '',
    certificateNumber: ''
  });

  const [selectedAsset, setSelectedAsset] = useState<{
    id: string;
    itemCode: string;
    description: string;
    currentBookValue?: number;
    serialNumber?: string;
    category: { name: string };
  } | null>(null);

  // Load eligible assets
  useEffect(() => {
    const loadEligibleAssets = async () => {
      try {
        const assets = await getAssetsEligibleForDisposal(businessUnitId);
        setEligibleAssets(assets);
      } catch (error) {
        toast.error('Failed to load eligible assets');
      }
    };
    loadEligibleAssets();
  }, [businessUnitId]);


  const handleAssetChange = (assetId: string) => {
    const asset = eligibleAssets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
    setFormData(prev => ({ ...prev, assetId }));
  };

  const calculateGainLoss = (): number => {
    const disposalValue = parseFloat(formData.disposalValue) || 0;
    const disposalCost = parseFloat(formData.disposalCost) || 0;
    const bookValue = selectedAsset?.currentBookValue || 0;
    const netDisposalValue = disposalValue - disposalCost;
    return netDisposalValue - bookValue;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset) {
      toast.error('Please select an asset to dispose');
      return;
    }

    if (!formData.reason) {
      toast.error('Please select a disposal reason');
      return;
    }

    setIsLoading(true);
    try {
      const disposalData: AssetDisposalData = {
        assetId: formData.assetId,
        disposalDate: formData.disposalDate,
        reason: formData.reason as AssetDisposalData['reason'],
        disposalMethod: formData.disposalMethod || undefined,
        disposalLocation: formData.disposalLocation || undefined,
        disposalValue: formData.disposalValue ? parseFloat(formData.disposalValue) : undefined,
        disposalCost: formData.disposalCost ? parseFloat(formData.disposalCost) : undefined,
        bookValueAtDisposal: selectedAsset.currentBookValue || 0,
        recipientName: formData.recipientName || undefined,
        recipientContact: formData.recipientContact || undefined,
        recipientAddress: formData.recipientAddress || undefined,
        environmentalCompliance: formData.environmentalCompliance,
        dataWiped: formData.dataWiped,
        complianceNotes: formData.complianceNotes || undefined,
        condition: formData.condition || undefined,
        notes: formData.notes || undefined,
        internalReference: formData.internalReference || undefined,
        documentationUrl: formData.documentationUrl || undefined,
        certificateNumber: formData.certificateNumber || undefined
      };

      const result = await createAssetDisposal(businessUnitId, disposalData);
      
      if (result.success) {
        toast.success(result.message);
        router.push(`/${businessUnitId}/assets/disposals`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to create asset disposal');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const gainLoss = calculateGainLoss();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Create Asset Disposal</h1>
            <p className="text-muted-foreground">Record the disposal of an asset</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !selectedAsset}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Create Disposal
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assetId">Select Asset *</Label>
                <Select 
                  value={formData.assetId} 
                  onValueChange={handleAssetChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset to dispose" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.itemCode}</span>
                          <span className="text-sm text-muted-foreground">{asset.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAsset && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Asset:</strong> {selectedAsset.itemCode} - {selectedAsset.description}</p>
                      <p><strong>Category:</strong> {selectedAsset.category.name}</p>
                      {selectedAsset.serialNumber && (
                        <p><strong>Serial Number:</strong> {selectedAsset.serialNumber}</p>
                      )}
                      <p><strong>Current Book Value:</strong> ₱{(selectedAsset.currentBookValue || 0).toLocaleString()}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disposal Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.disposalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.disposalDate ? format(formData.disposalDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.disposalDate}
                        onSelect={(date: Date | undefined) => updateFormData('disposalDate', date || new Date())}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Disposal Reason *</Label>
                  <Select 
                    value={formData.reason} 
                    onValueChange={(value) => updateFormData('reason', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'SOLD', 'DONATED', 'SCRAPPED', 'LOST', 'STOLEN', 
                        'TRANSFERRED', 'END_OF_LIFE', 'DAMAGED_BEYOND_REPAIR', 
                        'OBSOLETE', 'REGULATORY_COMPLIANCE'
                      ].map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getDisposalReasonColor(reason)}`} />
                            {formatDisposalReason(reason)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disposalMethod">Disposal Method</Label>
                  <Input
                    id="disposalMethod"
                    value={formData.disposalMethod}
                    onChange={(e) => updateFormData('disposalMethod', e.target.value)}
                    placeholder="e.g., Auction, Recycling, Donation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disposalLocation">Disposal Location</Label>
                  <Input
                    id="disposalLocation"
                    value={formData.disposalLocation}
                    onChange={(e) => updateFormData('disposalLocation', e.target.value)}
                    placeholder="e.g., Recycling Center, Auction House"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Asset Condition</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(value) => updateFormData('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                    <SelectItem value="POOR">Poor</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="NON_FUNCTIONAL">Non-Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAsset && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Book Value</Label>
                    <p className="text-lg font-semibold">
                      ₱{(selectedAsset.currentBookValue || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Disposal Value</Label>
                    <p className="text-sm font-medium">
                      ₱{(parseFloat(formData.disposalValue) || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Disposal Cost</Label>
                    <p className="text-sm font-medium">
                      ₱{(parseFloat(formData.disposalCost) || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Net Disposal Value</Label>
                    <p className="text-sm font-medium">
                      ₱{((parseFloat(formData.disposalValue) || 0) - (parseFloat(formData.disposalCost) || 0)).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Gain/Loss</Label>
                    <p className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gainLoss >= 0 ? '+' : ''}₱{Math.abs(gainLoss).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {gainLoss >= 0 ? 'Gain on disposal' : 'Loss on disposal'}
                    </p>
                  </div>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disposalValue">Disposal Value</Label>
                <Input
                  id="disposalValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.disposalValue}
                  onChange={(e) => updateFormData('disposalValue', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disposalCost">Disposal Cost</Label>
                <Input
                  id="disposalCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.disposalCost}
                  onChange={(e) => updateFormData('disposalCost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Information */}
        {(formData.reason === 'TRANSFERRED' || formData.reason === 'DONATED' || formData.reason === 'SOLD') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Recipient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => updateFormData('recipientName', e.target.value)}
                    placeholder="Name of recipient"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientContact">Contact Information</Label>
                  <Input
                    id="recipientContact"
                    value={formData.recipientContact}
                    onChange={(e) => updateFormData('recipientContact', e.target.value)}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientAddress">Address</Label>
                <Textarea
                  id="recipientAddress"
                  value={formData.recipientAddress}
                  onChange={(e) => updateFormData('recipientAddress', e.target.value)}
                  placeholder="Recipient address"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance & Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance & Documentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="environmentalCompliance">Environmental Compliance</Label>
                <p className="text-sm text-muted-foreground">Disposal meets environmental standards</p>
              </div>
              <Switch
                id="environmentalCompliance"
                checked={formData.environmentalCompliance}
                onCheckedChange={(checked) => updateFormData('environmentalCompliance', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dataWiped">Data Securely Wiped</Label>
                <p className="text-sm text-muted-foreground">All data has been securely removed</p>
              </div>
              <Switch
                id="dataWiped"
                checked={formData.dataWiped}
                onCheckedChange={(checked) => updateFormData('dataWiped', checked)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Certificate Number</Label>
                <Input
                  id="certificateNumber"
                  value={formData.certificateNumber}
                  onChange={(e) => updateFormData('certificateNumber', e.target.value)}
                  placeholder="Disposal certificate number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalReference">Internal Reference</Label>
                <Input
                  id="internalReference"
                  value={formData.internalReference}
                  onChange={(e) => updateFormData('internalReference', e.target.value)}
                  placeholder="Internal tracking reference"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentationUrl">Documentation URL</Label>
              <Input
                id="documentationUrl"
                type="url"
                value={formData.documentationUrl}
                onChange={(e) => updateFormData('documentationUrl', e.target.value)}
                placeholder="Link to disposal documentation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complianceNotes">Compliance Notes</Label>
              <Textarea
                id="complianceNotes"
                value={formData.complianceNotes}
                onChange={(e) => updateFormData('complianceNotes', e.target.value)}
                placeholder="Regulatory compliance notes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Additional disposal notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}