import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DepreciationReportData } from '@/types/depreciation-reports-types';

// Extend jsPDF interface to include autoTable method
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export function generateDepreciationPDF(reportData: DepreciationReportData, businessUnitName?: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const displayName = businessUnitName || 'COMPANY NAME';
  const pageWidth = 297; // A4 landscape width
  const margin = 5; // Small margin
  
  // Company Header (Bold, centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(displayName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
  
  // Report Title
  doc.setFontSize(12);
  doc.text('ASSET DEPRECIATION REPORT', pageWidth / 2, 28, { align: 'center' });
  
  // Report Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`AS OF ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: '2-digit' 
  }).toUpperCase()}`, pageWidth / 2, 40, { align: 'center' });

  // Summary Section
  let currentY = 55;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SUMMARY', margin, currentY);
  currentY += 8;
  
  // Summary table - wider to use available space
  const summaryData = [
    ['Total Assets', reportData.summary.totalAssets.toString()],
    ['Total Original Value', `PHP ${reportData.summary.totalOriginalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Total Current Book Value', `PHP ${reportData.summary.totalCurrentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Total Accumulated Depreciation', `PHP ${reportData.summary.totalAccumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Depreciation Rate', `${reportData.summary.depreciationRate.toFixed(2)}%`]
  ];

  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: { top: 2, bottom: 2, left: 5, right: 5 },
      fillColor: false,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { 
        cellWidth: 120,
        halign: 'left',
        fontStyle: 'normal'
      },
      1: { 
        cellWidth: 80,
        halign: 'right',
        fontStyle: 'normal'
      }
    },
    margin: { left: margin, right: margin }
  });

  // Asset Details Section
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ASSET DETAILS', margin, currentY);
  
  // Add a clean horizontal line under the header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
  
  currentY += 8;

  const assetHeaders = [
    'Item Code', 
    'Description', 
    'Category', 
    'Purchase Price',
    'Current Value', 
    'Accumulated Dep.', 
    'Monthly Dep.', 
    'Method'
  ];
  
  const assetData: (string | number)[][] = reportData.assetDetails.map(asset => [
    asset.itemCode,
    asset.description.length > 30 ? asset.description.substring(0, 30) + '...' : asset.description,
    asset.category,
    `PHP ${asset.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `PHP ${asset.currentBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `PHP ${asset.accumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `PHP ${asset.monthlyDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    asset.depreciationMethod.replace('_', ' ')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [assetHeaders],
    body: assetData,
    theme: 'plain',
    headStyles: { 
      fillColor: false,
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      fillColor: false,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'left' },   // Item Code
      1: { cellWidth: 55, halign: 'left' },   // Description - increased for more space
      2: { cellWidth: 30, halign: 'left' },   // Category
      3: { cellWidth: 35, halign: 'right' },  // Purchase Price
      4: { cellWidth: 35, halign: 'right' },  // Current Value
      5: { cellWidth: 35, halign: 'right' },  // Accumulated Dep.
      6: { cellWidth: 35, halign: 'right' },  // Monthly Dep.
      7: { cellWidth: 24, halign: 'center' }  // Method
    },
    margin: { left: margin, right: margin }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Add a simple black line above footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, finalY, pageWidth - margin, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, finalY + 8);
  doc.text(`Period: ${reportData.reportPeriod.startDate.toLocaleDateString()} - ${reportData.reportPeriod.endDate.toLocaleDateString()}`, margin, finalY + 15);

  // Save the PDF
  doc.save(`asset-depreciation-report-${new Date().toISOString().split('T')[0]}.pdf`);
}