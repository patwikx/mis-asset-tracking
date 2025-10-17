/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/asset-transfer-details-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Clock,
  Truck,
  Package,
  Building,
  User,
  Calendar,
  FileText,
  DollarSign,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getAssetTransferById,
  approveAssetTransfer,
  rejectAssetTransfer,
  completeAssetTransfer
} from '@/lib/actions/asset-transfer-actions';
import type { AssetTransferWithRelations } from '@/types/asset-types';

interface AssetTransferDetailsPageProps {
  businessUnitId: string;
  transferId: string;
}

// Helper function to get transfer status color
const getTransferStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-yellow-500';
    case 'APPROVED':
      return 'bg-blue-500';
    case 'IN_TRANSIT':
      return 'bg-purple-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'CANCELLED':
      return 'bg-gray-500';
    case 'REJECTED':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format transfer status text
const formatTransferStatus = (status: string): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function AssetTransferDetailsPage({ businessUnitId, transferId }: AssetTransferDetailsPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [transfer, setTransfer] = useState<AssetTransferWithRelations | null>(null);

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets/transfers`);
  };

  const loadTransfer = useCallback(async () => {
    setIsLoading(true);
    try {
      const transferData = await getAssetTransferById(transferId);
      setTransfer(transferData);
    } catch (error) {
      toast.error('Failed to load transfer details');
    } finally {
      setIsLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  const handleApprove = async () => {
    if (!transfer) return;
    
    try {
      const result = await approveAssetTransfer(transfer.id);
      if (result.success) {
        toast.success(result.message);
        loadTransfer();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve transfer');
    }
  };

  const handleReject = async () => {
    if (!transfer) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      const result = await rejectAssetTransfer(transfer.id, reason);
      if (result.success) {
        toast.success(result.message);
        loadTransfer();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to reject transfer');
    }
  };

  const handleComplete = async () => {
    if (!transfer) return;
    
    try {
      const result = await completeAssetTransfer(transfer.id);
      if (result.success) {
        toast.success(result.message);
        loadTransfer();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to complete transfer');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transfers
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Loading Transfer Details...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transfers
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transfer Not Found</h1>
            <p className="text-muted-foreground">The requested transfer could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transfers
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Transfer #{transfer.transferNumber}</h1>
            <p className="text-muted-foreground">Asset transfer details and status</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={`${getTransferStatusColor(transfer.status)} text-white`}>
            {formatTransferStatus(transfer.status)}
          </Badge>
          
          {transfer.status === 'PENDING_APPROVAL' && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={handleReject}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
          
          {transfer.status === 'IN_TRANSIT' && (
            <Button variant="outline" size="sm" onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Received
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Transfer Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Item Code</Label>
                  <p className="font-mono">{transfer.asset.itemCode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                  <p className="font-mono">{transfer.asset.serialNumber || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p>{transfer.asset.description}</p>
              </div>
              
              {transfer.asset.currentBookValue && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Book Value</Label>
                  <p className="font-semibold">${transfer.asset.currentBookValue.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Transfer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">From Business Unit</Label>
                  <p>{transfer.fromBusinessUnit.name} ({transfer.fromBusinessUnit.code})</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">To Business Unit</Label>
                  <p>{transfer.toBusinessUnit.name} ({transfer.toBusinessUnit.code})</p>
                </div>
              </div>

              {(transfer.fromLocation || transfer.toLocation) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">From Location</Label>
                    <p>{transfer.fromLocation || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">To Location</Label>
                    <p>{transfer.toLocation || 'Not specified'}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Reason for Transfer</Label>
                <p>{transfer.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Transfer Date</Label>
                  <p>{format(new Date(transfer.transferDate), 'PPP')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Requested Date</Label>
                  <p>{format(new Date(transfer.requestedDate), 'PPP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          {(transfer.transferMethod || transfer.trackingNumber || transfer.estimatedArrival) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {transfer.transferMethod && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Transfer Method</Label>
                      <p className="capitalize">{transfer.transferMethod}</p>
                    </div>
                  )}
                  {transfer.trackingNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tracking Number</Label>
                      <p className="font-mono">{transfer.trackingNumber}</p>
                    </div>
                  )}
                </div>
                
                {transfer.estimatedArrival && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estimated Arrival</Label>
                    <p>{format(new Date(transfer.estimatedArrival), 'PPP')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          {(transfer.transferCost || transfer.insuranceValue) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {transfer.transferCost && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Transfer Cost</Label>
                      <p className="font-semibold">${transfer.transferCost.toLocaleString()}</p>
                    </div>
                  )}
                  {transfer.insuranceValue && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Insurance Value</Label>
                      <p className="font-semibold">${transfer.insuranceValue.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Condition & Notes */}
          {(transfer.conditionBefore || transfer.conditionAfter || transfer.transferNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Condition & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transfer.conditionBefore && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition Before Transfer</Label>
                    <p className="whitespace-pre-wrap">{transfer.conditionBefore}</p>
                  </div>
                )}
                
                {transfer.conditionAfter && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition After Transfer</Label>
                    <p className="whitespace-pre-wrap">{transfer.conditionAfter}</p>
                  </div>
                )}
                
                {transfer.transferNotes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Transfer Notes</Label>
                    <p className="whitespace-pre-wrap">{transfer.transferNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Timeline & People */}
        <div className="space-y-6">
          {/* Transfer Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Transfer Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Transfer Requested</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transfer.requestedDate), 'PPp')}
                    </p>
                  </div>
                </div>

                {transfer.approvedAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Transfer Approved</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.approvedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}

                {transfer.rejectedAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Transfer Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.rejectedAt), 'PPp')}
                      </p>
                      {transfer.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">{transfer.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                )}

                {transfer.handedOverAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Asset Handed Over</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.handedOverAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}

                {transfer.receivedAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Asset Received</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.receivedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}

                {transfer.completedDate && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-700 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Transfer Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.completedDate), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* People Involved */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                People Involved
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Requested By</Label>
                <p>{transfer.requestedByEmployee.firstName} {transfer.requestedByEmployee.lastName}</p>
                <p className="text-sm text-muted-foreground">{transfer.requestedByEmployee.employeeId}</p>
              </div>

              {transfer.approvedByEmployee && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Approved By</Label>
                  <p>{transfer.approvedByEmployee.firstName} {transfer.approvedByEmployee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{transfer.approvedByEmployee.employeeId}</p>
                </div>
              )}

              {transfer.rejectedByEmployee && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rejected By</Label>
                  <p>{transfer.rejectedByEmployee.firstName} {transfer.rejectedByEmployee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{transfer.rejectedByEmployee.employeeId}</p>
                </div>
              )}

              {transfer.handedOverByEmployee && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Handed Over By</Label>
                  <p>{transfer.handedOverByEmployee.firstName} {transfer.handedOverByEmployee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{transfer.handedOverByEmployee.employeeId}</p>
                </div>
              )}

              {transfer.receivedByEmployee && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Received By</Label>
                  <p>{transfer.receivedByEmployee.firstName} {transfer.receivedByEmployee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{transfer.receivedByEmployee.employeeId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </label>
  );
}