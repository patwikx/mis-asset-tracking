// components/system-settings/system-setting-detail-page.tsx
'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SystemSettingFormDialog } from './system-setting-form-dialog';
import { SystemSettingDeleteDialog } from './system-setting-delete-dialog';
import { toast } from 'sonner';
import type { SystemSettingWithRelations } from '@/types/system-settings-types';

interface SystemSettingDetailPageProps {
  systemSetting: SystemSettingWithRelations;
  businessUnitId: string;
}

export const SystemSettingDetailPage: React.FC<SystemSettingDetailPageProps> = ({
  systemSetting,
  businessUnitId
}) => {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleBack = () => {
    router.push(`/${businessUnitId}/system-settings`);
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleFormSuccess = () => {
    toast.success('System setting updated successfully');
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    toast.success('System setting deleted successfully');
    router.push(`/${businessUnitId}/system-settings`);
  };

  const formatValue = (value: string) => {
    // Try to detect if it's JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    
    // Try to detect if it's boolean
    if (value === 'true' || value === 'false') {
      return value === 'true' ? 'Yes' : 'No';
    }
    
    return value;
  };

  const detectDataType = (value: string) => {
    if (value === 'true' || value === 'false') return 'BOOLEAN';
    if (!isNaN(Number(value)) && value !== '') return 'NUMBER';
    if (value.startsWith('{') || value.startsWith('[')) return 'JSON';
    return 'STRING';
  };

  const getDataTypeColor = (value: string) => {
    const dataType = detectDataType(value);
    switch (dataType) {
      case 'STRING':
        return 'bg-blue-100 text-blue-800';
      case 'NUMBER':
        return 'bg-green-100 text-green-800';
      case 'BOOLEAN':
        return 'bg-purple-100 text-purple-800';
      case 'JSON':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to System Settings</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>{systemSetting.key}</CardTitle>
            </div>
            <CardDescription>
              {systemSetting.description || 'No description provided'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Key</label>
                <p className="text-sm font-mono bg-muted p-2 rounded">{systemSetting.key}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Type</label>
                <div className="mt-1">
                  <Badge className={getDataTypeColor(systemSetting.value)}>
                    {detectDataType(systemSetting.value)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Value</label>
              <div className="mt-1">
                {detectDataType(systemSetting.value) === 'JSON' ? (
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                    {formatValue(systemSetting.value)}
                  </pre>
                ) : (
                  <p className="text-sm bg-muted p-2 rounded">
                    {formatValue(systemSetting.value)}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={systemSetting.isActive ? 'default' : 'secondary'}>
                    {systemSetting.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Category</label>
                <p className="mt-1">{systemSetting.category || 'Uncategorized'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <label className="font-medium">Created</label>
                <p className="mt-1">{new Date(systemSetting.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="font-medium">Last Updated</label>
                <p className="mt-1">{new Date(systemSetting.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <SystemSettingFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        setting={systemSetting}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Dialog */}
      <SystemSettingDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        setting={systemSetting}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};