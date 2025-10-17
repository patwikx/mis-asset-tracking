// components/assets/asset-disposals-page.tsx
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trash2,
  FileText,
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
  getAssetDisposals,
  getDisposalSummary,
  approveAssetDisposal
} from '@/lib/actions/asset-disposal-actions';
import type {
  AssetDisposalWithRelations,
  DisposalFilters,
  PaginationParams,
  DisposalSummary
} from '@/types/asset-types';

interface AssetDisposalsPageProps {
  businessUnitId: string;
}

// Helper function to get disposal reason color
const getDisposalReasonColor = (reason: string): string => {
  switch (reason) {
    case 'SOLD':
      return 'bg-green-500';
    case 'DONATED':
      return 'bg-blue-500';
    case 'SCRAPPED':
      return 'bg-gray-500';
    case 'LOST':
    case 'STOLEN':
      return 'bg-red-500';
    case 'TRANSFERRED':
      return 'bg-purple-500';
    case 'END_OF_LIFE':
    case 'OBSOLETE':
      return 'bg-orange-500';
    case 'DAMAGED_BEYOND_REPAIR':
      return 'bg-red-600';
    case 'REGULATORY_COMPLIANCE':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format disposal reason text
const formatDisposalReason = (reason: string): string => {
  return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export function AssetDisposalsPage({ businessUnitId }: AssetDisposalsPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [disposals, setDisposals] = useState<AssetDisposalWithRelations[]>([]);
  const [summary, setSummary] = useState<DisposalSummary | null>(null);
  
  const [filters, setFilters] = useState<DisposalFilters>({
    approvalStatus: 'ALL'
  });
  
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const handleBack = () => {
    router.push(`/${businessUnitId}/assets`);
  };

  const loadDisposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAssetDisposals(businessUnitId, filters, pagination);
      setDisposals(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      toast.error('Failed to load disposals');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  const loadSummary = useCallback(async () => {
    try {
      const summaryData = await getDisposalSummary(businessUnitId);
      setSummary(summaryData);
    } catch (error) {
      toast.error('Failed to load disposal summary');
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadDisposals();
  }, [loadDisposals]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleCreateDisposal = () => {
    router.push(`/${businessUnitId}/assets/disposals/create`);
  };

  const handleViewDisposal = (disposal: AssetDisposalWithRelations) => {
    router.push(`/${businessUnitId}/assets/disposals/${disposal.id}`);
  };

  const handleApproveDisposal = async (disposalId: string) => {
    try {
      const result = await approveAssetDisposal(disposalId);
      if (result.success) {
        toast.success(result.message);
        loadDisposals();
        loadSummary();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve disposal');
    }
  };

  const handleFiltersChange = (newFilters: Partial<DisposalFilters>) => {
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
            <h1 className="text-2xl font-bold">Asset Disposals</h1>
            <p className="text-muted-foreground">Manage asset disposals and end-of-life processing</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/${businessUnitId}/assets/disposals/bulk`)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Disposal
          </Button>
          <Button onClick={handleCreateDisposal}>
            <Plus className="h-4 w-4 mr-2" />
            New Disposal
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDisposals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{summary.totalDisposalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Net: ₱{summary.netDisposalValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
              {summary.totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₱{Math.abs(summary.totalGainLoss).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalGainLoss >= 0 ? 'Gain' : 'Loss'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingApprovals}</div>
              {summary.pendingApprovals > 0 && (
                <p className="text-xs text-orange-600">Requires attention</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  placeholder="Search disposals..."
                  value={filters.search || ''}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Disposal Reason</Label>
              <Select 
                value={filters.reason || ''} 
                onValueChange={(value) => handleFiltersChange({ 
                  reason: value === '' || value === 'all-reasons' ? undefined : value as DisposalFilters['reason']
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-reasons">All Reasons</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="DONATED">Donated</SelectItem>
                  <SelectItem value="SCRAPPED">Scrapped</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                  <SelectItem value="STOLEN">Stolen</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                  <SelectItem value="END_OF_LIFE">End of Life</SelectItem>
                  <SelectItem value="DAMAGED_BEYOND_REPAIR">Damaged Beyond Repair</SelectItem>
                  <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                  <SelectItem value="REGULATORY_COMPLIANCE">Regulatory Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Approval Status</Label>
              <Select 
                value={filters.approvalStatus || 'ALL'} 
                onValueChange={(value) => handleFiltersChange({ 
                  approvalStatus: value as DisposalFilters['approvalStatus']
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

      {/* Disposals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Disposal Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Disposal Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Gain/Loss</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading disposals...
                    </TableCell>
                  </TableRow>
                ) : disposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No disposals found
                    </TableCell>
                  </TableRow>
                ) : (
                  disposals.map((disposal) => (
                    <TableRow key={disposal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{disposal.asset.itemCode}</div>
                          <div className="text-sm text-muted-foreground">
                            {disposal.asset.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(disposal.disposalDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getDisposalReasonColor(disposal.reason)}`} />
                          {formatDisposalReason(disposal.reason)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {disposal.disposalValue ? `₱${disposal.disposalValue.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {disposal.gainLoss ? (
                          <span className={disposal.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {disposal.gainLoss >= 0 ? '+' : ''}₱{Math.abs(disposal.gainLoss).toLocaleString()}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {disposal.approvedAt ? (
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
                            onClick={() => handleViewDisposal(disposal)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!disposal.approvedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveDisposal(disposal.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
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
          {!isLoading && disposals.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((paginationInfo.page - 1) * paginationInfo.limit) + 1} to{' '}
                {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)} of{' '}
                {paginationInfo.total} disposals
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

      {/* Disposal Reasons Summary */}
      {summary && summary.disposalsByReason.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disposal Breakdown by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.disposalsByReason.map((item) => (
                <div key={item.reason} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getDisposalReasonColor(item.reason)}`} />
                    <div>
                      <div className="font-medium">{formatDisposalReason(item.reason)}</div>
                      <div className="text-sm text-muted-foreground">{item.count} assets</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₱{item.totalValue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}