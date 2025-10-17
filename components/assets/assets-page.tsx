/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/assets-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AssetsHeader } from './assets-header';
import { AssetsTable } from './assets-table';
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
  const router = useRouter();
  const [assets, setAssets] = useState<AssetWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleCreateNew = () => {
    router.push(`/${businessUnitId}/assets/create`);
  };

  const handleBulkCreate = () => {
    router.push(`/${businessUnitId}/assets/bulk-create`);
  };

  const handleBulkOperations = () => {
    router.push(`/${businessUnitId}/assets/bulk-operations`);
  };



  const handleView = (asset: AssetWithRelations) => {
    router.push(`/${businessUnitId}/assets/${asset.id}`);
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
        onBulkCreate={handleBulkCreate}
        onBulkOperations={handleBulkOperations}
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

      <AssetDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        asset={selectedAsset}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};