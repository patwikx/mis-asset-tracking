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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, User } from "lucide-react";
import { toast } from "sonner";
import type { EmployeeWithRelations } from '@/types/employee-types';
import { EmployeePermissions, Permission, PermissionModule } from '@/types/permissions-types';
import { getAvailablePermissions, getEmployeePermissions, updateEmployeePermissions } from '@/lib/actions/permissions-actions';


interface EmployeePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeWithRelations | null;
  onSuccess: () => void;
}

export const EmployeePermissionsDialog: React.FC<EmployeePermissionsDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissions | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionModule[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && employee) {
      loadPermissionData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee]);

  const loadPermissionData = async () => {
    if (!employee) return;

    setIsLoadingData(true);
    try {
      const [empPermissions, availablePerms] = await Promise.all([
        getEmployeePermissions(employee.id),
        getAvailablePermissions()
      ]);

      setEmployeePermissions(empPermissions);
      setAvailablePermissions(availablePerms);
      setPermissions(empPermissions?.permissions || {});
    } catch (error) {
      console.error('Error loading permission data:', error);
      toast.error('Failed to load permission data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePermissionChange = (permissionKey: string, enabled: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: enabled
    }));
  };

  const handleSubmit = async () => {
    if (!employee || !employeePermissions) return;

    setIsLoading(true);
    try {
      const result = await updateEmployeePermissions({
        employeeId: employee.id,
        permissions
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionCount = (modulePermissions: Permission[]) => {
    return modulePermissions.filter(perm => permissions[perm.key] === true).length;
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Manage Permissions</span>
          </DialogTitle>
          <DialogDescription>
            Configure permissions for {employee.firstName} {employee.lastName}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
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
            disabled={isLoading || isLoadingData}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};