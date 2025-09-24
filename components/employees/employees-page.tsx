// components/employees/employees-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import type { 
  EmployeeWithRelations, 
  EmployeeFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/employee-types';
import { getEmployees } from '@/lib/actions/employee-actions';
import { useBusinessUnit } from '@/context/business-unit-context';
import { EmployeesHeader } from './employees-header';
import { EmployeeFiltersComponent } from './employee-filters';
import { EmployeesTable } from './employees-table';
import { EmployeePagination } from './employee-pagination';
import { EmployeeFormDialog } from './employee-form-dialog';
import { EmployeeDeleteDialog } from './employee-delete-dialog';

export const EmployeesPage: React.FC = () => {
  const { businessUnitId } = useBusinessUnit();
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRelations | null>(null);
  
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadEmployees = useCallback(async () => {
    if (!businessUnitId) return;
    
    setIsLoading(true);
    try {
      const result: PaginatedResponse<EmployeeWithRelations> = await getEmployees(businessUnitId, filters, pagination);
      setEmployees(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreateNew = () => {
    setSelectedEmployee(null);
    setShowCreateDialog(true);
  };

  const handleView = (employee: EmployeeWithRelations) => {
    // TODO: Implement employee detail view
    console.log('View employee:', employee);
    toast.info('Employee detail view coming soon');
  };

  const handleEdit = (employee: EmployeeWithRelations) => {
    setSelectedEmployee(employee);
    setShowEditDialog(true);
  };

  const handleDelete = (employee: EmployeeWithRelations) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadEmployees();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: EmployeeFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination({ page: 1, limit });
  };

  const handleFormSuccess = () => {
    loadEmployees();
  };

  return (
    <div className="space-y-6">
      <EmployeesHeader
        title="Employees"
        description="Manage your organization's employees and staff"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <div className="flex items-center space-x-4">
        <EmployeeFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <EmployeesTable
        employees={employees}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && employees.length > 0 && (
        <EmployeePagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <EmployeeFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        employee={null}
        onSuccess={handleFormSuccess}
      />

      <EmployeeFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        employee={selectedEmployee}
        onSuccess={handleFormSuccess}
      />

      <EmployeeDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        employee={selectedEmployee}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};