// components/depreciation/batch-depreciation-dialog.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { batchCalculateDepreciation } from '@/lib/actions/depreciation-reports-actions';
import { getAssetsDueForDepreciation } from '@/lib/actions/asset-actions';
import type { BatchDepreciationResult } from '@/types/depreciation-reports-types';

interface BatchDepreciationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUnitId: string;
  onSuccess: () => void;
}

interface AssetDueForDepreciation {
  id: string;
  itemCode: string;
  description: string;
  currentBookValue: number;
  nextDepreciationDate: Date;
  monthlyDepreciation: number;
}

export function BatchDepreciationDialog({
  open,
  onOpenChange,
  businessUnitId,
  onSuccess
}: BatchDepreciationDialogProps) {
  const [assetsDue, setAssetsDue] = useState<AssetDueForDepreciation[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState<BatchDepreciationResult | null>(null);

  const loadAssetsDue = useCallback(async () => {
  try {
    setIsLoading(true);
    const assets = await getAssetsDueForDepreciation(businessUnitId);
    
    // Helper function to safely convert to number
    const toNumber = (value: unknown): number => {
      if (typeof value === 'number') {
        return value;
      }
      if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
        return (value as { toNumber(): number }).toNumber();
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Transform the serialized data to match our interface
    const transformedAssets: AssetDueForDepreciation[] = assets.map(asset => ({
      id: asset.id,
      itemCode: asset.itemCode,
      description: asset.description,
      currentBookValue: asset.currentBookValue 
        ? toNumber(asset.currentBookValue)
        : (asset.purchasePrice 
           ? toNumber(asset.purchasePrice)
           : 0),
      nextDepreciationDate: new Date(asset.nextDepreciationDate || new Date()),
      monthlyDepreciation: asset.monthlyDepreciation 
        ? toNumber(asset.monthlyDepreciation)
        : 0
    }));
    
    setAssetsDue(transformedAssets);
    // Select all assets by default
    setSelectedAssets(new Set(transformedAssets.map(asset => asset.id)));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    toast.error('Failed to load assets');
  } finally {
    setIsLoading(false);
  }
}, [businessUnitId]);
  useEffect(() => {
    if (open) {
      loadAssetsDue();
    }
  }, [open, loadAssetsDue]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assetsDue.map(asset => asset.id)));
    } else {
      setSelectedAssets(new Set());
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleBatchCalculation = async () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await batchCalculateDepreciation(
        businessUnitId,
        Array.from(selectedAssets)
      );

      clearInterval(progressInterval);
      setProcessingProgress(100);

      setResult(result);

      if (result.success) {
        toast.success(result.message);
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 2000);
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to process batch depreciation');
    } finally {
      setIsProcessing(false);
    }
  };

  const estimatedTotalDepreciation = assetsDue
    .filter(asset => selectedAssets.has(asset.id))
    .reduce((sum, asset) => sum + asset.monthlyDepreciation, 0);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Batch Depreciation Calculation</DialogTitle>
            <DialogDescription>Loading assets due for depreciation...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 mr-2 text-red-600" />
              )}
              Batch Calculation {result.success ? 'Completed' : 'Failed'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{result.summary.totalAssets}</div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {result.summary.successfulCalculations}
                    </div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {result.summary.failedCalculations}
                    </div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      ₱{result.summary.totalDepreciationAmount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Depreciation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.errors.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                    Errors ({result.errors.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                        <p className="font-medium">{error.assetCode}</p>
                        <p className="text-red-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Batch Depreciation Calculation
          </DialogTitle>
          <DialogDescription>
            Calculate depreciation for multiple assets at once. Select the assets you want to process.
          </DialogDescription>
        </DialogHeader>

        {isProcessing ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">Processing Depreciation Calculations...</div>
              <Progress value={processingProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {processingProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">{assetsDue.length}</div>
                    <p className="text-sm text-muted-foreground">Assets Due</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{selectedAssets.size}</div>
                    <p className="text-sm text-muted-foreground">Selected</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      ₱{estimatedTotalDepreciation.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Estimated Depreciation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Selection */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedAssets.size === assetsDue.length && assetsDue.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label className="font-medium">Select All Assets</label>
                  </div>
                  <Badge variant="outline">
                    {selectedAssets.size} of {assetsDue.length} selected
                  </Badge>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assetsDue.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={(checked) => 
                            handleSelectAsset(asset.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <p className="font-medium">{asset.itemCode}</p>
                          <p className="text-sm text-muted-foreground">{asset.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Book Value: ₱{asset.currentBookValue.toLocaleString()}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Due: {format(asset.nextDepreciationDate, 'MMM dd')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₱{asset.monthlyDepreciation.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Monthly Depreciation</p>
                      </div>
                    </div>
                  ))}
                </div>

                {assetsDue.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No assets are currently due for depreciation calculation</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBatchCalculation}
            disabled={isProcessing || selectedAssets.size === 0}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Depreciation ({selectedAssets.size} assets)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}