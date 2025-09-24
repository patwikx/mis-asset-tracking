// components/employees/employee-form-dialog.tsx
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { 
  EmployeeWithRelations, 
  CreateEmployeeData, 
  UpdateEmployeeData 
} from '@/types/employee-types';
import { 
  createEmployee, 
  updateEmployee, 
  getDepartments,
  getRoles,
  getBusinessUnits
} from '@/lib/actions/employee-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  position: string;
  businessUnitId: string;
  departmentId: string;
  roleId: string;
  hireDate: Date | undefined;
  password: string;
}

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const { businessUnitId } = useBusinessUnit();
  
  const [formData, setFormData] = useState<FormData>({
    employeeId: '',
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    position: '',
    businessUnitId: businessUnitId || '',
    departmentId: '',
    roleId: '',
    hireDate: undefined,
    password: ''
  });

  const isEditing = !!employee;

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open, employee]);

  const loadFormData = async () => {
    try {
      const [departmentsData, rolesData, businessUnitsData] = await Promise.all([
        getDepartments(businessUnitId || undefined),
        getRoles(),
        getBusinessUnits()
      ]);
      
      setDepartments(departmentsData);
      setRoles(rolesData);
      setBusinessUnits(businessUnitsData);

      if (employee) {
        setFormData({
          employeeId: employee.employeeId,
          email: employee.email || '',
          firstName: employee.firstName,
          lastName: employee.lastName,
          middleName: employee.middleName || '',
          position: employee.position || '',
          businessUnitId: employee.businessUnitId,
          departmentId: employee.departmentId,
          roleId: employee.roleId,
          hireDate: employee.hireDate || undefined,
          password: ''
        });
      } else {
        setFormData({
          employeeId: '',
          email: '',
          firstName: '',
          lastName: '',
          middleName: '',
          position: '',
          businessUnitId: businessUnitId || '',
          departmentId: '',
          roleId: '',
          hireDate: undefined,
          password: ''
        });
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        employeeId: formData.employeeId,
        email: formData.email || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        position: formData.position || undefined,
        businessUnitId: formData.businessUnitId,
        departmentId: formData.departmentId,
        roleId: formData.roleId,
        hireDate: formData.hireDate,
        passwordHash: formData.password
      };

      let result;
      if (isEditing) {
        result = await updateEmployee({
          id: employee.id,
          ...submitData
        } as UpdateEmployeeData);
      } else {
        result = await createEmployee(submitData as CreateEmployeeData);
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

  const updateFormData = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Employee' : 'Create New Employee'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the employee information below.' 
              : 'Fill in the details to create a new employee.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID *</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => updateFormData('employeeId', e.target.value)}
                placeholder="e.g., EMP001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="employee@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateFormData('firstName', e.target.value)}
                placeholder="John"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => updateFormData('middleName', e.target.value)}
                placeholder="Michael"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => updateFormData('position', e.target.value)}
              placeholder="Software Engineer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="departmentId">Department *</Label>
              <Select 
                value={formData.departmentId} 
                onValueChange={(value) => updateFormData('departmentId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Role *</Label>
              <Select 
                value={formData.roleId} 
                onValueChange={(value) => updateFormData('roleId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.hireDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.hireDate ? format(formData.hireDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.hireDate}
                    onSelect={(date: Date | undefined) => updateFormData('hireDate', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="Enter password"
                required={!isEditing}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};