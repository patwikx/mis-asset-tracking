/* eslint-disable @typescript-eslint/no-unused-vars */
// components/audit-logs/audit-logs-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Download, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type {
  AuditLog,
  AuditLogFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/audit-log-types';
import { getAuditLogs, getAuditLogStats } from '@/lib/actions/audit-log-actions';

interface AuditLogsPageProps {
  businessUnitId: string;
}

export function AuditLogsPage({ businessUnitId }: AuditLogsPageProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalLogs: number;
    todayLogs: number;
    actionStats: Array<{ action: string; count: number }>;
    tableStats: Array<{ tableName: string; count: number }>;
  } | null>(null);
  
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 20 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedResponse<AuditLog> = await getAuditLogs(businessUnitId, filters, pagination);
      setAuditLogs(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await getAuditLogStats(businessUnitId);
      setStats(statsData);
    } catch (error) {
      toast.error(`Error loading audit log stats: ${error}`)
    }
  }, [businessUnitId]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = () => {
    loadAuditLogs();
    loadStats();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleFiltersChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Activity className="h-6 w-6 mr-2" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Track system activities and changes</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today&apos;s Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayLogs.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Most Common Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.actionStats[0]?.action || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.actionStats[0]?.count || 0} occurrences
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Most Active Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.tableStats[0]?.tableName || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.tableStats[0]?.count || 0} changes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={filters.search || ''}
                onChange={(e) => handleFiltersChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.action || ''} onValueChange={(value) => handleFiltersChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-actions">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.tableName || ''} onValueChange={(value) => handleFiltersChange('tableName', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-tables">All Tables</SelectItem>
                <SelectItem value="Asset">Assets</SelectItem>
                <SelectItem value="Employee">Employees</SelectItem>
                <SelectItem value="AssetDeployment">Deployments</SelectItem>
                <SelectItem value="Department">Departments</SelectItem>
                <SelectItem value="Role">Roles</SelectItem>
                <SelectItem value="User">Users</SelectItem>
                <SelectItem value="Report">Reports</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 w-48 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 w-32 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-3 border rounded hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown User'} {log.action.toLowerCase()}d {log.tableName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Record ID: {log.recordId} • {log.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && auditLogs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((paginationInfo.page - 1) * paginationInfo.limit) + 1} to{' '}
                {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)} of{' '}
                {paginationInfo.total} results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={paginationInfo.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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