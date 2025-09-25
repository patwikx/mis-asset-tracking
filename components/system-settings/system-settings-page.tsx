// components/system-settings/system-settings-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { SystemSettingsHeader } from './system-settings-header';
import { SystemSettingsTable } from './system-settings-table';
import { SystemSettingFormDialog } from './system-setting-form-dialog';
import { SystemSettingDeleteDialog } from './system-setting-delete-dialog';
import { SystemSettingFiltersComponent } from './system-setting-filters';
import { SystemSettingPagination } from './system-setting-pagination';
import { toast } from "sonner";
import type { 
  SystemSettingWithRelations, 
  SystemSettingFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/system-settings-types';
import { getSystemSettings } from '@/lib/actions/system-settings-actions';
import { useRouter } from 'next/navigation';
import { useBusinessUnit } from '@/context/business-unit-context';

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSettingWithRelations | null>(null);
  const router = useRouter();
  const { businessUnitId } = useBusinessUnit();
  
  const [filters, setFilters] = useState<SystemSettingFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedResponse<SystemSettingWithRelations> = await getSystemSettings(filters, pagination);
      setSettings(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleCreateNew = () => {
    setSelectedSetting(null);
    setShowCreateDialog(true);
  };

    const handleView = (setting: SystemSettingWithRelations) => {
      router.push(`/${businessUnitId}/system-settings/${setting.id}`);
    };

  const handleEdit = (setting: SystemSettingWithRelations) => {
    setSelectedSetting(setting);
    setShowEditDialog(true);
  };

  const handleDelete = (setting: SystemSettingWithRelations) => {
    setSelectedSetting(setting);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadSettings();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: SystemSettingFilters) => {
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
    loadSettings();
  };

  return (
    <div className="space-y-6">
      <SystemSettingsHeader
        title="System Settings"
        description="Manage application configuration and settings"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <div className="flex items-center space-x-4">
        <SystemSettingFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <SystemSettingsTable
        settings={settings}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && settings.length > 0 && (
        <SystemSettingPagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <SystemSettingFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        setting={null}
        onSuccess={handleFormSuccess}
      />

      <SystemSettingFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        setting={selectedSetting}
        onSuccess={handleFormSuccess}
      />

      <SystemSettingDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        setting={selectedSetting}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};