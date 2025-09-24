// components/system-settings/system-settings-table.tsx
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye, Settings, Tag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SystemSettingWithRelations } from '@/types/system-settings-types';

interface SystemSettingsTableProps {
  settings: SystemSettingWithRelations[];
  onView: (setting: SystemSettingWithRelations) => void;
  onEdit: (setting: SystemSettingWithRelations) => void;
  onDelete: (setting: SystemSettingWithRelations) => void;
  isLoading?: boolean;
}

export const SystemSettingsTable: React.FC<SystemSettingsTableProps> = ({
  settings,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (settings.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Settings className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No system settings found</p>
            <p className="text-sm">Get started by adding your first setting</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>System Settings ({settings.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Setting</th>
                    <th className="text-left py-3 px-4 font-medium">Value</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{setting.key}</p>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground">{setting.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {setting.value.length > 50 ? `${setting.value.substring(0, 50)}...` : setting.value}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        {setting.category ? (
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 mr-1" />
                            <Badge variant="outline">{setting.category}</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={setting.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {setting.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(setting)}>
                              <Eye className="w-4 h-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(setting)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(setting)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};