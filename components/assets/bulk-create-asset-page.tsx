// components/assets/bulk-create-asset-page.tsx
'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { AssetStatus, DepreciationMethod } from '@prisma/client';
import {
  previewBulkAssetCreation,
  createBulkAssets,
  getAssetCategoriesForBulk
} from '@/lib/actions/bulk-asset-actions';
import { 
  parseFile, 
  generateCSVTemplate, 
  generateExcelTemplate, 
  validateFileFormat 
} from '@/lib/utils/file-parsers';
import type {
  BulkAssetCreationData,
  BulkAssetCreationOptions,
  BulkAssetPreview,
  BulkAssetCreationResult
} from '@/types/asset-types';
import { Popover } from '../ui/popover';

interface BulkAssetCreationPageProps {
  businessUnitId: string;
}

interface ParsedRow {
  [key: string]: string;
}

// Helper function to get status color
const getStatusColor = (status: AssetStatus): string => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'bg-green-500';
    case AssetStatus.DEPLOYED:
      return 'bg-blue-500';
    case AssetStatus.IN_MAINTENANCE:
      return 'bg-yellow-500';
    case AssetStatus.RETIRED:
      return 'bg-gray-500';
    case AssetStatus.LOST:
      return 'bg-red-500';
    case AssetStatus.DAMAGED:
      return 'bg-orange-500';
    case AssetStatus.FULLY_DEPRECIATED:
      return 'bg-purple-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format status text
const formatStatusText = (status: AssetStatus): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function BulkAssetCreationPage({ businessUnitId }: BulkAssetCreationPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [fileData, setFileData] = useState<ParsedRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [preview, setPreview] = useState<BulkAssetPreview | null>(null);
  const [processingResult, setProcessingResult] = useState<BulkAssetCreationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [options, setOptions] = useState<BulkAssetCreationOptions>({
    generateSequentialSerialNumbers: false,
    serialNumberPrefix: '',
    serialNumberStartNumber: 1,
    serialNumberPadding: 3,
    autoGenerateItemCodes: true
  });

  const [defaultValues, setDefaultValues] = useState<{
    categoryId: string;
    status: AssetStatus;
    depreciationMethod: DepreciationMethod;
    usefulLifeYears: number;
    salvageValue: number;
    startDepreciationImmediately: boolean;
  }>({
    categoryId: '',
    status: AssetStatus.AVAILABLE,
    depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    usefulLifeYears: 5,
    salvageValue: 0,
    startDepreciationImmediately: true
  });

  // Load categories on component mount
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getAssetCategoriesForBulk();
        setCategories(categoriesData);
      } catch (error) {
        toast.error('Failed to load categories');
      }
    };
    loadCategories();
  }, []);


  const downloadTemplate = (format: 'csv' | 'excel' = 'csv') => {
    let blob: Blob;
    let filename: string;
    
    if (format === 'excel') {
      blob = generateExcelTemplate();
      filename = 'bulk-assets-template.xlsx';
    } else {
      const csvContent = generateCSVTemplate();
      blob = new Blob([csvContent], { type: 'text/csv' });
      filename = 'bulk-assets-template.csv';
    }
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Removed parseCSV function - now using utility function

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file format
    const validation = validateFileFormat(file);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setUploadedFileName(file.name);

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const parsed = await parseFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setFileData(parsed);
      
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel';
      toast.success(`Loaded ${parsed.length} rows from ${fileType} file`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      toast.error(errorMessage);
      setFileData([]);
      setUploadedFileName('');
    } finally {
      setIsLoading(false);
    }
  };

  const convertFileDataToAssetData = useCallback((rows: ParsedRow[]): BulkAssetCreationData[] => {
    return rows.map(row => ({
      description: row.description || '',
      serialNumber: row.serialNumber || undefined,
      modelNumber: row.modelNumber || undefined,
      brand: row.brand || undefined,
      purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
      purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : undefined,
      warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : undefined,
      categoryId: defaultValues.categoryId,
      businessUnitId,
      quantity: row.quantity ? parseInt(row.quantity) : 1,
      status: defaultValues.status,
      location: row.location || undefined,
      notes: row.notes || undefined,
      
      // Depreciation fields
      depreciationMethod: defaultValues.depreciationMethod,
      usefulLifeYears: row.usefulLifeYears ? parseInt(row.usefulLifeYears) : defaultValues.usefulLifeYears,
      salvageValue: row.salvageValue ? parseFloat(row.salvageValue) : defaultValues.salvageValue,
      startDepreciationImmediately: defaultValues.startDepreciationImmediately
    }));
  }, [defaultValues, businessUnitId]);

  const handlePreview = async () => {
    if (fileData.length === 0) {
      toast.error('Please upload a file first');
      return;
    }

    if (!defaultValues.categoryId) {
      toast.error('Please select a default category');
      return;
    }

    setIsLoading(true);
    try {
      const assetData = convertFileDataToAssetData(fileData);
      const previewResult = await previewBulkAssetCreation(assetData, options, businessUnitId);
      setPreview(previewResult);
      
      if (previewResult.errors.length > 0) {
        toast.warning(`Preview generated with ${previewResult.errors.length} validation errors`);
      } else {
        toast.success('Preview generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssets = async () => {
    if (!preview || !preview.isValid) {
      toast.error('Please fix validation errors before creating assets');
      return;
    }

    setIsProcessing(true);
    try {
      const assetData = convertFileDataToAssetData(fileData);
      const result = await createBulkAssets(assetData, options, businessUnitId);
      setProcessingResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to create assets');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFileData([]);
    setUploadedFileName('');
    setPreview(null);
    setProcessingResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Bulk Create Assets</h1>
            <p className="text-muted-foreground">Import multiple assets from CSV or Excel files</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => downloadTemplate('csv')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV Template
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => downloadTemplate('excel')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Excel Template
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {processingResult?.success && (
            <Button onClick={() => router.push(`/${businessUnitId}/assets`)}>
              View Assets
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              File Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Upload CSV or Excel file with asset data</p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls)
                </p>
                {uploadedFileName && (
                  <p className="text-xs text-blue-600">
                    Uploaded: {uploadedFileName}
                  </p>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-4"
              />
              {isLoading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </div>

            {fileData.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully loaded {fileData.length} rows from {uploadedFileName}
                </AlertDescription>
              </Alert>
            )}

            {/* Default Values */}
            <div className="space-y-4">
              <Separator />
              <h3 className="font-medium">Default Values</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultCategory">Default Category *</Label>
                  <Select 
                    value={defaultValues.categoryId} 
                    onValueChange={(value) => setDefaultValues(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultStatus">Default Status</Label>
                  <Select 
                    value={defaultValues.status} 
                    onValueChange={(value) => setDefaultValues(prev => ({ ...prev, status: value as AssetStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(defaultValues.status)}`} />
                          {formatStatusText(defaultValues.status)}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AssetStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                            {formatStatusText(status)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultUsefulLife">Default Useful Life (Years)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={defaultValues.usefulLifeYears}
                    onChange={(e) => setDefaultValues(prev => ({ 
                      ...prev, 
                      usefulLifeYears: parseInt(e.target.value) || 5 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultSalvageValue">Default Salvage Value</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={defaultValues.salvageValue}
                    onChange={(e) => setDefaultValues(prev => ({ 
                      ...prev, 
                      salvageValue: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options Section */}
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoGenerateItemCodes">Auto-generate Item Codes</Label>
                <p className="text-xs text-muted-foreground">Generate unique item codes automatically</p>
              </div>
              <Switch
                id="autoGenerateItemCodes"
                checked={options.autoGenerateItemCodes}
                onCheckedChange={(checked) => setOptions(prev => ({ 
                  ...prev, 
                  autoGenerateItemCodes: checked 
                }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="generateSequentialSerialNumbers">Sequential Serial Numbers</Label>
                <p className="text-xs text-muted-foreground">Generate sequential serial numbers</p>
              </div>
              <Switch
                id="generateSequentialSerialNumbers"
                checked={options.generateSequentialSerialNumbers}
                onCheckedChange={(checked) => setOptions(prev => ({ 
                  ...prev, 
                  generateSequentialSerialNumbers: checked 
                }))}
              />
            </div>

            {options.generateSequentialSerialNumbers && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="serialNumberPrefix">Serial Number Prefix</Label>
                  <Input
                    id="serialNumberPrefix"
                    value={options.serialNumberPrefix}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      serialNumberPrefix: e.target.value 
                    }))}
                    placeholder="e.g., MON-"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="serialNumberStartNumber">Start Number</Label>
                    <Input
                      id="serialNumberStartNumber"
                      type="number"
                      min="1"
                      value={options.serialNumberStartNumber}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        serialNumberStartNumber: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumberPadding">Padding</Label>
                    <Input
                      id="serialNumberPadding"
                      type="number"
                      min="1"
                      max="10"
                      value={options.serialNumberPadding}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        serialNumberPadding: parseInt(e.target.value) || 3 
                      }))}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <strong>Preview:</strong> {options.serialNumberPrefix}
                  {(options.serialNumberStartNumber || 1).toString().padStart(options.serialNumberPadding || 3, '0')}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Button 
                onClick={handlePreview} 
                disabled={isLoading || fileData.length === 0 || !defaultValues.categoryId}
                className="w-full"
              >
                {isLoading ? 'Generating Preview...' : 'Generate Preview'}
              </Button>

              {preview && (
                <Button 
                  onClick={handleCreateAssets} 
                  disabled={isProcessing || !preview.isValid}
                  className="w-full"
                  variant={preview.isValid ? "default" : "secondary"}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Assets...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create {preview.validRows} Assets
                    </>
                  )}
                </Button>
              )}

              <Button 
                onClick={resetForm} 
                variant="outline" 
                className="w-full"
              >
                Reset Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import Preview</span>
              <div className="flex space-x-2">
                <Badge variant={preview.isValid ? "default" : "destructive"}>
                  {preview.validRows}/{preview.totalRows} Valid
                </Badge>
                {preview.errors.length > 0 && (
                  <Badge variant="destructive">
                    {preview.errors.length} Errors
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Validation Errors */}
            {preview.errors.length > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Validation Errors Found:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {preview.errors.slice(0, 10).map((error, index) => (
                        <p key={index} className="text-xs">
                          Row {error.row}: {error.field && `${error.field} - `}{error.message}
                        </p>
                      ))}
                      {preview.errors.length > 10 && (
                        <p className="text-xs font-medium">
                          ... and {preview.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.previewData.slice(0, 10).map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell className="font-medium">{row.description}</TableCell>
                      <TableCell>{row.serialNumber || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{row.itemCode || '-'}</TableCell>
                      <TableCell>
                        {row.purchasePrice ? `₱${row.purchasePrice.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>{row.categoryName || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.previewData.length > 10 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  Showing 10 of {preview.previewData.length} rows
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Result */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import Results</span>
              <Badge variant={processingResult.success ? "default" : "destructive"}>
                {processingResult.success ? "Success" : "Partial Success"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {processingResult.createdCount}
                  </div>
                  <div className="text-sm text-green-700">Assets Created</div>
                </div>
                
                {processingResult.failedCount > 0 && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {processingResult.failedCount}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                )}

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {processingResult.createdAssetIds.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Processed</div>
                </div>
              </div>

              {processingResult.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Processing Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {processingResult.errors.map((error, index) => (
                          <p key={index} className="text-xs">
                            Row {error.row}: {error.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                {processingResult.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}