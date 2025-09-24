// components/roles/roles-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { RolesHeader } from './roles-header';
import { RolesTable } from './roles-table';
import { RoleFormDialog } from './role-form-dialog';
import { RoleDeleteDialog } from './role-delete-dialog';
import { RoleFiltersComponent } from './role-filters';
import { RolePagination } from './role-pagination';
import { toast } from "sonner";
import type { 
  RoleWithCounts, 
  RoleFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/role-types';
import { getRoles } from '@/lib/actions/role-actions';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithCounts | null>(null);
  
  const [filters, setFilters] = useState<RoleFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedResponse<RoleWithCounts> = await getRoles(filters, pagination);
      setRoles(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateNew = () => {
    setSelectedRole(null);
    setShowCreateDialog(true);
  };

  const handleView = (role: RoleWithCounts) => {
    console.log('View role:', role);
    toast.info('Role detail view coming soon');
  };

  const handleEdit = (role: RoleWithCounts) => {
    setSelectedRole(role);
    setShowEditDialog(true);
  };

  const handleDelete = (role: RoleWithCounts) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadRoles();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: RoleFilters) => {
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
    loadRoles();
  };

  return (
    <div className="space-y-6">
      <RolesHeader
        title="Roles"
        description="Manage user roles and permissions"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <div className="flex items-center space-x-4">
        <RoleFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <RolesTable
        roles={roles}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && roles.length > 0 && (
        <RolePagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <RoleFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        role={null}
        onSuccess={handleFormSuccess}
      />

      <RoleFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        role={selectedRole}
        onSuccess={handleFormSuccess}
      />

      <RoleDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        role={selectedRole}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};