// components/assets/depreciation/depreciation-schedule-dialog.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingDown, Loader as Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getDepreciationSchedule } from '@/lib/actions/depreciation-actions';
import type { DepreciationScheduleEntry } from '@/types/depreciation-types';
import { toast } from 'sonner';

interface DepreciationScheduleDialogProps {
  assetId: string;
  assetDescription: string;
  children: React.ReactNode;
}

export function DepreciationScheduleDialog({ 
  assetId, 
  assetDescription, 
  children 
}: DepreciationScheduleDialogProps) {
  const [schedule, setSchedule] = useState<DepreciationScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDepreciationSchedule(assetId);
      if (result.success && result.schedule) {
        setSchedule(result.schedule);
      }
    } catch (error) {
      toast.error(`Error loading depreciation schedule: ${error}`)
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (open) {
      loadSchedule();
    }
  }, [open, loadSchedule]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Depreciation Schedule
          </DialogTitle>
          <DialogDescription>
            Complete depreciation schedule for {assetDescription}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No depreciation schedule available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="pt-4">
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

            {/* Schedule Table */}
            <div className="border rounded-lg">
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}