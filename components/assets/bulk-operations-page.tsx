/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/bulk-operations-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Edit3, 
  Send, 
  RotateCcw, 
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AssetStatus } from '@prisma/client';
import {
  getAssetsBySelection,
  previewBulkOperation,
  bulkUpdateAssets,
  bulkCreateDeployments,
  bulkReturnAssets,
  bulkDeleteAssets
} from '@/lib/actions/bulk-operations-actions';
import { getEmployees } from '@/lib/actions/deployment-actions';
import { getAssetCategories } from '@/lib/actions/asset-actions';
import type {
  AssetWithRelations,
  AssetSelectionCriteria,
  BulkOperationPreview,
  BulkAssetOperationResult,
  BulkAssetUpdateData,
  BulkDeploymentCreationData,
  BulkReturnData
} from '@/types/asset-types';

interface BulkOperationsPageProps {
  businessUnitId: string;
}

type OperationType = 'UPDATE' | 'DEPLOY' | 'RETURN' | 'DELETE';

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

export function BulkOperationsPage({ businessUnitId }: BulkOperationsPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('UPDATE');
  const [assets, setAssets] = useState<AssetWithRelations[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string; employeeId: string }>>([]);
  const [preview, setPreview] = useState<BulkOperationPreview | null>(null);
  const [operationResult, setOperationResult] = useState<BulkAssetOperationResult | null>(null);

  // Selection criteria state
  const [selectionCriteria, setSelectionCriteria] = useState<AssetSelectionCriteria>({
    statuses: [AssetStatus.AVAILABLE],
    searchTerm: ''
  });

  // Operation-specific data
  const [updateData, setUpdateData] = useState({
    status: '',
    location: '',
    notes: '',
    categoryId: '',
    depreciationMethod: '',
    usefulLifeYears: '',
    salvageValue: ''
  });

  const [deploymentData, setDeploymentData] = useState({
    employeeId: '',
    expectedReturnDate: undefined as Date | undefined,
    deploymentNotes: '',
    deploymentCondition: ''
  });

  const [returnData, setReturnData] = useState({
    returnCondition: '',
    returnNotes: '',
    returnDate: new Date()
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesData, employeesData] = await Promise.all([
          getAssetCategories(),
          getEmployees(businessUnitId)
        ]);
        setCategories(categoriesData);
        setEmployees(employeesData);
      } catch (error) {
        toast.error('Failed to load initial data');
      }
    };
    loadInitialData();
  }, [businessUnitId]);


  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const assetsData = await getAssetsBySelection(businessUnitId, selectionCriteria);
      setAssets(assetsData);
      setSelectedAssetIds([]); // Reset selection when criteria changes
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, selectionCriteria]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSelectAll = () => {
    if (selectedAssetIds.length === assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map(asset => asset.id));
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetIds(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handlePreview = async () => {
    if (selectedAssetIds.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setIsLoading(true);
    try {
      const previewResult = await previewBulkOperation(
        businessUnitId,
        selectedOperation,
        selectedAssetIds
      );
      setPreview(previewResult);
      
      if (previewResult.warnings.length > 0) {
        toast.warning(`Preview generated with ${previewResult.warnings.length} warnings`);
      } else {
        toast.success('Preview generated successfully');
      }
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteOperation = async () => {
    if (!preview || !preview.canProceed) {
      toast.error('Cannot proceed with operation due to validation errors');
      return;
    }

    setIsProcessing(true);
    try {
      let result: BulkAssetOperationResult;

      switch (selectedOperation) {
        case 'UPDATE':
          const bulkUpdateData: BulkAssetUpdateData = {
            assetIds: selectedAssetIds,
            updates: {
              ...(updateData.status && { status: updateData.status as AssetStatus }),
              ...(updateData.location && { location: updateData.location }),
              ...(updateData.notes && { notes: updateData.notes }),
              ...(updateData.categoryId && { categoryId: updateData.categoryId }),
              ...(updateData.depreciationMethod && { depreciationMethod: updateData.depreciationMethod }),
              ...(updateData.usefulLifeYears && { usefulLifeYears: parseInt(updateData.usefulLifeYears) }),
              ...(updateData.salvageValue && { salvageValue: parseFloat(updateData.salvageValue) })
            }
          };
          result = await bulkUpdateAssets(businessUnitId, bulkUpdateData);
          break;

        case 'DEPLOY':
          const bulkDeploymentData: BulkDeploymentCreationData = {
            assetIds: selectedAssetIds,
            employeeId: deploymentData.employeeId,
            businessUnitId,
            expectedReturnDate: deploymentData.expectedReturnDate,
            deploymentNotes: deploymentData.deploymentNotes,
            deploymentCondition: deploymentData.deploymentCondition
          };
          result = await bulkCreateDeployments(bulkDeploymentData);
          break;

        case 'RETURN':
          // For return operations, we need deployment IDs, not asset IDs
          // This would need to be handled differently in a real implementation
          const bulkReturnData: BulkReturnData = {
            deploymentIds: [], // This needs to be populated with actual deployment IDs
            returnCondition: returnData.returnCondition,
            returnNotes: returnData.returnNotes,
            returnDate: returnData.returnDate
          };
          result = await bulkReturnAssets(businessUnitId, bulkReturnData);
          break;

        case 'DELETE':
          result = await bulkDeleteAssets(businessUnitId, selectedAssetIds);
          break;

        default:
          throw new Error('Invalid operation type');
      }

      setOperationResult(result);
      
      if (result.success) {
        toast.success(result.message);
        // Reload assets after successful operation
        loadAssets();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to execute operation');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedAssetIds([]);
    setPreview(null);
    setOperationResult(null);
    setUpdateData({
      status: '',
      location: '',
      notes: '',
      categoryId: '',
      depreciationMethod: '',
      usefulLifeYears: '',
      salvageValue: ''
    });
    setDeploymentData({
      employeeId: '',
      expectedReturnDate: undefined,
      deploymentNotes: '',
      deploymentCondition: ''
    });
    setReturnData({
      returnCondition: '',
      returnNotes: '',
      returnDate: new Date()
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Bulk Operations</h1>
            <p className="text-muted-foreground">Perform operations on multiple assets at once</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
          {operationResult?.success && (
            <Button onClick={() => router.push(`/${businessUnitId}/assets`)}>
              View Assets
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Operation Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { type: 'UPDATE' as OperationType, icon: Edit3, label: 'Update Assets', desc: 'Modify asset properties' },
              { type: 'DEPLOY' as OperationType, icon: Send, label: 'Deploy Assets', desc: 'Assign to employees' },
              { type: 'RETURN' as OperationType, icon: RotateCcw, label: 'Return Assets', desc: 'Process returns' },
              { type: 'DELETE' as OperationType, icon: Trash2, label: 'Delete Assets', desc: 'Remove from system' }
            ].map(({ type, icon: Icon, label, desc }) => (
              <Button
                key={type}
                variant={selectedOperation === type ? "default" : "outline"}
                className="w-full justify-start h-auto p-3"
                onClick={() => setSelectedOperation(type)}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="text-left">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Asset Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Asset Selection</span>
              <Badge variant="secondary">
                {selectedAssetIds.length} of {assets.length} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search Assets</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code, description, serial..."
                    value={selectionCriteria.searchTerm || ''}
                    onChange={(e) => setSelectionCriteria(prev => ({ 
                      ...prev, 
                      searchTerm: e.target.value 
                    }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select 
                  value={selectionCriteria.statuses?.[0] || ''} 
                  onValueChange={(value) => setSelectionCriteria(prev => ({ 
                    ...prev, 
                    statuses: value ? [value as AssetStatus] : undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All Statuses</SelectItem>
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
            </div>

            {/* Assets Table */}
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAssetIds.length === assets.length && assets.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading assets...
                      </TableCell>
                    </TableRow>
                  ) : assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No assets found matching criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAssetIds.includes(asset.id)}
                            onCheckedChange={() => handleSelectAsset(asset.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{asset.itemCode}</TableCell>
                        <TableCell className="font-medium">{asset.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(asset.status)}`} />
                            {formatStatusText(asset.status)}
                          </div>
                        </TableCell>
                        <TableCell>{asset.location || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Operation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOperation === 'UPDATE' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select 
                    value={updateData.status} 
                    onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keep current" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep-current">Keep Current</SelectItem>
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
                  <Label>New Location</Label>
                  <Input
                    value={updateData.location}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Keep current location"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={updateData.notes}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes about this update..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedOperation === 'DEPLOY' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select 
                    value={deploymentData.employeeId} 
                    onValueChange={(value) => setDeploymentData(prev => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expected Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !deploymentData.expectedReturnDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deploymentData.expectedReturnDate ? format(deploymentData.expectedReturnDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={deploymentData.expectedReturnDate}
                        onSelect={(date: Date | undefined) => setDeploymentData(prev => ({ 
                          ...prev, 
                          expectedReturnDate: date 
                        }))}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Deployment Notes</Label>
                  <Textarea
                    value={deploymentData.deploymentNotes}
                    onChange={(e) => setDeploymentData(prev => ({ ...prev, deploymentNotes: e.target.value }))}
                    placeholder="Notes about this deployment..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedOperation === 'RETURN' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Return Condition</Label>
                  <Select 
                    value={returnData.returnCondition} 
                    onValueChange={(value) => setReturnData(prev => ({ ...prev, returnCondition: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Excellent</SelectItem>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                      <SelectItem value="DAMAGED">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Return Notes</Label>
                  <Textarea
                    value={returnData.returnNotes}
                    onChange={(e) => setReturnData(prev => ({ ...prev, returnNotes: e.target.value }))}
                    placeholder="Notes about the return..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedOperation === 'DELETE' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Warning: Permanent Action</p>
                    <p className="text-sm">
                      This will permanently delete the selected assets. Assets with active deployments cannot be deleted.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="space-y-2">
              <Button 
                onClick={handlePreview} 
                disabled={isLoading || selectedAssetIds.length === 0}
                className="w-full"
              >
                {isLoading ? 'Generating Preview...' : 'Preview Operation'}
              </Button>

              {preview && (
                <Button 
                  onClick={handleExecuteOperation} 
                  disabled={isProcessing || !preview.canProceed}
                  className="w-full"
                  variant={preview.canProceed ? "default" : "secondary"}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Execute on ${preview.totalCount} Assets`
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Operation Preview</span>
              <div className="flex space-x-2">
                <Badge variant={preview.canProceed ? "default" : "destructive"}>
                  {preview.totalCount} Assets
                </Badge>
                {preview.warnings.length > 0 && (
                  <Badge variant="destructive">
                    {preview.warnings.length} Warnings
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings Found:</p>
                    <div className="space-y-1">
                      {preview.warnings.map((warning, index) => (
                        <p key={index} className="text-sm">• {warning}</p>
                      ))}
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
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Current Location</TableHead>
                    <TableHead>Serial Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.affectedAssets.slice(0, 10).map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-sm">{asset.itemCode}</TableCell>
                      <TableCell className="font-medium">{asset.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(asset.currentStatus)}`} />
                          {formatStatusText(asset.currentStatus)}
                        </div>
                      </TableCell>
                      <TableCell>{asset.currentLocation || '-'}</TableCell>
                      <TableCell>{asset.serialNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.affectedAssets.length > 10 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  Showing 10 of {preview.affectedAssets.length} assets
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Result */}
      {operationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Operation Results</span>
              <Badge variant={operationResult.success ? "default" : "destructive"}>
                {operationResult.success ? "Success" : "Partial Success"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {operationResult.processedCount}
                  </div>
                  <div className="text-sm text-green-700">Processed</div>
                </div>
                
                {operationResult.failedCount > 0 && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {operationResult.failedCount}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                )}

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {operationResult.processedAssetIds.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Affected</div>
                </div>
              </div>

              {operationResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Operation Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {operationResult.errors.map((error, index) => (
                          <p key={index} className="text-xs">
                            {error.itemCode && `${error.itemCode}: `}{error.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                {operationResult.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}