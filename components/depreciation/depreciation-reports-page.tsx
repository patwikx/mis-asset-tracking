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
import { getDepreciationReportData, generateDepreciationExcel, generateDepreciationCSV } from '@/lib/actions/depreciation-export-actions';
import { generateDepreciationPDF } from '@/lib/utils/pdf-generator';
import type { DepreciationReportData } from '@/types/depreciation-reports-types';

interface DepreciationReportsPageProps {
  businessUnitId: string;
  businessUnitName?: string;
}

export function DepreciationReportsPage({ businessUnitId, businessUnitName }: DepreciationReportsPageProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1) // Start of current year
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentReport, setCurrentReport] = useState<DepreciationReportData | null>(null);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await getDepreciationReportData(businessUnitId, {
        startDate,
        endDate
      });
      
      if (result.success && result.data) {
        setCurrentReport(result.data);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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
      let result;
      
      switch (format) {
        case 'PDF':
          // Use client-side PDF generation with business unit name
          generateDepreciationPDF(currentReport, businessUnitName);
          toast.success('PDF exported successfully');
          return;
        case 'EXCEL':
          result = await generateDepreciationExcel(businessUnitId);
          break;
        case 'CSV':
          result = await generateDepreciationCSV(businessUnitId);
          break;
        default:
          throw new Error('Unsupported format');
      }
      
      if (result && result.success) {
        toast.success(result.message);
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
      } else {
        toast.error(result?.message || 'Export failed');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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

    // Enhanced print styles matching PDF design
    const printStyles = `
      <style>
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          
          body * { 
            visibility: hidden; 
          }
          
          #depreciation-report, #depreciation-report * { 
            visibility: visible; 
          }
          
          #depreciation-report { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
          }

          /* Header styles matching PDF */
          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }

          .print-company-name {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .print-report-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 12px;
          }

          .print-report-date {
            font-size: 10pt;
            font-weight: normal;
            text-transform: uppercase;
            margin-bottom: 20px;
          }

          /* Summary section */
          .print-summary {
            margin-bottom: 20px;
          }

          .print-summary-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .print-summary-table {
            width: 200px;
            border-collapse: collapse;
          }

          .print-summary-table td {
            padding: 2px 5px;
            border: none;
          }

          .print-summary-table td:first-child {
            width: 120px;
            text-align: left;
          }

          .print-summary-table td:last-child {
            width: 80px;
            text-align: right;
          }

          /* Asset details section */
          .print-details {
            margin-top: 20px;
          }

          .print-details-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 2px;
          }

          .print-details-line {
            border-bottom: 0.3px solid black;
            margin-bottom: 8px;
          }

          .print-assets-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }

          .print-assets-table th {
            font-weight: bold;
            font-size: 10pt;
            text-align: center;
            padding: 3px;
            border: none;
          }

          .print-assets-table td {
            padding: 3px;
            border: none;
            vertical-align: top;
          }

          .print-assets-table .col-code { width: 10%; text-align: left; }
          .print-assets-table .col-desc { width: 20%; text-align: left; }
          .print-assets-table .col-category { width: 11%; text-align: left; }
          .print-assets-table .col-purchase { width: 13%; text-align: right; }
          .print-assets-table .col-current { width: 13%; text-align: right; }
          .print-assets-table .col-accumulated { width: 13%; text-align: right; }
          .print-assets-table .col-monthly { width: 13%; text-align: right; }
          .print-assets-table .col-method { width: 7%; text-align: center; }

          /* Footer */
          .print-footer {
            position: fixed;
            bottom: 20px;
            left: 5mm;
            right: 5mm;
            border-top: 0.3px solid black;
            padding-top: 8px;
            font-size: 8pt;
          }

          .print-footer-left {
            float: left;
          }

          .print-footer-right {
            float: right;
          }

          /* Hide elements that shouldn't print */
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
          
          /* Show print-only elements */
          .print\\:block { display: block !important; }
          .print\\:inline-block { display: inline-block !important; }
          .print\\:table { display: table !important; }
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

  const handleQuickReport = async (type: 'current-year' | 'previous-year' | 'current-quarter') => {
    let newStartDate: Date;
    let newEndDate: Date;

    switch (type) {
      case 'current-year':
        const currentYear = new Date().getFullYear();
        newStartDate = new Date(currentYear, 0, 1);
        newEndDate = new Date(currentYear, 11, 31);
        break;
      case 'previous-year':
        const lastYear = new Date().getFullYear() - 1;
        newStartDate = new Date(lastYear, 0, 1);
        newEndDate = new Date(lastYear, 11, 31);
        break;
      case 'current-quarter':
        const currentDate = new Date();
        newStartDate = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
        newEndDate = currentDate;
        break;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Generate report immediately
    setIsGenerating(true);
    try {
      const result = await getDepreciationReportData(businessUnitId, {
        startDate: newStartDate,
        endDate: newEndDate
      });
      
      if (result.success && result.data) {
        setCurrentReport(result.data);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to generate depreciation report');
    } finally {
      setIsGenerating(false);
    }
  };

  const displayName = businessUnitName || 'COMPANY NAME';

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

      {/* Report Viewer with Print Structure */}
      {currentReport && (
        <div id="depreciation-report">
          {/* Print-only header */}
          <div className="print:block hidden print-header">
            <div className="print-company-name">{displayName.toUpperCase()}</div>
            <div className="print-report-title">ASSET DEPRECIATION REPORT</div>
            <div className="print-report-date">
              AS OF {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: '2-digit' 
              }).toUpperCase()}
            </div>
          </div>

          {/* Summary Section */}
          <div className="print-summary">
            <div className="print-summary-title print:block hidden">SUMMARY</div>
            <table className="print-summary-table print:table hidden">
              <tbody>
                <tr>
                  <td>Total Assets</td>
                  <td>{currentReport.summary.totalAssets.toString()}</td>
                </tr>
                <tr>
                  <td>Total Original Value</td>
                  <td>PHP {currentReport.summary.totalOriginalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Total Current Book Value</td>
                  <td>PHP {currentReport.summary.totalCurrentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Total Accumulated Depreciation</td>
                  <td>PHP {currentReport.summary.totalAccumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Depreciation Rate</td>
                  <td>{currentReport.summary.depreciationRate.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Asset Details Section */}
          <div className="print-details">
            <div className="print-details-title print:block hidden">ASSET DETAILS</div>
            <div className="print-details-line print:block hidden"></div>
            
            <table className="print-assets-table print:table hidden">
              <thead>
                <tr>
                  <th className="col-code">Item Code</th>
                  <th className="col-desc">Description</th>
                  <th className="col-category">Category</th>
                  <th className="col-purchase">Purchase Price</th>
                  <th className="col-current">Current Value</th>
                  <th className="col-accumulated">Accumulated Dep.</th>
                  <th className="col-monthly">Monthly Dep.</th>
                  <th className="col-method">Method</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.assetDetails.map((asset, index) => (
                  <tr key={index}>
                    <td className="col-code">{asset.itemCode}</td>
                    <td className="col-desc">
                      {asset.description.length > 30 ? 
                        asset.description.substring(0, 30) + '...' : 
                        asset.description
                      }
                    </td>
                    <td className="col-category">{asset.category}</td>
                    <td className="col-purchase">PHP {asset.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="col-current">PHP {asset.currentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="col-accumulated">PHP {asset.accumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="col-monthly">PHP {asset.monthlyDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="col-method">{asset.depreciationMethod.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Print-only footer */}
          <div className="print-footer print:block hidden">
            <div className="print-footer-left">
              Generated: {new Date().toLocaleString()}
            </div>
            <div className="print-footer-right">
              Period: {currentReport.reportPeriod.startDate.toLocaleDateString()} - {currentReport.reportPeriod.endDate.toLocaleDateString()}
            </div>
          </div>

          {/* Screen version - your existing DepreciationReportViewer */}
          <div className="print:hidden">
            <DepreciationReportViewer
              report={currentReport}
              onExport={handleExport}
              onPrint={handlePrint}
              isExporting={isExporting}
            />
          </div>
        </div>
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
                onClick={() => handleQuickReport('current-year')}
                disabled={isGenerating}
              >
                <FileText className="h-6 w-6 mb-2" />
                Current Year Report
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => handleQuickReport('previous-year')}
                disabled={isGenerating}
              >
                <FileText className="h-6 w-6 mb-2" />
                Previous Year Report
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => handleQuickReport('current-quarter')}
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