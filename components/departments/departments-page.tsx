// components/departments/departments-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { DepartmentsHeader } from './departments-header';
import { DepartmentsTable } from './departments-table';
import { DepartmentFormDialog } from './department-form-dialog';
import { DepartmentDeleteDialog } from './department-delete-dialog';
import { DepartmentFiltersComponent } from './department-filters';
import { DepartmentPagination } from './department-pagination';
import { toast } from "sonner";
import type { 
  DepartmentWithRelations, 
  DepartmentFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/department-types';
import { getDepartments } from '@/lib/actions/department-actions';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithRelations | null>(null);
  
  const [filters, setFilters] = useState<DepartmentFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedResponse<DepartmentWithRelations> = await getDepartments(filters, pagination);
      setDepartments(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleCreateNew = () => {
    setSelectedDepartment(null);
    setShowCreateDialog(true);
  };

  const handleView = (department: DepartmentWithRelations) => {
    console.log('View department:', department);
    toast.info('Department detail view coming soon');
  };

  const handleEdit = (department: DepartmentWithRelations) => {
    setSelectedDepartment(department);
    setShowEditDialog(true);
  };

  const handleDelete = (department: DepartmentWithRelations) => {
    setSelectedDepartment(department);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadDepartments();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: DepartmentFilters) => {
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
    loadDepartments();
  };

  return (
    <div className="space-y-6">
      <DepartmentsHeader
        title="Departments"
        description="Manage your organization's departments and divisions"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <div className="flex items-center space-x-4">
        <DepartmentFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <DepartmentsTable
        departments={departments}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && departments.length > 0 && (
        <DepartmentPagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <DepartmentFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        department={null}
        onSuccess={handleFormSuccess}
      />

      <DepartmentFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        department={selectedDepartment}
        onSuccess={handleFormSuccess}
      />

      <DepartmentDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        department={selectedDepartment}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};