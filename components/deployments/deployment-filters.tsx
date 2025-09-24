// components/deployments/deployment-filters.tsx
'use client'

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, X, Check, ChevronsUpDown, User, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DeploymentStatus } from '@prisma/client';
import type { DeploymentFilters } from '@/types/asset-types';
import { getEmployees } from '@/lib/actions/deployment-actions';

interface DeploymentFiltersProps {
  filters: DeploymentFilters;
  onFiltersChange: (filters: DeploymentFilters) => void;
  onClearFilters: () => void;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}



export const DeploymentFiltersComponent: React.FC<DeploymentFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [open, setOpen] = useState(false);
  const [employeeComboOpen, setEmployeeComboOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [localFilters, setLocalFilters] = useState<DeploymentFilters>(filters);

  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.lastName} ${employee.employeeId}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase())
  );

  const statuses = Object.values(DeploymentStatus);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const loadFilterData = async () => {
    try {
      const employeesData = await getEmployees();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  const updateFilter = (key: keyof DeploymentFilters, value: string | Date | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: DeploymentFilters = {};
    setLocalFilters(emptyFilters);
    onClearFilters();
    setOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filter
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="px-6">
        <SheetHeader className="px-0">
          <SheetTitle>Filter Deployments</SheetTitle>
          <SheetDescription>
            Use the filters below to narrow down your deployment search.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by asset, employee, or ID..."
              value={localFilters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={localFilters.status || ''} 
              onValueChange={(value) => updateFilter('status', value as DeploymentStatus || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee */}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Popover open={employeeComboOpen} onOpenChange={setEmployeeComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeeComboOpen}
                  className="w-full justify-between"
                >
                  {localFilters.employeeId
                    ? employees.find((employee) => employee.id === localFilters.employeeId)
                        ? `${employees.find((employee) => employee.id === localFilters.employeeId)?.firstName} ${employees.find((employee) => employee.id === localFilters.employeeId)?.lastName} (${employees.find((employee) => employee.id === localFilters.employeeId)?.employeeId})`
                        : "Select employee..."
                    : "All employees"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-2">
                <div className="space-y-2">
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    <div
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                        !localFilters.employeeId && "bg-accent"
                      )}
                      onClick={() => {
                        updateFilter('employeeId', undefined);
                        setEmployeeComboOpen(false);
                        setEmployeeSearch('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !localFilters.employeeId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      All employees
                    </div>
                    {filteredEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                          localFilters.employeeId === employee.id && "bg-accent"
                        )}
                        onClick={() => {
                          updateFilter('employeeId', employee.id);
                          setEmployeeComboOpen(false);
                          setEmployeeSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            localFilters.employeeId === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        {employee.firstName} {employee.lastName} ({employee.employeeId})
                      </div>
                    ))}
                    {filteredEmployees.length === 0 && employeeSearch && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No employees found.
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>



          {/* Date Range */}
          <div className="space-y-4">
            <Label>Date Range</Label>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateFrom ? format(localFilters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateFrom}
                      onSelect={(date: Date | undefined) => updateFilter('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateTo ? format(localFilters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateTo}
                      onSelect={(date: Date | undefined) => updateFilter('dateTo', date)}
                      initialFocus
                      disabled={(date: Date) => localFilters.dateFrom ? date < localFilters.dateFrom : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button onClick={applyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};