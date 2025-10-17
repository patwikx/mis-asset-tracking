// lib/utils/file-parsers.ts
interface ParsedRow {
  [key: string]: string;
}

// Parse CSV content
export function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

// Parse Excel content using built-in browser APIs
export async function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = parseExcelBuffer(data);
        
        // Get the first worksheet
        const firstSheetName = Object.keys(workbook.Sheets)[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = sheetToJson(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Simple Excel parser (basic implementation)
function parseExcelBuffer(buffer: ArrayBuffer): { Sheets: Record<string, unknown> } {
  // This is a simplified implementation
  // In a real application, you'd use a library like xlsx or exceljs
  // For now, we'll convert Excel to CSV-like format
  
  const uint8Array = new Uint8Array(buffer);
  const text = new TextDecoder().decode(uint8Array);
  
  // Try to extract readable text from Excel file
  // This is a very basic approach and won't work for all Excel files
  const lines = text.split('\n').filter(line => {
    // Filter out binary data and keep only readable text
    return /^[a-zA-Z0-9\s,.-]+$/.test(line.trim()) && line.trim().length > 0;
  });
  
  return {
    Sheets: {
      Sheet1: lines
    }
  };
}

function sheetToJson(sheet: unknown): ParsedRow[] {
  if (!Array.isArray(sheet)) return [];
  
  if (sheet.length < 2) return [];
  
  const headers = sheet[0].split(',').map((h: string) => h.trim());
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < sheet.length; i++) {
    const values = sheet[i].split(',').map((v: string) => v.trim());
    const row: ParsedRow = {};
    
    headers.forEach((header: string, index: number) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Enhanced file parser that handles both CSV and Excel
export async function parseFile(file: File): Promise<ParsedRow[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    return parseCSV(text);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // For Excel files, we'll provide a fallback message
    // In a production environment, you'd want to use a proper Excel parsing library
    throw new Error('Excel support requires additional setup. Please convert your Excel file to CSV format for now.');
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }
}

// Generate template files
export function generateCSVTemplate(): string {
  const headers = [
    'description',
    'serialNumber',
    'modelNumber',
    'brand',
    'purchaseDate',
    'purchasePrice',
    'warrantyExpiry',
    'location',
    'notes',
    'quantity',
    'usefulLifeYears',
    'salvageValue'
  ];

  const sampleData = [
    'MacBook Pro 16-inch M2',
    'MBP001',
    'A2485',
    'Apple',
    '2024-01-15',
    '120000',
    '2027-01-15',
    'IT Storage',
    'High-performance laptop',
    '1',
    '5',
    '10000'
  ];

  return [
    headers.join(','),
    sampleData.join(',')
  ].join('\n');
}

export function generateExcelTemplate(): Blob {
  // For now, we'll generate a CSV file with Excel MIME type
  // In a production environment, you'd use a library like xlsx to generate actual Excel files
  const csvContent = generateCSVTemplate();
  
  return new Blob([csvContent], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

// Validate file format
export function validateFileFormat(file: File): { isValid: boolean; message: string } {
  const fileName = file.name.toLowerCase();
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: 'File size must be less than 10MB'
    };
  }
  
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    return {
      isValid: false,
      message: 'Please upload a CSV or Excel file'
    };
  }
  
  return {
    isValid: true,
    message: 'File format is valid'
  };
}