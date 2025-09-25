// components/deployments/deployment-detail-page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DeploymentApprovalDialog } from './deployment-approval-dialog';
import { AssetReturnDialog } from './asset-return-dialog';
import type { AssetDeploymentWithRelations } from '@/types/asset-types';

interface DeploymentDetailPageProps {
  deployment: AssetDeploymentWithRelations;
  businessUnitId: string;
  onDeploymentUpdate?: () => void;
}

export function DeploymentDetailPage({ 
  deployment, 
  businessUnitId, 
  onDeploymentUpdate 
}: DeploymentDetailPageProps) {
  const router = useRouter();
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
  }>({
    open: false,
    action: 'approve'
  });
  const [returnDialog, setReturnDialog] = useState(false);

  const handleBack = () => {
    router.push(`/${businessUnitId}/deployments`);
  };

  const handleApprove = () => {
    setApprovalDialog({ open: true, action: 'approve' });
  };

  const handleReject = () => {
    setApprovalDialog({ open: true, action: 'reject' });
  };

  const handleReturn = () => {
    setReturnDialog(true);
  };

  const handleApprovalSuccess = () => {
    onDeploymentUpdate?.();
    // Optionally refresh the page or update local state
    router.refresh();
  };

  const handleReturnSuccess = () => {
    onDeploymentUpdate?.();
    // Optionally refresh the page or update local state
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ACCOUNTING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApproveOrReject = deployment.status === 'PENDING_ACCOUNTING_APPROVAL';
  const canReturn = deployment.status === 'DEPLOYED';
  const canEdit = ['PENDING_ACCOUNTING_APPROVAL', 'APPROVED'].includes(deployment.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deployments
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deployment Details</h1>
            <p className="text-muted-foreground">
              {deployment.asset.itemCode} - {deployment.asset.description}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {canEdit && (
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          
          {canApproveOrReject && (
            <>
              <Button variant="outline" size="sm" onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={handleReject}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          
          {canReturn && (
            <Button variant="outline" size="sm" onClick={handleReturn}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Mark as Returned
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(deployment.status)}>
                    {deployment.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deployment ID</label>
                <p className="mt-1 font-mono text-sm">{deployment.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                <p className="mt-1">{new Date(deployment.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deployed Date</label>
                <p className="mt-1">
                  {deployment.deployedDate 
                    ? new Date(deployment.deployedDate).toLocaleDateString() 
                    : 'Not deployed yet'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Return</label>
                <p className="mt-1">
                  {deployment.expectedReturnDate 
                    ? new Date(deployment.expectedReturnDate).toLocaleDateString() 
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Returned Date</label>
                <p className="mt-1">
                  {deployment.returnedDate 
                    ? new Date(deployment.returnedDate).toLocaleDateString() 
                    : 'Not returned yet'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Item Code</label>
                <p className="mt-1 font-mono">{deployment.asset.itemCode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="mt-1">{deployment.asset.category.name}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{deployment.asset.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                <p className="mt-1">{deployment.asset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand</label>
                <p className="mt-1">{deployment.asset.brand || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee Name</label>
                <p className="mt-1">
                  {deployment.employee.firstName} {deployment.employee.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                <p className="mt-1 font-mono">{deployment.employee.employeeId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1">{deployment.employee.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Position</label>
                <p className="mt-1">{deployment.employee.position || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Deployment Notes</label>
              <p className="mt-1">{deployment.deploymentNotes || 'No notes available'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Deployment Condition</label>
              <p className="mt-1">{deployment.deploymentCondition || 'N/A'}</p>
            </div>
            {deployment.returnCondition && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Return Condition</label>
                <p className="mt-1">{deployment.returnCondition}</p>
              </div>
            )}
            {deployment.returnNotes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Return Notes</label>
                <p className="mt-1">{deployment.returnNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {deployment.accountingApprover && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Accounting Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                  <p className="mt-1">
                    {deployment.accountingApprover.firstName} {deployment.accountingApprover.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved Date</label>
                  <p className="mt-1">
                    {deployment.accountingApprovedAt 
                      ? new Date(deployment.accountingApprovedAt).toLocaleDateString() 
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Accounting Notes</label>
                  <p className="mt-1">{deployment.accountingNotes || 'No notes available'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show cancellation information if deployment was cancelled */}
        {deployment.status === 'CANCELLED' && (
          <Card className="md:col-span-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Deployment Cancelled</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cancelled Date</label>
                  <p className="mt-1">
                    {deployment.accountingApprovedAt 
                      ? new Date(deployment.accountingApprovedAt).toLocaleDateString() 
                      : 'N/A'
                    }
                  </p>
                </div>
                {deployment.accountingNotes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cancellation Notes</label>
                    <p className="mt-1">{deployment.accountingNotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval Dialog */}
      <DeploymentApprovalDialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}
        deployment={deployment}
        action={approvalDialog.action}
        onSuccess={handleApprovalSuccess}
      />

      {/* Return Dialog */}
      <AssetReturnDialog
        open={returnDialog}
        onOpenChange={setReturnDialog}
        deployment={deployment}
        onSuccess={handleReturnSuccess}
      />
    </div>
  );
}