// components/assets/asset-retirements-page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  CheckCircle, 
  Clock, 
  Calendar,
  Package,
  Trash2,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getAssetRetirements,
  approveAssetRetirement,
  generateEndOfLifeNotifications
} from '@/lib/actions/asset-retirement-actions';
import type {
  AssetRetirementWithRelations,
  RetirementFilters
} from '@/lib/actions/asset-retirement-actions';
import type { PaginationParams } from '@/types/asset-types';

interface AssetRetirementsPageProps {
  businessUnitId: string;
}

// Helper function to get retirement reason color
const getRetirementReasonColor = (reason: string): string => {
  switch (reason) {
    case 'END_OF_USEFUL_LIFE':
      return 'bg-orange-500';
    case 'FULLY_DEPRECIATED':
      return 'bg-purple-500';
    case 'OBSOLETE':
      return 'bg-gray-500';
    case 'DAMAGED_BEYOND_REPAIR':
      return 'bg-red-500';
    case 'POLICY_CHANGE':
      return 'bg-blue-500';
    case 'UPGRADE_REPLACEMENT':
      return 'bg-green-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format retirement reason text
const formatRetirementReason = (reason: string): string => {
  return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function AssetRetirementsPage({ businessUnitId }: AssetRetirementsPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingNotifications, setIsGeneratingNotifications] = useState(false);
  const [retirements, setRetirements] = useState<AssetRetirementWithRelations[]>([]);
  
  const [filters, setFilters] = useState<RetirementFilters>({
    approvalStatus: 'ALL'
  });
  
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadRetirements = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAssetRetirements(businessUnitId, filters, pagination);
      setRetirements(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      toast.error('Failed to load retirements');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  useEffect(() => {
    loadRetirements();
  }, [loadRetirements]);

  const handleCreateRetirement = () => {
    router.push(`/${businessUnitId}/assets/retirements/create`);
  };

  const handleViewRetirement = (retirement: AssetRetirementWithRelations) => {
    router.push(`/${businessUnitId}/assets/retirements/${retirement.id}`);
  };

  const handleApproveRetirement = async (retirementId: string) => {
    try {
      const result = await approveAssetRetirement(retirementId);
      if (result.success) {
        toast.success(result.message);
        loadRetirements();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve retirement');
    }
  };

  const handleGenerateNotifications = async () => {
    setIsGeneratingNotifications(true);
    try {
      const result = await generateEndOfLifeNotifications(businessUnitId);
      if (result.success) {
        toast.success(`${result.message} (${result.notificationsCreated} notifications created)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to generate notifications');
    } finally {
      setIsGeneratingNotifications(false);
    }
  };

  const handleFiltersChange = (newFilters: Partial<RetirementFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ approvalStatus: 'ALL' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">Asset Retirements</h1>
            <p className="text-muted-foreground">Manage asset retirement workflow and end-of-life processing</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateNotifications}
            disabled={isGeneratingNotifications}
          >
            {isGeneratingNotifications ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Generate EOL Notifications
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/${businessUnitId}/assets/retirements/bulk`)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Retirement
          </Button>
          <Button onClick={handleCreateRetirement}>
            <Plus className="h-4 w-4 mr-2" />
            New Retirement
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retirements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retirements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retirements.filter(r => !r.approvedAt).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disposal Planned</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retirements.filter(r => r.disposalPlanned).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {retirements.filter(r => {
                const retirementDate = new Date(r.retirementDate);
                const now = new Date();
                return retirementDate.getMonth() === now.getMonth() && 
                       retirementDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search retirements..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Retirement Reason</Label>
              <Select 
                value={filters.reason || ''} 
                onValueChange={(value) => handleFiltersChange({ 
                  reason: value === '' || value === 'all-reasons' ? undefined : value as RetirementFilters['reason']
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-reasons">All Reasons</SelectItem>
                  <SelectItem value="END_OF_USEFUL_LIFE">End of Useful Life</SelectItem>
                  <SelectItem value="FULLY_DEPRECIATED">Fully Depreciated</SelectItem>
                  <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                  <SelectItem value="DAMAGED_BEYOND_REPAIR">Damaged Beyond Repair</SelectItem>
                  <SelectItem value="POLICY_CHANGE">Policy Change</SelectItem>
                  <SelectItem value="UPGRADE_REPLACEMENT">Upgrade Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Approval Status</Label>
              <Select 
                value={filters.approvalStatus || 'ALL'} 
                onValueChange={(value) => handleFiltersChange({ 
                  approvalStatus: value as RetirementFilters['approvalStatus']
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "MMM dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date: Date | undefined) => handleFiltersChange({ dateFrom: date })}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "MMM dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date: Date | undefined) => handleFiltersChange({ dateTo: date })}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Retirements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Retirement Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Disposal Planned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading retirements...
                    </TableCell>
                  </TableRow>
                ) : retirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No retirements found
                    </TableCell>
                  </TableRow>
                ) : (
                  retirements.map((retirement) => (
                    <TableRow key={retirement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{retirement.asset.itemCode}</div>
                          <div className="text-sm text-muted-foreground">
                            {retirement.asset.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(retirement.retirementDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getRetirementReasonColor(retirement.reason)}`} />
                          {formatRetirementReason(retirement.reason)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {retirement.condition ? (
                          <Badge variant="outline">
                            {retirement.condition.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {retirement.disposalPlanned ? (
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm">
                              {retirement.disposalDate ? format(new Date(retirement.disposalDate), 'MMM dd, yyyy') : 'Yes'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {retirement.approvedAt ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRetirement(retirement)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!retirement.approvedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveRetirement(retirement.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && retirements.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((paginationInfo.page - 1) * paginationInfo.limit) + 1} to{' '}
                {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)} of{' '}
                {paginationInfo.total} retirements
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.page - 1)}
                  disabled={paginationInfo.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.page + 1)}
                  disabled={paginationInfo.page >= paginationInfo.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}