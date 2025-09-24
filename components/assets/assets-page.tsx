// components/assets/assets-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { AssetsHeader } from './assets-header';
import { AssetsTable } from './assets-table';
import { AssetFormDialog } from './asset-form-dialog';
import { AssetDeleteDialog } from './asset-delete-dialog';
import { AssetFiltersComponent } from './asset-filters';
import { AssetPagination } from './asset-pagination';
import { toast } from "sonner";
import type { 
  AssetWithRelations, 
  AssetFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/asset-types';
import { getAssets } from '@/lib/actions/asset-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

export const AssetsPage: React.FC = () => {
  const { businessUnitId } = useBusinessUnit();
  const [assets, setAssets] = useState<AssetWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithRelations | null>(null);
  
  const [filters, setFilters] = useState<AssetFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadAssets = useCallback(async () => {
    if (!businessUnitId) return;
    
    setIsLoading(true);
    try {
      const result: PaginatedResponse<AssetWithRelations> = await getAssets(businessUnitId, filters, pagination);
      setAssets(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleCreateNew = () => {
    setSelectedAsset(null);
    setShowCreateDialog(true);
  };

  const handleView = (asset: AssetWithRelations) => {
    // TODO: Implement asset detail view
    console.log('View asset:', asset);
    toast.info('Asset detail view coming soon');
  };

  const handleEdit = (asset: AssetWithRelations) => {
    setSelectedAsset(asset);
    setShowEditDialog(true);
  };

  const handleDelete = (asset: AssetWithRelations) => {
    setSelectedAsset(asset);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadAssets();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: AssetFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
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
    loadAssets();
  };

  return (
    <div className="space-y-6">
      <AssetsHeader
        title="Assets"
        description="Manage your organization's assets and equipment"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
        showFilterButton={false} // Filter is handled by the AssetFiltersComponent
      />

      <div className="flex items-center space-x-4">
        <AssetFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <AssetsTable
        assets={assets}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && assets.length > 0 && (
        <AssetPagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <AssetFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        asset={null}
        onSuccess={handleFormSuccess}
      />

      <AssetFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        asset={selectedAsset}
        onSuccess={handleFormSuccess}
      />

      <AssetDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        asset={selectedAsset}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};