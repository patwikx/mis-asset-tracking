// components/assets/asset-barcodes-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  QrCode, 
  Scan, 
  Settings,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  generateBarcodesForAssets,
  scanBarcode,
  quickAssetLookup,
  getBarcodeSettings,
  updateBarcodeSettings
} from '@/lib/actions/barcode-actions';
import { getCurrentUser } from '@/lib/current-user';
import type {
  AssetBarcode,
  ScanResult,
  AssetLookupResult,
  BarcodeGenerationRequest,
  QuickLookupFilters,
  BarcodeSettings
} from '@/types/barcode-types';

interface AssetBarcodesPageProps {
  businessUnitId: string;
}

export function AssetBarcodesPage({ businessUnitId }: AssetBarcodesPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  
  // Generate barcodes state
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetLookupResult[]>([]);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<AssetBarcode[]>([]);
  
  // Scan state
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  
  // Search state
  const [searchFilters, setSearchFilters] = useState<QuickLookupFilters>({});
  const [searchResults, setSearchResults] = useState<AssetLookupResult[]>([]);
  
  // Settings state
  const [barcodeSettings, setBarcodeSettings] = useState<BarcodeSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Generation request state
  const [generationRequest, setGenerationRequest] = useState<Partial<BarcodeGenerationRequest>>({
    barcodeType: 'QR_CODE',
    includeCompanyLogo: false
  });



  const loadBarcodeSettings = useCallback(async () => {
    try {
      const settings = await getBarcodeSettings(businessUnitId);
      setBarcodeSettings(settings);
      
      // Update generation request with default settings
      setGenerationRequest(prev => ({
        ...prev,
        barcodeType: settings.defaultBarcodeType,
        includeCompanyLogo: settings.includeCompanyLogo
      }));
    } catch (error) {
      toast.error('Failed to load barcode settings');
    }
  }, [businessUnitId]);

  const loadAvailableAssets = useCallback(async () => {
    try {
      // Load only assets without barcodes for generation
      const assets = await quickAssetLookup(businessUnitId, { hasBarcode: false });
      setAvailableAssets(assets);
    } catch (error) {
      toast.error('Failed to load available assets');
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadBarcodeSettings();
    loadAvailableAssets();
  }, [loadBarcodeSettings, loadAvailableAssets]);

  const handleGenerateBarcodes = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    if (!generationRequest.barcodeType) {
      toast.error('Please select a barcode type');
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateBarcodesForAssets(businessUnitId, {
        assetIds: selectedAssets,
        barcodeType: generationRequest.barcodeType,
        includeCompanyLogo: generationRequest.includeCompanyLogo || false
      });

      if (result.success) {
        setGeneratedBarcodes(result.generatedAssets);
        setSelectedAssets([]);
        toast.success(`Generated ${result.generatedAssets.length} barcodes successfully`);
      } else {
        toast.error(result.error || 'Failed to generate barcodes');
      }
    } catch (error) {
      toast.error('Failed to generate barcodes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanBarcode = async () => {
    if (!scanInput.trim()) {
      toast.error('Please enter a barcode value');
      return;
    }

    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('You must be logged in to scan barcodes');
        return;
      }

      const result = await scanBarcode(businessUnitId, scanInput.trim(), user.id);
      setScanResult(result);
      
      if (result.success) {
        setScanHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 scans
        toast.success('Barcode scanned successfully');
      } else {
        toast.error(result.error || 'Barcode not found');
      }
      
      setScanInput('');
    } catch (error) {
      toast.error('Failed to scan barcode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = async () => {
    setIsLoading(true);
    try {
      const results = await quickAssetLookup(businessUnitId, searchFilters);
      setSearchResults(results);
    } catch (error) {
      toast.error('Failed to search assets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!barcodeSettings) return;

    setIsLoading(true);
    try {
      const result = await updateBarcodeSettings(businessUnitId, barcodeSettings);
      
      if (result.success) {
        toast.success('Barcode settings updated successfully');
        setShowSettings(false);
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, assetId]);
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(availableAssets.map(asset => asset.id));
    } else {
      setSelectedAssets([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Barcode Management</h1>
            <p className="text-muted-foreground">Generate, scan, and manage asset barcodes</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/${businessUnitId}/assets/inventory-verification`)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Inventory Verification
          </Button>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Barcode Settings</DialogTitle>
              </DialogHeader>
              {barcodeSettings && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Barcode Type</Label>
                    <Select 
                      value={barcodeSettings.defaultBarcodeType} 
                      onValueChange={(value: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13') => setBarcodeSettings(prev => prev ? {...prev, defaultBarcodeType: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QR_CODE">QR Code</SelectItem>
                        <SelectItem value="CODE_128">Code 128</SelectItem>
                        <SelectItem value="CODE_39">Code 39</SelectItem>
                        <SelectItem value="EAN_13">EAN 13</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Barcode Prefix</Label>
                    <Input
                      value={barcodeSettings.barcodePrefix}
                      onChange={(e) => setBarcodeSettings(prev => prev ? {...prev, barcodePrefix: e.target.value} : null)}
                      placeholder="e.g., AST"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeCompanyLogo"
                      checked={barcodeSettings.includeCompanyLogo}
                      onCheckedChange={(checked) => setBarcodeSettings(prev => prev ? {...prev, includeCompanyLogo: !!checked} : null)}
                    />
                    <Label htmlFor="includeCompanyLogo">Include Company Logo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="autoGenerate"
                      checked={barcodeSettings.autoGenerateOnAssetCreation}
                      onCheckedChange={(checked) => setBarcodeSettings(prev => prev ? {...prev, autoGenerateOnAssetCreation: !!checked} : null)}
                    />
                    <Label htmlFor="autoGenerate">Auto-generate on asset creation</Label>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowSettings(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSettings} disabled={isLoading}>
                      {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1">
            {[
              { id: 'generate', label: 'Generate Barcodes', icon: QrCode },
              { id: 'scan', label: 'Scan Barcode', icon: Scan },
              { id: 'search', label: 'Quick Search', icon: Search }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'generate' && (
            <div className="space-y-6">
              {/* Generation Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode Type</Label>
                  <Select 
                    value={generationRequest.barcodeType} 
                    onValueChange={(value: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13') => setGenerationRequest(prev => ({...prev, barcodeType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QR_CODE">QR Code</SelectItem>
                      <SelectItem value="CODE_128">Code 128</SelectItem>
                      <SelectItem value="CODE_39">Code 39</SelectItem>
                      <SelectItem value="EAN_13">EAN 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox 
                    id="includeCompanyLogoGen"
                    checked={generationRequest.includeCompanyLogo || false}
                    onCheckedChange={(checked) => setGenerationRequest(prev => ({...prev, includeCompanyLogo: !!checked}))}
                  />
                  <Label htmlFor="includeCompanyLogoGen">Include Company Logo</Label>
                </div>
              </div>

              {/* Asset Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Select Assets</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-muted-foreground">
                        Showing {availableAssets.length} assets without barcodes
                      </div>
                      <Button variant="ghost" size="sm" onClick={loadAvailableAssets} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="selectAll"
                        checked={selectedAssets.length === availableAssets.length && availableAssets.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="selectAll">Select All ({availableAssets.length})</Label>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Barcode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={(checked) => handleAssetSelection(asset.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{asset.itemCode}</TableCell>
                          <TableCell>{asset.description}</TableCell>
                          <TableCell>{asset.category}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{asset.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-600">
                              No Barcode
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleGenerateBarcodes} disabled={isLoading || selectedAssets.length === 0}>
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate Barcodes ({selectedAssets.length})
                </Button>
              </div>

              {/* Generated Barcodes */}
              {generatedBarcodes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Generated Barcodes</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tag Number</TableHead>
                          <TableHead>Barcode Value</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Generated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generatedBarcodes.map((barcode, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{barcode.tagNumber}</TableCell>
                            <TableCell className="font-mono text-sm">{barcode.barcodeValue}</TableCell>
                            <TableCell>{barcode.barcodeType}</TableCell>
                            <TableCell>{barcode.barcodeGenerated.toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Label htmlFor="scanInput">Barcode Value</Label>
                  <Input
                    id="scanInput"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Enter or scan barcode value"
                    onKeyDown={(e) => e.key === 'Enter' && handleScanBarcode()}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleScanBarcode} disabled={isLoading}>
                    {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    <Scan className="h-4 w-4 mr-2" />
                    Scan
                  </Button>
                </div>
              </div>

              {/* Scan Result */}
              {scanResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {scanResult.success ? (
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                      )}
                      Scan Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scanResult.success && scanResult.asset ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Item Code</Label>
                          <p className="font-medium">{scanResult.asset.itemCode}</p>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <p>{scanResult.asset.description}</p>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <p>{scanResult.asset.category}</p>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Badge variant="secondary">{scanResult.asset.status}</Badge>
                        </div>
                        <div>
                          <Label>Location</Label>
                          <p>{scanResult.asset.currentLocation || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label>Assigned To</Label>
                          <p>{scanResult.asset.assignedTo || 'Not assigned'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-600">{scanResult.error}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Scan History */}
              {scanHistory.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Scans</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanHistory.map((scan, index) => (
                          <TableRow key={index}>
                            <TableCell>{scan.scanTimestamp.toLocaleTimeString()}</TableCell>
                            <TableCell className="font-mono text-sm">{scan.scannedValue}</TableCell>
                            <TableCell>{scan.asset?.itemCode || 'Not found'}</TableCell>
                            <TableCell>
                              {scan.success ? (
                                <Badge variant="default">Success</Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Search Term</Label>
                  <Input
                    value={searchFilters.searchTerm || ''}
                    onChange={(e) => setSearchFilters(prev => ({...prev, searchTerm: e.target.value}))}
                    placeholder="Item code or description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={searchFilters.category || ''}
                    onChange={(e) => setSearchFilters(prev => ({...prev, category: e.target.value}))}
                    placeholder="Asset category"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={searchFilters.status || ''} 
                    onValueChange={(value) => setSearchFilters(prev => ({...prev, status: value || undefined}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="DEPLOYED">Deployed</SelectItem>
                      <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Barcode Status</Label>
                  <Select 
                    value={searchFilters.hasBarcode === undefined ? '' : searchFilters.hasBarcode ? 'true' : 'false'} 
                    onValueChange={(value) => setSearchFilters(prev => ({
                      ...prev, 
                      hasBarcode: value === '' ? undefined : value === 'true'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All assets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Assets</SelectItem>
                      <SelectItem value="true">Has Barcode</SelectItem>
                      <SelectItem value="false">No Barcode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleQuickSearch} disabled={isLoading}>
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  <Search className="h-4 w-4 mr-2" />
                  Search Assets
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Search Results ({searchResults.length})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Barcode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-medium">{asset.itemCode}</TableCell>
                            <TableCell>{asset.description}</TableCell>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{asset.status}</Badge>
                            </TableCell>
                            <TableCell>{asset.currentLocation || 'Not specified'}</TableCell>
                            <TableCell>{asset.assignedTo || 'Not assigned'}</TableCell>
                            <TableCell>
                              {asset.barcodeValue ? (
                                <Badge variant="default" className="text-green-600">
                                  Has Barcode
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600">
                                  No Barcode
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}