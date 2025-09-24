// components/employees/employee-filters.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EmployeeFilters } from '@/types/employee-types';
import { getDepartments, getRoles } from '@/lib/actions/employee-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

interface EmployeeFiltersComponentProps {
  filters: EmployeeFilters;
  onFiltersChange: (filters: EmployeeFilters) => void;
  onClearFilters: () => void;
}

export const EmployeeFiltersComponent: React.FC<EmployeeFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const { businessUnitId } = useBusinessUnit();

  useEffect(() => {
    loadFilterOptions();
  }, [businessUnitId]);

  const loadFilterOptions = async () => {
    try {
      const [departmentsData, rolesData] = await Promise.all([
        getDepartments(businessUnitId || undefined),
        getRoles()
      ]);
      setDepartments(departmentsData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search employees..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 w-64"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {Object.values(filters).filter(v => v !== undefined && v !== '' && v !== null).length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select
                  value={filters.departmentId || ''}
                  onValueChange={(value) => 
                    onFiltersChange({ ...filters, departmentId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-departments">All departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select
                  value={filters.roleId || ''}
                  onValueChange={(value) => 
                    onFiltersChange({ ...filters, roleId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-roles">All roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.isActive?.toString() || ''}
                  onValueChange={(value) => 
                    onFiltersChange({ 
                      ...filters, 
                      isActive: value === '' ? undefined : value === 'true' 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All statuses</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};