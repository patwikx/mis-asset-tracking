// components/depreciation/depreciation-reports-page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileText, ChartBar as BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DepreciationReportViewer } from './depreciation-report-viewer';
import { generateDepreciationReport, exportDepreciationReport } from '@/lib/actions/depreciation-reports-actions';
import type { DepreciationReportData } from '@/types/depreciation-reports-types';

interface DepreciationReportsPageProps {
  businessUnitId: string;
}

export function DepreciationReportsPage({ businessUnitId }: DepreciationReportsPageProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1) // Start of current year
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isExporting, setIsExporting] = useState(false);
  const [currentReport, setCurrentReport] = useState<DepreciationReportData | null>(null);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateDepreciationReport(businessUnitId, startDate, endDate);
      
      if (result.success && result.report) {
        setCurrentReport(result.report);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate depreciation report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    if (!currentReport) {
      toast.error('Please generate a report first');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportDepreciationReport(businessUnitId, format, {
        startDate,
        endDate,
        includeSummary: true,
        includeSchedule: true,
        includeHistory: false
      });
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!currentReport) {
      toast.error('Please generate a report first');
      return;
    }

    // Add print styles
    const printStyles = `
      <style>
        @media print {
          body * { visibility: hidden; }
          #depreciation-report, #depreciation-report * { visibility: visible; }
          #depreciation-report { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:mb-6 { margin-bottom: 1.5rem !important; }
          .print\\:mt-8 { margin-top: 2rem !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-2 { border-width: 2px !important; }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem !important; }
        }
      </style>
    `;

    const head = document.head.innerHTML;
    document.head.innerHTML = head + printStyles;
    
    window.print();
    
    // Restore original head
    setTimeout(() => {
      document.head.innerHTML = head;
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="h-6 w-6 mr-2" />
            Depreciation Reports
          </h1>
          <p className="text-muted-foreground">
            Generate comprehensive depreciation reports and analytics
          </p>
        </div>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Depreciation Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating || !startDate || !endDate}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Viewer */}
      {currentReport && (
        <DepreciationReportViewer
          report={currentReport}
          onExport={handleExport}
          onPrint={handlePrint}
        />
      )}

      {/* Quick Report Templates */}
      {!currentReport && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  const currentYear = new Date().getFullYear();
                  setStartDate(new Date(currentYear, 0, 1));
                  setEndDate(new Date(currentYear, 11, 31));
                  setTimeout(handleGenerateReport, 100);
                }}
                disabled={isGenerating}
              >
                <FileText className="h-6 w-6 mb-2" />
                Current Year Report
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  const lastYear = new Date().getFullYear() - 1;
                  setStartDate(new Date(lastYear, 0, 1));
                  setEndDate(new Date(lastYear, 11, 31));
                  setTimeout(handleGenerateReport, 100);
                }}
                disabled={isGenerating}
              >
                <FileText className="h-6 w-6 mb-2" />
                Previous Year Report
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  const currentDate = new Date();
                  const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
                  setStartDate(quarterStart);
                  setEndDate(currentDate);
                  setTimeout(handleGenerateReport, 100);
                }}
                disabled={isGenerating}
              >
                <FileText className="h-6 w-6 mb-2" />
                Current Quarter Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}