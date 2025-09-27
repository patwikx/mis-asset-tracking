// app/api/reports/download/[id]/[format]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

interface RouteParams {
  params: Promise<{
    id: string;
    format: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, format } = await params;

    const report = await prisma.report.findUnique({
      where: { id }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const reportData = report.data as Record<string, unknown>;

    switch (format.toLowerCase()) {
      case 'pdf':
        return handlePDFDownload(report, reportData);
      case 'excel':
        return handleExcelDownload(report, reportData);
      case 'csv':
        return handleCSVDownload(report, reportData);
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json({ error: 'Failed to download report' }, { status: 500 });
  }
}

function handlePDFDownload(report: { name: string }, reportData: Record<string, unknown>) {
  // In a real implementation, you would generate actual PDF using libraries like:
  // - puppeteer (for HTML to PDF)
  // - jsPDF (for programmatic PDF generation)
  // - PDFKit (for Node.js PDF generation)
  
  const htmlContent = generateHTMLReport(report, reportData);
  
  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${report.name}.html"`
    }
  });
}

function handleExcelDownload(report: { name: string }, reportData: Record<string, unknown>) {
  // In a real implementation, you would use libraries like:
  // - exceljs
  // - xlsx
  // - node-xlsx
  
  const csvContent = generateCSVFromExcelData(reportData);
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${report.name}.csv"`
    }
  });
}

function handleCSVDownload(report: { name: string }, reportData: Record<string, unknown>) {
  const csvContent = reportData.csvContent as string || generateCSVFromData(reportData);
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${report.name}.csv"`
    }
  });
}

function generateHTMLReport(report: { name: string }, reportData: Record<string, unknown>): string {
  const summary = reportData.summary as Record<string, unknown>;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .number { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${report.name}</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Assets</h3>
            <p class="number">${summary?.totalAssets || 0}</p>
          </div>
          <div class="summary-card">
            <h3>Total Original Value</h3>
            <p class="number">₱${(summary?.totalOriginalValue as number || 0).toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Current Book Value</h3>
            <p class="number">₱${(summary?.totalCurrentBookValue as number || 0).toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>Total Depreciation</h3>
            <p class="number">₱${(summary?.totalAccumulatedDepreciation as number || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <p><em>This is a simplified HTML version. For full PDF functionality, integrate a PDF generation library.</em></p>
    </body>
    </html>
  `;
}

function generateCSVFromExcelData(reportData: Record<string, unknown>): string {
  const assets = reportData.assets as Array<Record<string, unknown>> || [];
  
  if (assets.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(assets[0]);
  const csvRows = assets.map(asset => 
    headers.map(header => `"${asset[header] || ''}"`).join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}

function generateCSVFromData(reportData: Record<string, unknown>): string {
  // Fallback CSV generation
  return `Report Data\n"${JSON.stringify(reportData)}"`;
}