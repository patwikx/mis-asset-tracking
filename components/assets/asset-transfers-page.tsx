/* eslint-disable @typescript-eslint/no-unused-vars */
// components/assets/asset-transfers-page.tsx
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
  XCircle,
  Truck,
  ArrowRightLeft,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getAssetTransfers,
  approveAssetTransfer,
  rejectAssetTransfer,
  completeAssetTransfer
} from '@/lib/actions/asset-transfer-actions';
import { getBusinessUnitsForTransfer } from '@/lib/actions/asset-transfer-actions';
import type {
  AssetTransferWithRelations,
  TransferFilters,
  PaginationParams
} from '@/types/asset-types';

interface AssetTransfersPageProps {
  businessUnitId: string;
}

// Helper function to get transfer status color
const getTransferStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-yellow-500';
    case 'APPROVED':
      return 'bg-blue-500';
    case 'IN_TRANSIT':
      return 'bg-purple-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'CANCELLED':
      return 'bg-gray-500';
    case 'REJECTED':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format transfer status text
const formatTransferStatus = (status: string): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function AssetTransfersPage({ businessUnitId }: AssetTransfersPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [transfers, setTransfers] = useState<AssetTransferWithRelations[]>([]);
  const [businessUnits, setBusinessUnits] = useState<Array<{ id: string; name: string; code: string }>>([]);
  
  const [filters, setFilters] = useState<TransferFilters>({});
  
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAssetTransfers(businessUnitId, filters, pagination);
      setTransfers(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      toast.error('Failed to load transfers');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  const loadBusinessUnits = useCallback(async () => {
    try {
      const businessUnitsData = await getBusinessUnitsForTransfer();
      setBusinessUnits(businessUnitsData);
    } catch (error) {
      toast.error('Failed to load business units');
    }
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    loadBusinessUnits();
  }, [loadBusinessUnits]);

  const handleCreateTransfer = () => {
    router.push(`/${businessUnitId}/assets/transfers/create`);
  };

  const handleViewTransfer = (transfer: AssetTransferWithRelations) => {
    router.push(`/${businessUnitId}/assets/transfers/${transfer.id}`);
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const result = await approveAssetTransfer(transferId);
      if (result.success) {
        toast.success(result.message);
        loadTransfers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve transfer');
    }
  };

  const handleRejectTransfer = async (transferId: string, reason: string) => {
    try {
      const result = await rejectAssetTransfer(transferId, reason);
      if (result.success) {
        toast.success(result.message);
        loadTransfers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to reject transfer');
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    try {
      const result = await completeAssetTransfer(transferId);
      if (result.success) {
        toast.success(result.message);
        loadTransfers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to complete transfer');
    }
  };

  const handleFiltersChange = (newFilters: Partial<TransferFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({});
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
            <h1 className="text-2xl font-bold">Asset Transfers</h1>
            <p className="text-muted-foreground">Manage inter-business unit asset transfers</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/${businessUnitId}/assets/transfers/bulk`)}>
            <Package className="h-4 w-4 mr-2" />
            Bulk Transfer
          </Button>
          <Button onClick={handleCreateTransfer}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transfers.filter(t => t.status === 'PENDING_APPROVAL').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transfers.filter(t => t.status === 'IN_TRANSIT').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transfers.filter(t => t.status === 'COMPLETED').length}
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
                  placeholder="Search transfers..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filters.status || ''} 
                onValueChange={(value) => handleFiltersChange({ 
                  status: value === '' ? undefined : value as TransferFilters['status']
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination</Label>
              <Select 
                value={filters.toBusinessUnitId || ''} 
                onValueChange={(value) => handleFiltersChange({ 
                  toBusinessUnitId: value === '' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-destinations">All Destinations</SelectItem>
                  {businessUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
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

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Transfer Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading transfers...
                    </TableCell>
                  </TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transfers found
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-sm">
                        {transfer.transferNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transfer.asset.itemCode}</div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.asset.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{transfer.fromBusinessUnit.code}</span>
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{transfer.toBusinessUnit.code}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transfer.fromBusinessUnit.name} → {transfer.toBusinessUnit.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getTransferStatusColor(transfer.status)}`} />
                          {formatTransferStatus(transfer.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transfer.requestedByEmployee.firstName} {transfer.requestedByEmployee.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transfer.requestedByEmployee.employeeId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTransfer(transfer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {transfer.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveTransfer(transfer.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectTransfer(transfer.id, 'Rejected from transfers page')}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {transfer.status === 'IN_TRANSIT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCompleteTransfer(transfer.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600" />
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
          {!isLoading && transfers.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((paginationInfo.page - 1) * paginationInfo.limit) + 1} to{' '}
                {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)} of{' '}
                {paginationInfo.total} transfers
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