// components/assets/bulk-asset-disposal-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Shield,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AssetStatus } from '@prisma/client';
import {
  getAssetsEligibleForDisposal,
  createBulkDisposals
} from '@/lib/actions/asset-disposal-actions';
import type {
  BulkDisposalData,
  BulkAssetOperationResult
} from '@/types/asset-types';

interface BulkAssetDisposalPageProps {
  businessUnitId: string;
}

interface EligibleAsset {
  id: string;
  itemCode: string;
  description: string;
  status: AssetStatus;
  currentBookValue?: number;
  serialNumber?: string;
  category: { name: string };
}

// Helper function to get status color
const getStatusColor = (status: AssetStatus): string => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'bg-green-500';
    case AssetStatus.DEPLOYED:
      return 'bg-blue-500';
    case AssetStatus.IN_MAINTENANCE:
      return 'bg-yellow-500';
    case AssetStatus.RETIRED:
      return 'bg-gray-500';
    case AssetStatus.LOST:
      return 'bg-red-500';
    case AssetStatus.DAMAGED:
      return 'bg-orange-500';
    case AssetStatus.FULLY_DEPRECIATED:
      return 'bg-purple-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format status text
const formatStatusText = (status: AssetStatus): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

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

export function BulkAssetDisposalPage({ businessUnitId }: BulkAssetDisposalPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assets, setAssets] = useState<EligibleAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<EligibleAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [operationResult, setOperationResult] = useState<BulkAssetOperationResult | null>(null);

  // Disposal form data
  const [disposalData, setDisposalData] = useState<{
    disposalDate: Date;
    reason: BulkDisposalData['reason'] | '';
    disposalMethod: string;
    disposalLocation: string;
    environmentalCompliance: boolean;
    dataWiped: boolean;
    complianceNotes: string;
    notes: string;
  }>({
    disposalDate: new Date(),
    reason: '',
    disposalMethod: '',
    disposalLocation: '',
    environmentalCompliance: false,
    dataWiped: false,
    complianceNotes: '',
    notes: ''
  });

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/disposals`);
  };

  const loadEligibleAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const assetsData = await getAssetsEligibleForDisposal(businessUnitId);
      setAssets(assetsData);
      setFilteredAssets(assetsData);
    } catch (error) {
      toast.error('Failed to load eligible assets');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadEligibleAssets();
  }, [loadEligibleAssets]);

  // Filter assets based on search and status
  useEffect(() => {
    let filtered = assets;

    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    setFilteredAssets(filtered);
    // Reset selection when filters change
    setSelectedAssetIds(prev => prev.filter(id => filtered.some(asset => asset.id === id)));
  }, [assets, searchTerm, statusFilter]);

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(asset => asset.id));
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetIds(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleDisposalDataChange = (field: keyof typeof disposalData, value: string | Date | boolean) => {
    setDisposalData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (selectedAssetIds.length === 0) {
      toast.error('Please select at least one asset for disposal');
      return false;
    }

    if (!disposalData.reason) {
      toast.error('Please select a disposal reason');
      return false;
    }

    return true;
  };

  const handleCreateDisposals = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const bulkDisposalData: BulkDisposalData = {
        assetIds: selectedAssetIds,
        disposalDate: disposalData.disposalDate,
        reason: disposalData.reason as BulkDisposalData['reason'],
        disposalMethod: disposalData.disposalMethod || undefined,
        disposalLocation: disposalData.disposalLocation || undefined,
        environmentalCompliance: disposalData.environmentalCompliance,
        dataWiped: disposalData.dataWiped,
        complianceNotes: disposalData.complianceNotes || undefined,
        notes: disposalData.notes || undefined
      };

      const result = await createBulkDisposals(businessUnitId, bulkDisposalData);
      setOperationResult(result);
      
      if (result.success) {
        toast.success(result.message);
        // Reload eligible assets
        loadEligibleAssets();
        // Reset form
        setSelectedAssetIds([]);
        setDisposalData({
          disposalDate: new Date(),
          reason: '',
          disposalMethod: '',
          disposalLocation: '',
          environmentalCompliance: false,
          dataWiped: false,
          complianceNotes: '',
          notes: ''
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to create disposals');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedAssetIds([]);
    setSearchTerm('');
    setStatusFilter('');
    setOperationResult(null);
    setDisposalData({
      disposalDate: new Date(),
      reason: '',
      disposalMethod: '',
      disposalLocation: '',
      environmentalCompliance: false,
      dataWiped: false,
      complianceNotes: '',
      notes: ''
    });
  };

  const selectedAssets = filteredAssets.filter(asset => selectedAssetIds.includes(asset.id));
  const totalBookValue = selectedAssets.reduce((sum, asset) => sum + (asset.currentBookValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Bulk Asset Disposal</h1>
            <p className="text-muted-foreground">Dispose multiple assets at once</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
          {operationResult?.success && (
            <Button onClick={() => router.push(`/${businessUnitId}/assets/disposals`)}>
              View Disposals
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Asset Selection</span>
              <Badge variant="secondary">
                {selectedAssetIds.length} of {filteredAssets.length} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search Assets</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code, description, serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setStatusFilter(value as AssetStatus | '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All Statuses</SelectItem>
                    {Object.values(AssetStatus)
                      .filter(status => status !== AssetStatus.DISPOSED)
                      .map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                          {formatStatusText(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assets Table */}
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Book Value</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading eligible assets...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No eligible assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAssetIds.includes(asset.id)}
                            onCheckedChange={() => handleSelectAsset(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{asset.itemCode}</TableCell>
                        <TableCell className="font-medium">{asset.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(asset.status)}`} />
                            {formatStatusText(asset.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.currentBookValue ? `₱${asset.currentBookValue.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{asset.category.name}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Selection Summary */}
            {selectedAssetIds.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {selectedAssetIds.length} assets selected for disposal
                    </p>
                    <p className="text-sm">
                      Total book value: ₱{totalBookValue.toLocaleString()}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Disposal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Disposal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Disposal Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !disposalData.disposalDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {disposalData.disposalDate ? format(disposalData.disposalDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={disposalData.disposalDate}
                    onSelect={(date: Date | undefined) => 
                      handleDisposalDataChange('disposalDate', date || new Date())
                    }
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Disposal Reason *</Label>
              <Select 
                value={disposalData.reason} 
                onValueChange={(value) => handleDisposalDataChange('reason', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'SOLD',
                    'DONATED', 
                    'SCRAPPED',
                    'LOST',
                    'STOLEN',
                    'TRANSFERRED',
                    'END_OF_LIFE',
                    'DAMAGED_BEYOND_REPAIR',
                    'OBSOLETE',
                    'REGULATORY_COMPLIANCE'
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

            <div className="space-y-2">
              <Label>Disposal Method</Label>
              <Input
                value={disposalData.disposalMethod}
                onChange={(e) => handleDisposalDataChange('disposalMethod', e.target.value)}
                placeholder="e.g., Auction, Recycling, Donation"
              />
            </div>

            <div className="space-y-2">
              <Label>Disposal Location</Label>
              <Input
                value={disposalData.disposalLocation}
                onChange={(e) => handleDisposalDataChange('disposalLocation', e.target.value)}
                placeholder="e.g., Recycling Center, Warehouse"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="environmentalCompliance">Environmental Compliance</Label>
                    <p className="text-xs text-muted-foreground">Meets environmental standards</p>
                  </div>
                </div>
                <Switch
                  id="environmentalCompliance"
                  checked={disposalData.environmentalCompliance}
                  onCheckedChange={(checked) => handleDisposalDataChange('environmentalCompliance', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="dataWiped">Data Wiped</Label>
                    <p className="text-xs text-muted-foreground">Data securely wiped (IT assets)</p>
                  </div>
                </div>
                <Switch
                  id="dataWiped"
                  checked={disposalData.dataWiped}
                  onCheckedChange={(checked) => handleDisposalDataChange('dataWiped', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Compliance Notes</Label>
              <Textarea
                value={disposalData.complianceNotes}
                onChange={(e) => handleDisposalDataChange('complianceNotes', e.target.value)}
                placeholder="Compliance and regulatory notes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={disposalData.notes}
                onChange={(e) => handleDisposalDataChange('notes', e.target.value)}
                placeholder="Additional disposal notes..."
                rows={3}
              />
            </div>

            <Separator />

            <Button 
              onClick={handleCreateDisposals} 
              disabled={isProcessing || selectedAssetIds.length === 0 || !disposalData.reason}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing Disposals...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Dispose {selectedAssetIds.length} Assets
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Operation Result */}
      {operationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Disposal Results</span>
              <Badge variant={operationResult.success ? "default" : "destructive"}>
                {operationResult.success ? "Success" : "Partial Success"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {operationResult.processedCount}
                  </div>
                  <div className="text-sm text-green-700">Assets Disposed</div>
                </div>
                
                {operationResult.failedCount > 0 && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {operationResult.failedCount}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                )}

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {operationResult.processedAssetIds.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Processed</div>
                </div>
              </div>

              {operationResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Processing Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {operationResult.errors.map((error, index) => (
                          <p key={index} className="text-xs">
                            {error.itemCode && `${error.itemCode}: `}{error.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                {operationResult.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}