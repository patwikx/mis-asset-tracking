/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/inventory-verification-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  AlertTriangle,
  Plus,
  RefreshCw,
  Eye,
  Play,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  getInventoryVerifications,
  createInventoryVerification,
  getVerificationItems,
  updateVerificationItem
} from '@/lib/actions/barcode-actions';
import { getCurrentUser } from '@/lib/current-user';
import type {
  InventoryVerification,
  VerificationItem
} from '@/types/barcode-types';

interface InventoryVerificationPageProps {
  businessUnitId: string;
}

export function InventoryVerificationPage({ businessUnitId }: InventoryVerificationPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [verifications, setVerifications] = useState<InventoryVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<InventoryVerification | null>(null);
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  
  // Create verification form
  const [newVerification, setNewVerification] = useState({
    verificationName: '',
    description: '',
    startDate: new Date(),
    endDate: undefined as Date | undefined,
    assignedTo: [] as string[],
    locations: [] as string[],
    categories: [] as string[]
  });


  const loadVerifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInventoryVerifications(businessUnitId);
      setVerifications(data);
    } catch (error) {
      toast.error('Failed to load inventory verifications');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId]);

  const loadVerificationItems = useCallback(async (verificationId: string) => {
    setIsLoading(true);
    try {
      const items = await getVerificationItems(verificationId);
      setVerificationItems(items);
    } catch (error) {
      toast.error('Failed to load verification items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const handleCreateVerification = async () => {
    if (!newVerification.verificationName.trim()) {
      toast.error('Please enter a verification name');
      return;
    }

    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('You must be logged in to create a verification');
        return;
      }

      const result = await createInventoryVerification(businessUnitId, {
        businessUnitId,
        verificationName: newVerification.verificationName,
        description: newVerification.description,
        startDate: newVerification.startDate,
        endDate: newVerification.endDate,
        status: 'PLANNED',
        assignedTo: newVerification.assignedTo,
        locations: newVerification.locations,
        categories: newVerification.categories,
        createdBy: user.id
      });

      if (result.success) {
        toast.success('Inventory verification created successfully');
        setShowCreateDialog(false);
        setNewVerification({
          verificationName: '',
          description: '',
          startDate: new Date(),
          endDate: undefined,
          assignedTo: [],
          locations: [],
          categories: []
        });
        loadVerifications();
      } else {
        toast.error(result.error || 'Failed to create verification');
      }
    } catch (error) {
      toast.error('Failed to create verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewItems = async (verification: InventoryVerification) => {
    setSelectedVerification(verification);
    await loadVerificationItems(verification.id);
    setShowItemsDialog(true);
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<VerificationItem>) => {
    try {
      const result = await updateVerificationItem(itemId, updates);
      
      if (result.success) {
        toast.success('Verification item updated');
        if (selectedVerification) {
          await loadVerificationItems(selectedVerification.id);
        }
        loadVerifications(); // Refresh to update counts
      } else {
        toast.error(result.error || 'Failed to update item');
      }
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const getStatusColor = (status: InventoryVerification['status']) => {
    switch (status) {
      case 'PLANNED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getItemStatusColor = (status: VerificationItem['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-500';
      case 'VERIFIED':
        return 'bg-green-500';
      case 'DISCREPANCY':
        return 'bg-red-500';
      case 'NOT_FOUND':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  const calculateProgress = (verification: InventoryVerification) => {
    if (verification.totalAssets === 0) return 0;
    return (verification.scannedAssets / verification.totalAssets) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Inventory Verification</h1>
            <p className="text-muted-foreground">Manage inventory verification processes</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadVerifications} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Inventory Verification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification Name</Label>
                  <Input
                    value={newVerification.verificationName}
                    onChange={(e) => setNewVerification(prev => ({...prev, verificationName: e.target.value}))}
                    placeholder="e.g., Q1 2024 Inventory Check"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newVerification.description}
                    onChange={(e) => setNewVerification(prev => ({...prev, description: e.target.value}))}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newVerification.startDate.toISOString().split('T')[0]}
                    onChange={(e) => setNewVerification(prev => ({...prev, startDate: new Date(e.target.value)}))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newVerification.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setNewVerification(prev => ({...prev, endDate: e.target.value ? new Date(e.target.value) : undefined}))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Locations (comma-separated)</Label>
                  <Input
                    value={newVerification.locations.join(', ')}
                    onChange={(e) => setNewVerification(prev => ({...prev, locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))}
                    placeholder="e.g., IT Department, HR Department"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Categories (comma-separated)</Label>
                  <Input
                    value={newVerification.categories.join(', ')}
                    onChange={(e) => setNewVerification(prev => ({...prev, categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))}
                    placeholder="e.g., IT Equipment, Furniture"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateVerification} disabled={isLoading}>
                    {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Create Verification
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {verifications.filter(v => v.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {verifications.filter(v => v.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discrepancies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {verifications.reduce((sum, v) => sum + v.discrepancies, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Discrepancies</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{verification.verificationName}</div>
                        {verification.description && (
                          <div className="text-sm text-muted-foreground">{verification.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(verification.status)}>
                        {verification.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={calculateProgress(verification)} className="w-20" />
                        <div className="text-xs text-muted-foreground">
                          {verification.scannedAssets}/{verification.totalAssets}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Total: {verification.totalAssets}</div>
                        <div className="text-green-600">Verified: {verification.verifiedAssets}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {verification.discrepancies > 0 ? (
                        <Badge variant="destructive">{verification.discrepancies}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>{verification.startDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewItems(verification)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Items
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Verification Items Dialog */}
      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedVerification?.verificationName} - Items
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVerification && (
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <Label>Total Assets</Label>
                  <p className="font-medium">{selectedVerification.totalAssets}</p>
                </div>
                <div>
                  <Label>Scanned</Label>
                  <p className="font-medium">{selectedVerification.scannedAssets}</p>
                </div>
                <div>
                  <Label>Verified</Label>
                  <p className="font-medium text-green-600">{selectedVerification.verifiedAssets}</p>
                </div>
                <div>
                  <Label>Discrepancies</Label>
                  <p className="font-medium text-red-600">{selectedVerification.discrepancies}</p>
                </div>
              </div>
            )}
            
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Expected Location</TableHead>
                    <TableHead>Actual Location</TableHead>
                    <TableHead>Expected Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verificationItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.assetId}</TableCell>
                      <TableCell>{item.expectedLocation}</TableCell>
                      <TableCell>{item.actualLocation || '-'}</TableCell>
                      <TableCell>{item.expectedAssignee || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getItemStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateItem(item.id, { status: 'VERIFIED' })}
                            disabled={item.status === 'VERIFIED'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateItem(item.id, { status: 'DISCREPANCY' })}
                            disabled={item.status === 'DISCREPANCY'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}