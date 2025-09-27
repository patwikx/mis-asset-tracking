// components/maintenance/maintenance-page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ListFilter as Filter, RefreshCw, Download, Wrench, Calendar as CalendarIcon, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useBusinessUnit } from '@/context/business-unit-context';
import { 
  getAssetMaintenanceRecords, 
  getMaintenanceSchedule 
} from '@/lib/actions/asset-maintenance-actions';
import type { 
  AssetMaintenanceWithRelations, 
  MaintenanceFilters,
  MaintenanceScheduleItem,
  PaginationParams,
} from '@/types/maintenance-types';

export function MaintenancePage() {
  const { businessUnitId } = useBusinessUnit();
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceWithRelations[]>([]);
  const [schedule, setSchedule] = useState<MaintenanceScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'schedule'>('records');
  
  const [filters, setFilters] = useState<MaintenanceFilters>({});
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadMaintenanceData = useCallback(async () => {
    if (!businessUnitId) return;
    
    setIsLoading(true);
    try {
      const [recordsResult, scheduleResult] = await Promise.all([
        getAssetMaintenanceRecords(undefined, businessUnitId, filters, pagination),
        getMaintenanceSchedule(businessUnitId)
      ]);
      
      setMaintenanceRecords(recordsResult.data);
      setPaginationInfo(recordsResult.pagination);
      setSchedule(scheduleResult);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast.error('Failed to load maintenance data');
    } finally {
      setIsLoading(false);
    }
  }, [businessUnitId, filters, pagination]);

  useEffect(() => {
    loadMaintenanceData();
  }, [loadMaintenanceData]);

  const handleRefresh = () => {
    loadMaintenanceData();
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'CORRECTIVE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      case 'INSPECTION':
        return 'bg-green-100 text-green-800';
      case 'CALIBRATION':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (isCompleted: boolean, isOverdue?: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (isOverdue) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Wrench className="h-6 w-6 mr-2" />
            Asset Maintenance
          </h1>
          <p className="text-muted-foreground">
            Manage asset maintenance records and schedules
          </p>
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'records' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('records')}
        >
          Maintenance Records
        </Button>
        <Button
          variant={activeTab === 'schedule' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('schedule')}
        >
          Maintenance Schedule
        </Button>
      </div>

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
                placeholder="Search maintenance..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select 
              value={filters.maintenanceType || ''} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, maintenanceType: value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="INSPECTION">Inspection</SelectItem>
                <SelectItem value="CALIBRATION">Calibration</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as MaintenanceFilters['status'] || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({})}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'records' ? (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : maintenanceRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No maintenance records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.isCompleted)}
                          <h3 className="font-medium">{record.description}</h3>
                          <Badge className={getMaintenanceTypeColor(record.maintenanceType)}>
                            {record.maintenanceType}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Asset: {record.asset.itemCode} - {record.asset.description}</p>
                          <p>Category: {record.asset.category.name}</p>
                          {record.scheduledDate && (
                            <p>Scheduled: {format(new Date(record.scheduledDate), 'PPP')}</p>
                          )}
                          {record.performedBy && (
                            <p>Performed by: {record.performedBy}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {record.cost && (
                          <p className="font-medium">₱{record.cost.toLocaleString()}</p>
                        )}
                        <Badge variant={record.isCompleted ? 'default' : 'secondary'}>
                          {record.isCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled maintenance found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(false, item.isOverdue)}
                          <h3 className="font-medium">{item.description}</h3>
                          <Badge className={getMaintenanceTypeColor(item.maintenanceType)}>
                            {item.maintenanceType}
                          </Badge>
                          {item.isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Asset: {item.assetCode} - {item.assetDescription}</p>
                          <p>Scheduled: {format(new Date(item.scheduledDate), 'PPP')}</p>
                          <p>
                            {item.isOverdue 
                              ? `Overdue by ${Math.abs(item.daysUntilDue)} days`
                              : `Due in ${item.daysUntilDue} days`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Start Maintenance
                        </Button>
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}