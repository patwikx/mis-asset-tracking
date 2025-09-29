// components/deployments/create-deployment-page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBusinessUnit } from '@/context/business-unit-context';
import { getEmployees } from '@/lib/actions/employee-actions';
import { getAssets } from '@/lib/actions/asset-actions';
import { createBulkDeployments, getNextTransmittalNumber } from '@/lib/actions/deployment-actions';
import type { EmployeeWithRelations } from '@/types/employee-types';
import type { AssetWithRelations } from '@/types/asset-types';

interface DeploymentItem {
  id: string;
  assetId: string;
  asset?: AssetWithRelations;
  notes: string;
}

export const CreateDeploymentPage: React.FC = () => {
  const router = useRouter();
  const { businessUnitId } = useBusinessUnit();
  
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRelations | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetWithRelations[]>([]);
  const [deploymentItems, setDeploymentItems] = useState<DeploymentItem[]>([
    { id: '1', assetId: '', notes: '' }
  ]);
  const [transmittalNumber, setTransmittalNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnitId]);

  const loadInitialData = async () => {
    if (!businessUnitId) return;
    
    setIsLoadingData(true);
    try {
      const [employeesResult, assetsResult, nextTransmittalNumber] = await Promise.all([
        getEmployees(businessUnitId, {}, { page: 1, limit: 1000 }),
        getAssets(businessUnitId, { status: 'AVAILABLE' }, { page: 1, limit: 1000 }),
        getNextTransmittalNumber()
      ]);
      
      setEmployees(employeesResult.data);
      setAvailableAssets(assetsResult.data);
      setTransmittalNumber(nextTransmittalNumber);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to load employees and assets');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/deployments`);
  };

  const addDeploymentItem = () => {
    const newItem: DeploymentItem = {
      id: Date.now().toString(),
      assetId: '',
      notes: ''
    };
    setDeploymentItems([...deploymentItems, newItem]);
  };

  const removeDeploymentItem = (id: string) => {
    if (deploymentItems.length === 1) {
      toast.error('At least one deployment item is required');
      return;
    }
    setDeploymentItems(deploymentItems.filter(item => item.id !== id));
  };

  const updateDeploymentItem = (id: string, field: keyof DeploymentItem, value: string) => {
    setDeploymentItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If updating assetId, find and attach the asset object
          if (field === 'assetId') {
            const asset = availableAssets.find(a => a.id === value);
            updatedItem.asset = asset;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const getAvailableAssetsForItem = (currentItemId: string) => {
    const selectedAssetIds = deploymentItems
      .filter(item => item.id !== currentItemId && item.assetId)
      .map(item => item.assetId);
    
    return availableAssets.filter(asset => !selectedAssetIds.includes(asset.id));
  };

  const validateForm = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return false;
    }

    const validItems = deploymentItems.filter(item => item.assetId);
    if (validItems.length === 0) {
      toast.error('Please select at least one asset to deploy');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedEmployee || !businessUnitId) return;

    setIsLoading(true);
    try {
      const validItems = deploymentItems.filter(item => item.assetId);
      
      const deploymentData = validItems.map(item => ({
        assetId: item.assetId,
        employeeId: selectedEmployee.id,
        businessUnitId,
        deploymentNotes: item.notes || undefined
      }));

      const result = await createBulkDeployments(deploymentData);
      
      if (result.success) {
        toast.success(`Successfully created ${result.count} deployments`);
        router.push(`/${businessUnitId}/assets/deployments`);
      } else {
        toast.error(result.message || 'Failed to create deployments');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to create deployments');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Deployments</span>
          </Button>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isLoading ? 'Creating...' : 'Create Deployments'}</span>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Transmittal Number */}
        <Card>
          <CardHeader>
            <CardTitle>Transmittal Information</CardTitle>
            <CardDescription>
              Auto-generated transmittal number for this deployment batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="transmittal-number">Transmittal Number</Label>
              <Input
                id="transmittal-number"
                value={transmittalNumber}
                readOnly
                className="bg-muted font-mono mt-1"
                placeholder="Loading..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                This number will be assigned to all deployments in this batch
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Select Employee</CardTitle>
            </div>
            <CardDescription>
              Choose the employee who will receive the asset deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={selectedEmployee?.id || ''}
                  onValueChange={(value) => {
                    const employee = employees.find(e => e.id === value);
                    setSelectedEmployee(employee || null);
                  }}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                      {selectedEmployee.position && (
                        <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                      )}
                    </div>
                    <Badge variant="outline">Selected</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assets to Deploy */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assets to Deploy</CardTitle>
                <CardDescription>
                  Add multiple assets to deploy to the selected employee
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addDeploymentItem}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Asset</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deploymentItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Asset #{index + 1}</h4>
                    {deploymentItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeploymentItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor={`asset-${item.id}`} className='mb-1'>Asset</Label>
                      <Select
                        value={item.assetId}
                        onValueChange={(value) => updateDeploymentItem(item.id, 'assetId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableAssetsForItem(item.id).map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.itemCode} - {asset.description}
                              {asset.brand && ` (${asset.brand})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {item.asset && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Code:</span> {item.asset.itemCode}
                          </div>
                          <div>
                            <span className="font-medium">Brand:</span> {item.asset.brand || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Model:</span> {item.asset.modelNumber || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Serial:</span> {item.asset.serialNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor={`notes-${item.id}`} className='mb-1'>Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${item.id}`}
                        placeholder="Add any notes for this deployment..."
                        value={item.notes}
                        onChange={(e) => updateDeploymentItem(item.id, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {deploymentItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No assets added yet. Click &quot;Add Asset&quot; to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};