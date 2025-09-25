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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { returnAsset } from '@/lib/actions/deployment-approval-actions';
import type { AssetDeploymentWithRelations } from '@/types/asset-types';

interface AssetReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment: AssetDeploymentWithRelations | null;
  onSuccess: () => void;
}

const RETURN_CONDITIONS = [
  'Excellent - No damage or wear',
  'Good - Minor wear, fully functional',
  'Fair - Moderate wear, fully functional',
  'Poor - Significant wear, may need maintenance',
  'Damaged - Requires repair before reuse',
  'Lost - Asset not returned'
];

export const AssetReturnDialog: React.FC<AssetReturnDialogProps> = ({
  open,
  onOpenChange,
  deployment,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [returnCondition, setReturnCondition] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnedDate, setReturnedDate] = useState<Date | undefined>(new Date());

  const handleSubmit = async () => {
    if (!deployment || !returnCondition) {
      toast.error('Please select the asset condition');
      return;
    }

    setIsLoading(true);
    try {
      const result = await returnAsset({
        deploymentId: deployment.id,
        returnCondition,
        returnNotes: returnNotes || undefined,
        returnedDate
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
        setReturnCondition('');
        setReturnNotes('');
        setReturnedDate(new Date());
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error returning asset:', error);
      toast.error('Failed to return asset');
    } finally {
      setIsLoading(false);
    }
  };

  if (!deployment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <span>Return Asset</span>
          </DialogTitle>
          <DialogDescription>
            Process the return of this deployed asset and update its condition.
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
              <label className="text-sm font-medium text-muted-foreground">Deployed Date</label>
              <p className="text-sm">
                {deployment.deployedDate 
                  ? new Date(deployment.deployedDate).toLocaleDateString()
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expected Return</label>
              <p className="text-sm">
                {deployment.expectedReturnDate 
                  ? new Date(deployment.expectedReturnDate).toLocaleDateString()
                  : 'N/A'
                }
              </p>
            </div>
            {deployment.deploymentCondition && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Original Condition</label>
                <p className="text-sm">{deployment.deploymentCondition}</p>
              </div>
            )}
          </div>

          {/* Return Date */}
          <div className="space-y-2">
            <Label>Return Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !returnedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnedDate ? format(returnedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnedDate}
                  onSelect={setReturnedDate}
                  initialFocus
                  disabled={(date: Date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Condition */}
          <div className="space-y-2">
            <Label htmlFor="returnCondition">Asset Condition *</Label>
            <Select value={returnCondition} onValueChange={setReturnCondition} required>
              <SelectTrigger>
                <SelectValue placeholder="Select asset condition upon return" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Return Notes */}
          <div className="space-y-2">
            <Label htmlFor="returnNotes">Return Notes (Optional)</Label>
            <Textarea
              id="returnNotes"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Add any notes about the asset condition, damages, or other observations..."
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
            disabled={isLoading || !returnCondition}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Process Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};