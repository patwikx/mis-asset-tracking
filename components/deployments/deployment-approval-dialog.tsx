'use client'

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { approveDeployment, rejectDeployment } from '@/lib/actions/deployment-approval-actions';
import type { AssetDeploymentWithRelations } from '@/types/asset-types';

interface DeploymentApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: AssetDeploymentWithRelations | null;
  action: 'approve' | 'reject';
  onSuccess: () => void;
}

export const DeploymentApprovalDialog: React.FC<DeploymentApprovalDialogProps> = ({
  open,
  onOpenChange,
  deployment,
  action,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = async () => {
    if (!deployment) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (action === 'approve') {
        result = await approveDeployment({
          deploymentId: deployment.id,
          accountingNotes: notes
        });
      } else {
        result = await rejectDeployment({
          deploymentId: deployment.id,
          rejectionReason,
          accountingNotes: notes
        });
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
        setNotes('');
        setRejectionReason('');
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error(`Failed to ${action} deployment`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!deployment) return null;

  const isApproval = action === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isApproval ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{isApproval ? 'Approve' : 'Reject'} Deployment</span>
          </DialogTitle>
          <DialogDescription>
            {isApproval 
              ? 'Review and approve this asset deployment request.'
              : 'Provide a reason for rejecting this deployment request.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Deployment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Asset</label>
              <p className="font-medium">{deployment.asset.description}</p>
              <p className="text-sm text-muted-foreground">{deployment.asset.itemCode}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Employee</label>
              <p className="font-medium">
                {deployment.employee.firstName} {deployment.employee.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{deployment.employee.employeeId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Badge variant="secondary">{deployment.asset.category.name}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Request Date</label>
              <p className="text-sm">{new Date(deployment.createdAt).toLocaleDateString()}</p>
            </div>
            {deployment.deploymentNotes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Deployment Notes</label>
                <p className="text-sm">{deployment.deploymentNotes}</p>
              </div>
            )}
          </div>

          {/* Rejection Reason (only for reject action) */}
          {!isApproval && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this deployment..."
                rows={3}
                required
              />
            </div>
          )}

          {/* Accounting Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isApproval ? 'Approval Notes (Optional)' : 'Additional Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isApproval 
                  ? "Add any notes about this approval..."
                  : "Add any additional notes..."
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || (!isApproval && !rejectionReason.trim())}
            variant={isApproval ? "default" : "destructive"}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isApproval ? 'Approve Deployment' : 'Reject Deployment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};