/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/depreciation-schedule-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Download, Printer, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getDepreciationSchedule } from '@/lib/actions/depreciation-actions';
import type { DepreciationScheduleEntry } from '@/types/depreciation-types';
import type { SerializedAssetWithRelations } from '@/lib/utils/serialization';

interface DepreciationSchedulePageProps {
  asset: SerializedAssetWithRelations;
  businessUnitId: string;
}

export function DepreciationSchedulePage({ asset, businessUnitId }: DepreciationSchedulePageProps) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<DepreciationScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDepreciationSchedule(asset.id);
      if (result.success && result.schedule) {
        setSchedule(result.schedule);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to load depreciation schedule');
    } finally {
      setIsLoading(false);
    }
  }, [asset.id]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/${asset.id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Generate CSV export
    const csvHeaders = [
      'Period',
      'Date',
      'Book Value Start',
      'Depreciation Amount',
      'Book Value End',
      'Accumulated Depreciation'
    ];

    const csvRows = schedule.map(entry => [
      entry.period.toString(),
      format(entry.date, 'MMM yyyy'),
      entry.bookValueStart.toString(),
      entry.depreciationAmount.toString(),
      entry.bookValueEnd.toString(),
      entry.accumulatedDepreciation.toString()
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depreciation-schedule-${asset.itemCode}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Schedule exported to CSV');
  };

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
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Asset
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Depreciation Schedule</h1>
            <p className="text-muted-foreground">{asset.itemCode} - {asset.description}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Depreciation not configured</p>
              <p className="text-sm">Purchase price and useful life are required to generate a depreciation schedule</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Asset
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Calendar className="h-6 w-6 mr-2" />
              Depreciation Schedule
            </h1>
            <p className="text-muted-foreground">{asset.itemCode} - {asset.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Asset Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Original Value</Label>
              <p className="text-lg font-semibold">₱{asset.purchasePrice.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Current Book Value</Label>
              <p className="text-lg font-semibold">₱{(asset.currentBookValue || asset.purchasePrice).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Salvage Value</Label>
              <p className="text-lg font-semibold">₱{(asset.salvageValue || 0).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Method</Label>
              <Badge variant="outline">
                {getDepreciationMethodLabel(asset.depreciationMethod || 'STRAIGHT_LINE')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Summary */}
      {!isLoading && schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Periods</p>
                <p className="text-lg font-semibold">{schedule.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starting Value</p>
                <p className="text-lg font-semibold">
                  ₱{schedule[0]?.bookValueStart.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Final Value</p>
                <p className="text-lg font-semibold">
                  ₱{schedule[schedule.length - 1]?.bookValueEnd.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Depreciation</p>
                <p className="text-lg font-semibold">
                  ₱{schedule[schedule.length - 1]?.accumulatedDepreciation.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No depreciation schedule available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Period</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-right py-3 px-4 font-medium">Book Value Start</th>
                    <th className="text-right py-3 px-4 font-medium">Depreciation</th>
                    <th className="text-right py-3 px-4 font-medium">Book Value End</th>
                    <th className="text-right py-3 px-4 font-medium">Accumulated</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((entry) => (
                    <tr key={entry.period} className="border-b hover:bg-muted/25">
                      <td className="py-2 px-4">
                        <Badge variant="outline">
                          {entry.period}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {format(new Date(entry.date), 'MMM yyyy')}
                      </td>
                      <td className="py-2 px-4 text-right text-sm">
                        ₱{entry.bookValueStart.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-medium">
                        ₱{entry.depreciationAmount.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right text-sm">
                        ₱{entry.bookValueEnd.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-muted-foreground">
                        ₱{entry.accumulatedDepreciation.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}