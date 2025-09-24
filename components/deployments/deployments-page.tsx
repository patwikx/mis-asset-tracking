// components/deployments/deployments-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { AssetsHeader } from '../assets/assets-header';
import { DeploymentsTable } from './deployments-table';
import { DeploymentFormDialog } from './deployment-form-dialog';
import { DeploymentFiltersComponent } from './deployment-filters';
import { AssetPagination } from '../assets/asset-pagination';
import { toast } from "sonner";
import { DeploymentStatus } from '@prisma/client';
import type { 
  AssetDeploymentWithRelations,
  DeploymentFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types/asset-types';
import { 
  getDeployments,
  updateDeployment
} from '@/lib/actions/deployment-actions';
import { useBusinessUnit } from '@/context/business-unit-context';

export const DeploymentsPage: React.FC = () => {
  const { businessUnitId } = useBusinessUnit();
  const [deployments, setDeployments] = useState<AssetDeploymentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<AssetDeploymentWithRelations | null>(null);
  
  const [filters, setFilters] = useState<DeploymentFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadDeployments = useCallback(async () => {
    if (!businessUnitId) return;
    
    setIsLoading(true);
    try {
      const result: PaginatedResponse<AssetDeploymentWithRelations> = await getDeployments(businessUnitId, filters, pagination);
      setDeployments(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading deployments:', error);
      toast.error('Failed to load deployments');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  useEffect(() => {
    loadDeployments();
  }, [loadDeployments]);

  const handleCreateNew = () => {
    setSelectedDeployment(null);
    setShowCreateDialog(true);
  };

  const handleView = (deployment: AssetDeploymentWithRelations) => {
    // TODO: Implement deployment detail view
    console.log('View deployment:', deployment);
    toast.info('Deployment detail view coming soon');
  };

  const handleEdit = (deployment: AssetDeploymentWithRelations) => {
    setSelectedDeployment(deployment);
    setShowEditDialog(true);
  };

  const handleApprove = async (deployment: AssetDeploymentWithRelations) => {
    try {
      const result = await updateDeployment({
        id: deployment.id,
        status: DeploymentStatus.APPROVED,
        accountingNotes: 'Approved via deployment management interface'
      });

      if (result.success) {
        toast.success('Deployment approved successfully');
        loadDeployments();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error approving deployment:', error);
      toast.error('Failed to approve deployment');
    }
  };

  const handleReject = async (deployment: AssetDeploymentWithRelations) => {
    try {
      const result = await updateDeployment({
        id: deployment.id,
        status: DeploymentStatus.CANCELLED,
        accountingNotes: 'Rejected via deployment management interface'
      });

      if (result.success) {
        toast.success('Deployment rejected successfully');
        loadDeployments();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error rejecting deployment:', error);
      toast.error('Failed to reject deployment');
    }
  };

  const handleReturn = async (deployment: AssetDeploymentWithRelations) => {
    try {
      const result = await updateDeployment({
        id: deployment.id,
        status: DeploymentStatus.RETURNED,
        returnedDate: new Date(),
        returnCondition: 'Good condition',
        returnNotes: 'Returned via deployment management interface'
      });

      if (result.success) {
        toast.success('Asset returned successfully');
        loadDeployments();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error returning asset:', error);
      toast.error('Failed to return asset');
    }
  };

  const handleRefresh = () => {
    loadDeployments();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (newFilters: DeploymentFilters) => {
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
    loadDeployments();
  };

  return (
    <div className="space-y-6">
      <AssetsHeader
        title="Asset Deployments"
        description="Manage asset deployments and assignments"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
        showFilterButton={false} // Filter is handled by the DeploymentFiltersComponent
      />

      <div className="flex items-center space-x-4">
        <DeploymentFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <DeploymentsTable
        deployments={deployments}
        onView={handleView}
        onEdit={handleEdit}
        onApprove={handleApprove}
        onReject={handleReject}
        onReturn={handleReturn}
        isLoading={isLoading}
      />

      {!isLoading && deployments.length > 0 && (
        <AssetPagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <DeploymentFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        deployment={null}
        onSuccess={handleFormSuccess}
      />

      <DeploymentFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        deployment={selectedDeployment}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};