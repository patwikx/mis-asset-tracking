// components/deployments/deployment-form-dialog.tsx
'use client'

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { 
  AssetDeploymentWithRelations, 
  CreateDeploymentData
} from '@/types/asset-types';
import { 
  createDeployment,
  getEmployees,
  getAvailableAssets
} from '@/lib/actions/deployment-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

interface DeploymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deployment?: AssetDeploymentWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  assetId: string;
  employeeId: string;
  expectedReturnDate: Date | undefined;
  deploymentNotes: string;
  deploymentCondition: string;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  businessUnit: {
    name: string;
    code: string;
  };
}

interface Asset {
  id: string;
  itemCode: string;
  description: string;
  category: {
    name: string;
  };
}



export const DeploymentFormDialog: React.FC<DeploymentFormDialogProps> = ({
  open,
  onOpenChange,
  deployment,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const { businessUnitId } = useBusinessUnit();
  
  const [formData, setFormData] = useState<FormData>({
    assetId: '',
    employeeId: '',
    expectedReturnDate: undefined,
    deploymentNotes: '',
    deploymentCondition: 'New - Excellent condition'
  });

  const isEditing = !!deployment;

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deployment]);

  const loadFormData = async () => {
    try {
      const [employeesData, assetsData] = await Promise.all([
        getEmployees(businessUnitId!),
        getAvailableAssets(businessUnitId!)
      ]);

      setEmployees(employeesData);
      setAssets(assetsData);

      if (deployment) {
        setFormData({
          assetId: deployment.assetId,
          employeeId: deployment.employeeId,
          expectedReturnDate: deployment.expectedReturnDate || undefined,
          deploymentNotes: deployment.deploymentNotes || '',
          deploymentCondition: deployment.deploymentCondition || 'New - Excellent condition'
        });
      } else {
        // Reset form for new deployment
        setFormData({
          assetId: '',
          employeeId: '',
          expectedReturnDate: undefined,
          deploymentNotes: '',
          deploymentCondition: 'New - Excellent condition'
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      toast.info('Editing deployments is not yet implemented');
      return;
    }

    setIsLoading(true);

    try {
      const submitData: CreateDeploymentData = {
        assetId: formData.assetId,
        employeeId: formData.employeeId,
        businessUnitId: businessUnitId!,
        expectedReturnDate: formData.expectedReturnDate,
        deploymentNotes: formData.deploymentNotes || undefined,
        deploymentCondition: formData.deploymentCondition || undefined
      };

      const result = await createDeployment(submitData);

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    updateFormData('employeeId', employeeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Deployment' : 'Create New Deployment'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the deployment information below.' 
              : 'Fill in the details to create a new asset deployment.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asset Selection */}
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset *</Label>
              <Select 
                value={formData.assetId} 
                onValueChange={(value) => updateFormData('assetId', value)}
                required
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <div className="flex flex-col">
                        <span>{asset.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {asset.itemCode} • {asset.category.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select 
                value={formData.employeeId} 
                onValueChange={handleEmployeeChange}
                required
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col">
                        <span>{employee.firstName} {employee.lastName}</span>
                        <span className="text-xs text-muted-foreground">
                          {employee.employeeId} • {employee.position}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected Return Date */}
            <div className="space-y-2">
              <Label>Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expectedReturnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expectedReturnDate ? format(formData.expectedReturnDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expectedReturnDate}
                    onSelect={(date: Date | undefined) => updateFormData('expectedReturnDate', date)}
                    initialFocus
                    disabled={(date: Date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Deployment Condition */}
            <div className="space-y-2">
              <Label htmlFor="deploymentCondition">Asset Condition</Label>
              <Select 
                value={formData.deploymentCondition} 
                onValueChange={(value) => updateFormData('deploymentCondition', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New - Excellent condition">New - Excellent condition</SelectItem>
                  <SelectItem value="Good condition">Good condition</SelectItem>
                  <SelectItem value="Fair condition">Fair condition</SelectItem>
                  <SelectItem value="Poor condition">Poor condition</SelectItem>
                  <SelectItem value="Refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deployment Notes */}
          <div className="space-y-2">
            <Label htmlFor="deploymentNotes">Deployment Notes</Label>
            <Textarea
              id="deploymentNotes"
              value={formData.deploymentNotes}
              onChange={(e) => updateFormData('deploymentNotes', e.target.value)}
              placeholder="Additional notes about this deployment..."
              rows={3}
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Deployment' : 'Create Deployment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};