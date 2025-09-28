// lib/utils/deployment-pdf-generator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DeploymentReportData } from '@/types/deployment-report-types';

// Extend jsPDF interface to include autoTable method
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export function generateDeploymentPDF(reportData: DeploymentReportData, businessUnitName?: string) {
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
  doc.text('DEPLOYMENT & ASSIGNMENT REPORT', pageWidth / 2, 28, { align: 'center' });
  
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
  
  // Summary table
  const summaryData = [
    ['Total Deployments', reportData.summary.totalDeployments.toString()],
    ['Active Deployments', reportData.summary.activeDeployments.toString()],
    ['Pending Approvals', reportData.summary.pendingApprovals.toString()],
    ['Returned Deployments', reportData.summary.returnedDeployments.toString()],
    ['Utilization Rate', `${reportData.summary.utilizationRate.toFixed(2)}%`],
    ['Avg. Duration', `${reportData.summary.averageDeploymentDuration.toFixed(1)} days`]
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

  // Deployment Details Section
  currentY = doc.lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DEPLOYMENT DETAILS', margin, currentY);
  
  // Add a clean horizontal line under the header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
  
  currentY += 8;

  const deploymentHeaders = [
    'Transmittal #', 
    'Asset', 
    'Employee', 
    'Status',
    'Deployed Date',
    'Expected Return', 
    'Returned Date'
  ];
  
  const deploymentData: (string | number)[][] = reportData.deploymentDetails.map(deployment => [
    deployment.transmittalNumber,
    deployment.assetDescription.length > 25 ? deployment.assetDescription.substring(0, 25) + '...' : deployment.assetDescription,
    deployment.employeeName,
    deployment.status.replace('_', ' '),
    deployment.deployedDate ? deployment.deployedDate.toLocaleDateString() : 'N/A',
    deployment.expectedReturnDate ? deployment.expectedReturnDate.toLocaleDateString() : 'N/A',
    deployment.returnedDate ? deployment.returnedDate.toLocaleDateString() : 'N/A'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [deploymentHeaders],
    body: deploymentData,
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
      0: { cellWidth: 35, halign: 'left' },   // Transmittal #
      1: { cellWidth: 55, halign: 'left' },   // Asset
      2: { cellWidth: 45, halign: 'left' },   // Employee
      3: { cellWidth: 30, halign: 'center' }, // Status
      4: { cellWidth: 35, halign: 'center' }, // Deployed Date
      5: { cellWidth: 35, halign: 'center' }, // Expected Return
      6: { cellWidth: 35, halign: 'center' }  // Returned Date
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
  doc.save(`deployment-report-${new Date().toISOString().split('T')[0]}.pdf`);
}