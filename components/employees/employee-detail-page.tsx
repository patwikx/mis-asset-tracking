/* eslint-disable @typescript-eslint/no-unused-vars */
// components/employees/employee-detail-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Edit, 
  Save, 
  X, 
  CalendarIcon, 
  Loader2, 
  Shield, 
  User,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EmployeeWithRelations, UpdateEmployeeData } from '@/types/employee-types';
import type { EmployeePermissions, Permission, PermissionModule } from '@/types/permissions-types';
import { 
  updateEmployee, 
  getDepartments,
  getRoles,
  getBusinessUnits,
  deleteEmployee
} from '@/lib/actions/employee-actions';
import { 
  getAvailablePermissions, 
  getEmployeePermissions, 
  updateEmployeePermissions 
} from '@/lib/actions/permissions-actions';

interface EmployeeDetailPageProps {
  employee: EmployeeWithRelations;
  businessUnitId: string;
  onEmployeeUpdate?: (updatedEmployee: EmployeeWithRelations) => void;
  onEmployeeDelete?: () => void;
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

export function EmployeeDetailPage({ 
  employee, 
  businessUnitId,
  onEmployeeUpdate,
  onEmployeeDelete
}: EmployeeDetailPageProps) {
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
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

  // Options data
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Permissions state
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissions | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionModule[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  const loadFormOptions = useCallback(async () => {
    try {
      const [departmentsData, rolesData, businessUnitsData] = await Promise.all([
        getDepartments(businessUnitId),
        getRoles(),
        getBusinessUnits()
      ]);
      
      setDepartments(departmentsData);
      setRoles(rolesData);
      setBusinessUnits(businessUnitsData);
    } catch (error) {
      toast.error('Failed to load form options');
    }
  }, [businessUnitId]);

  const loadPermissionData = useCallback(async () => {
    setIsLoadingPermissions(true);
    try {
      const [empPermissions, availablePerms] = await Promise.all([
        getEmployeePermissions(employee.id),
        getAvailablePermissions()
      ]);

      setEmployeePermissions(empPermissions);
      setAvailablePermissions(availablePerms);
      setPermissions(empPermissions?.permissions || {});
    } catch (error) {
      toast.error('Failed to load permission data');
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [employee.id]);

  useEffect(() => {
    loadFormOptions();
    loadPermissionData();
  }, [loadFormOptions, loadPermissionData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
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
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const submitData: UpdateEmployeeData = {
        id: employee.id,
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
        ...(formData.password && { passwordHash: formData.password })
      };

      const result = await updateEmployee(submitData);

      if (result.success) {
        toast.success(result.message);
        setIsEditing(false);
        // Note: In a real app, you'd want to refetch the employee data
        // For now, we'll just update the local state optimistically
        if (onEmployeeUpdate) {
          onEmployeeUpdate({
            ...employee,
            ...formData,
            email: formData.email || null,
            middleName: formData.middleName || null,
            position: formData.position || null,
            hireDate: formData.hireDate || null
          } as EmployeeWithRelations);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteEmployee(employee.id);
      
      if (result.success) {
        toast.success(result.message);
        if (onEmployeeDelete) {
          onEmployeeDelete();
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to delete employee');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permissionKey: string, enabled: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: enabled
    }));
  };

  const handleSavePermissions = async () => {
    if (!employeePermissions) return;

    setIsLoading(true);
    try {
      const result = await updateEmployeePermissions({
        employeeId: employee.id,
        permissions
      });

      if (result.success) {
        toast.success(result.message);
        setIsEditingPermissions(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPermissions = () => {
    setPermissions(employeePermissions?.permissions || {});
    setIsEditingPermissions(false);
  };

  const getPermissionCount = (modulePermissions: Permission[]) => {
    return modulePermissions.filter(perm => permissions[perm.key] === true).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-muted-foreground">{employee.position || 'Employee'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                {employee.isActive ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID *</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => updateFormData('employeeId', e.target.value)}
                      placeholder="e.g., EMP001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="pt-2">
                      <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => updateFormData('middleName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => updateFormData('position', e.target.value)}
                  />
                </div>

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
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                  <p className="mt-1 font-mono">{employee.employeeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="mt-1">{employee.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="mt-1">{employee.lastName}</p>
                </div>
                {employee.middleName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Middle Name</label>
                    <p className="mt-1">{employee.middleName}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="mt-1">{employee.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <p className="mt-1">{employee.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
                  <p className="mt-1">
                    {employee.hireDate 
                      ? new Date(employee.hireDate).toLocaleDateString() 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessUnitId">Business Unit *</Label>
                  <Select 
                    value={formData.businessUnitId} 
                    onValueChange={(value) => updateFormData('businessUnitId', value)}
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
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Unit</label>
                  <p className="mt-1">{employee.businessUnit.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="mt-1">{employee.department.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="mt-1">{employee.role.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role Description</label>
                  <p className="mt-1 text-sm">{employee.role.description || 'No description available'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                <p className="mt-1">{new Date(employee.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1">{new Date(employee.updatedAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                <p className="mt-1">
                  {employee.lastLoginAt 
                    ? new Date(employee.lastLoginAt).toLocaleDateString() 
                    : 'Never logged in'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <p>Asset assignment history will be displayed here</p>
              <Button variant="outline" size="sm" className="mt-2">
                View Asset History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Permissions Management</CardTitle>
            </div>
            <div className="flex space-x-2">
              {isEditingPermissions ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelPermissions}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSavePermissions}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Permissions
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditingPermissions(true)}
                  disabled={isLoadingPermissions}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Permissions
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading permissions...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <div className="p-2 bg-primary rounded-full">
                  <User className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {employee.employeeId} • {employee.position || 'No position'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{employee.role.name}</Badge>
                    <Badge variant="secondary">{employee.department.name}</Badge>
                  </div>
                </div>
              </div>

              {/* Permission Modules */}
              <div className="space-y-4">
                {availablePermissions.map((module) => (
                  <div key={module.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{module.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getPermissionCount(module.permissions)} of {module.permissions.length} permissions enabled
                        </p>
                      </div>
                      <Badge variant="outline">
                        {getPermissionCount(module.permissions)}/{module.permissions.length}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {module.permissions.map((permission) => (
                        <div key={permission.key} className="flex items-center justify-between space-x-2">
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={permission.key}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                          <Switch
                            id={permission.key}
                            checked={permissions[permission.key] === true}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.key, checked)
                            }
                            disabled={!isEditingPermissions}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Permission Summary
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Total permissions enabled: {Object.values(permissions).filter(Boolean).length} out of{' '}
                  {availablePermissions.reduce((total, module) => total + module.permissions.length, 0)}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Changes will be applied to the employee&apos;s role: {employeePermissions?.roleName}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}