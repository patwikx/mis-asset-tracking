// components/deployments/deployments-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, CheckCircle, XCircle, MoreHorizontal, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from 'next/navigation';
import { getDeployments } from '@/lib/actions/deployment-actions';
import { getEmployees } from '@/lib/actions/employee-actions';
import { getAssets } from '@/lib/actions/asset-actions';
import { DeploymentApprovalDialog } from './deployment-approval-dialog';
import type { AssetDeploymentWithRelations, DeploymentFilters } from '@/types/asset-types';
import { toast } from 'sonner';

interface DeploymentsPageProps {
  businessUnitId: string;
}

const DEPLOYMENT_STATUSES = [
  { value: 'PENDING_ACCOUNTING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DEPLOYED', label: 'Deployed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export function DeploymentsPage({ businessUnitId }: DeploymentsPageProps) {
  const router = useRouter();
  const [deployments, setDeployments] = useState<AssetDeploymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DeploymentFilters>({});
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [assets, setAssets] = useState<{ id: string; itemCode: string; description: string }[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    deployment: AssetDeploymentWithRelations | null;
    action: 'approve' | 'reject';
  }>({
    open: false,
    deployment: null,
    action: 'approve'
  });

  const loadDeployments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getDeployments(businessUnitId, filters);
      setDeployments(result.data || []);
    } catch (error) {
      toast.error(`Error loading deployments: ${error}`)
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, filters]);

  const loadFilterOptions = useCallback(async () => {
    try {
      setFiltersLoading(true);
      const [employeesResult, assetsResult] = await Promise.all([
        getEmployees(businessUnitId, {}),
        getAssets(businessUnitId, {})
      ]);
      
      setEmployees(employeesResult.data || []);
      setAssets(assetsResult.data || []);
    } catch (error) {
      toast.error(`Error loading filter options: ${error}`)
    } finally {
      setFiltersLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadDeployments();
  }, [loadDeployments]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  };

  const handleStatusFilter = (value: string) => {
    if (value === 'all-statuses' || value === '') {
      setFilters(prev => ({ ...prev, status: undefined }));
    } else {
      setFilters(prev => ({ ...prev, status: value as DeploymentFilters['status'] }));
    }
  };

  const handleEmployeeFilter = (value: string) => {
    if (value === 'all-employees' || value === '') {
      setFilters(prev => ({ ...prev, employeeId: undefined }));
    } else {
      setFilters(prev => ({ ...prev, employeeId: value }));
    }
  };

  const handleAssetFilter = (value: string) => {
    if (value === 'all-assets' || value === '') {
      setFilters(prev => ({ ...prev, assetId: undefined }));
    } else {
      setFilters(prev => ({ ...prev, assetId: value }));
    }
  };

  const handleDateFilter = (field: 'dateFrom' | 'dateTo', value: string) => {
    const dateValue = value ? new Date(value) : undefined;
    setFilters(prev => ({ ...prev, [field]: dateValue }));
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && value !== null
  ).length;

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ACCOUNTING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = DEPLOYMENT_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };

  const handleDeploymentClick = (deploymentId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((event.target as HTMLElement).closest('[data-action-menu]')) {
      return;
    }
    router.push(`/${businessUnitId}/deployments/${deploymentId}`);
  };

  const handleApproveDeployment = (deployment: AssetDeploymentWithRelations) => {
    setApprovalDialog({
      open: true,
      deployment,
      action: 'approve'
    });
  };

  const handleRejectDeployment = (deployment: AssetDeploymentWithRelations) => {
    setApprovalDialog({
      open: true,
      deployment,
      action: 'reject'
    });
  };

  const handleApprovalSuccess = () => {
    loadDeployments();
  };

  const canShowApprovalActions = (deployment: AssetDeploymentWithRelations) => {
    return deployment.status === 'PENDING_ACCOUNTING_APPROVAL';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Deployments</h1>
          <p className="text-muted-foreground">Manage asset deployments and assignments</p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/assets/deployments/create`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deployment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Deployments</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search deployments..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={filtersLoading}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select
                          value={filters.status || ''}
                          onValueChange={handleStatusFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-statuses">All statuses</SelectItem>
                            {DEPLOYMENT_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Employee</label>
                        <Select
                          value={filters.employeeId || ''}
                          onValueChange={handleEmployeeFilter}
                          disabled={filtersLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All employees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-employees">All employees</SelectItem>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Asset</label>
                        <Select
                          value={filters.assetId || ''}
                          onValueChange={handleAssetFilter}
                          disabled={filtersLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All assets" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-assets">All assets</SelectItem>
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.itemCode} - {asset.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Input
                              type="date"
                              placeholder="Date from"
                              value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                              onChange={(e) => handleDateFilter('dateFrom', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Input
                              type="date"
                              placeholder="Date to"
                              value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                              onChange={(e) => handleDateFilter('dateTo', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading deployments...</p>
            </div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  <p className="text-lg font-medium">No deployments match your filters</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4" 
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <p>No deployments found</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
              </div>
              
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={(e) => handleDeploymentClick(deployment.id, e)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-bold text-2xl">
                          {deployment.transmittalNumber}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">
                          {deployment.asset.itemCode} - {deployment.asset.description}
                        </h3>
                        <Badge className={getStatusColor(deployment.status)}>
                          {getStatusLabel(deployment.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Employee: {deployment.employee.firstName} {deployment.employee.lastName}</p>
                        <p>Category: {deployment.asset.category.name}</p>
                        <p>Department: {deployment.employee.departmentId || 'N/A'}</p>
                        {deployment.deployedDate && (
                          <p>Deployed: {new Date(deployment.deployedDate).toLocaleDateString()}</p>
                        )}
                        {deployment.expectedReturnDate && (
                          <p>Expected Return: {new Date(deployment.expectedReturnDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Created: {new Date(deployment.createdAt).toLocaleDateString()}</p>
                        {deployment.returnedDate && (
                          <p>Returned: {new Date(deployment.returnedDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      
                      {canShowApprovalActions(deployment) && (
                        <div data-action-menu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveDeployment(deployment);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectDeployment(deployment);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeploymentApprovalDialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}
        deployment={approvalDialog.deployment}
        action={approvalDialog.action}
        onSuccess={handleApprovalSuccess}
      />
    </div>
  );
}