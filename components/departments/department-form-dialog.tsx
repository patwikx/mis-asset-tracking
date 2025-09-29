// components/departments/department-form-dialog.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { 
  DepartmentWithRelations, 
  CreateDepartmentData, 
  UpdateDepartmentData 
} from '@/types/department-types';
import { 
  createDepartment, 
  updateDepartment, 
  getBusinessUnits
} from '@/lib/actions/department-actions';

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  businessUnitId: string;
}

export const DepartmentFormDialog: React.FC<DepartmentFormDialogProps> = ({
  open,
  onOpenChange,
  department,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; code: string }>>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    businessUnitId: ''
  });

  const isEditing = !!department;

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, department]);

  const loadFormData = async () => {
    try {
      const businessUnitsData = await getBusinessUnits();
      setBusinessUnits(businessUnitsData);

      if (department) {
        setFormData({
          name: department.name,
          code: department.code,
          description: department.description || '',
          businessUnitId: department.businessUnitId
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          businessUnitId: ''
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        businessUnitId: formData.businessUnitId
      };

      let result;
      if (isEditing) {
        result = await updateDepartment({
          id: department.id,
          ...submitData
        } as UpdateDepartmentData);
      } else {
        result = await createDepartment(submitData as CreateDepartmentData);
      }

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Department' : 'Create New Department'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the department information below.' 
              : 'Fill in the details to create a new department.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., Information Technology"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Department Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => updateFormData('code', e.target.value)}
              placeholder="e.g., IT"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessUnitId">Business Unit *</Label>
            <Select 
              value={formData.businessUnitId} 
              onValueChange={(value) => updateFormData('businessUnitId', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business unit" />
              </SelectTrigger>
              <SelectContent>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Department description..."
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
              {isEditing ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};