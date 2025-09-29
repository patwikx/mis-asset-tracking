/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/depreciation/depreciation-card.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { calculateAssetDepreciation } from '@/lib/actions/depreciation-actions';
import type { SerializedAssetWithRelations } from '@/lib/utils/serialization';

interface DepreciationCardProps {
  asset: SerializedAssetWithRelations;
  onDepreciationCalculated?: () => void;
}

export function DepreciationCard({ asset, onDepreciationCalculated }: DepreciationCardProps) {
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateDepreciation = async () => {
    setIsCalculating(true);
    try {
      const result = await calculateAssetDepreciation(asset.id);
      
      if (result.success) {
        toast.success(result.message);
        onDepreciationCalculated?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to calculate depreciation');
    } finally {
      setIsCalculating(false);
    }
  };

  // Now these are all numbers (or null), so we can safely perform arithmetic
  const currentBookValue = asset.currentBookValue || asset.purchasePrice || 0;
  const originalValue = asset.purchasePrice || 0;
  const accumulatedDepreciation = asset.accumulatedDepreciation || 0;
  const salvageValue = asset.salvageValue || 0;

  const depreciationPercentage = originalValue > 0 
    ? (accumulatedDepreciation / (originalValue - salvageValue)) * 100 
    : 0;

  const isDueForDepreciation = asset.nextDepreciationDate && 
    new Date(asset.nextDepreciationDate) <= new Date();

  const getDepreciationMethodLabel = (method: string) => {
    switch (method) {
      case 'STRAIGHT_LINE':
        return 'Straight Line';
      case 'DECLINING_BALANCE':
        return 'Declining Balance';
      case 'UNITS_OF_PRODUCTION':
        return 'Units of Production';
      case 'SUM_OF_YEARS_DIGITS':
        return 'Sum of Years Digits';
      default:
        return method;
    }
  };

  if (!asset.purchasePrice || !asset.usefulLifeMonths) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Depreciation Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Depreciation not configured</p>
            <p className="text-sm">Purchase price and useful life required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Depreciation Information
          </div>
          {isDueForDepreciation && (
            <Badge variant="destructive">Due for Calculation</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Values */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Current Book Value</Label>
            <p className="text-lg font-semibold flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ₱{currentBookValue.toLocaleString()}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Original Value</Label>
            <p className="text-lg font-semibold">
              ₱{originalValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Depreciation Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium text-muted-foreground">Depreciation Progress</Label>
            <span className="text-sm font-medium">{depreciationPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(depreciationPercentage, 100)} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>₱{salvageValue.toLocaleString()} (Salvage)</span>
            <span>₱{accumulatedDepreciation.toLocaleString()} (Depreciated)</span>
          </div>
        </div>

        {/* Depreciation Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Method</Label>
            <p className="mt-1">{getDepreciationMethodLabel(asset.depreciationMethod || 'STRAIGHT_LINE')}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Monthly Depreciation</Label>
            <p className="mt-1">₱{(asset.monthlyDepreciation || 0).toLocaleString()}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Useful Life</Label>
            <p className="mt-1">{asset.usefulLifeYears || Math.ceil((asset.usefulLifeMonths || 0) / 12)} years</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Salvage Value</Label>
            <p className="mt-1">₱{salvageValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Next Depreciation Date */}
        {asset.nextDepreciationDate && !asset.isFullyDepreciated && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Next Depreciation</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(asset.nextDepreciationDate), 'PPP')}
                </p>
              </div>
            </div>
            {isDueForDepreciation && (
              <Button 
                size="sm" 
                onClick={handleCalculateDepreciation}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-2" />
                    Calculate
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Fully Depreciated Status */}
        {asset.isFullyDepreciated && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Asset is fully depreciated
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              Book value has reached salvage value
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}