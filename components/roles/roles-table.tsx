// components/roles/roles-table.tsx
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye, Shield, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { RoleWithCounts } from '@/types/role-types';

interface RolesTableProps {
  roles: RoleWithCounts[];
  onView: (role: RoleWithCounts) => void;
  onEdit: (role: RoleWithCounts) => void;
  onDelete: (role: RoleWithCounts) => void;
  isLoading?: boolean;
}

export const RolesTable: React.FC<RolesTableProps> = ({
  roles,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (roles.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No roles found</p>
            <p className="text-sm">Get started by adding your first role</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Roles ({roles.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Employees</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-sm text-muted-foreground">{role.code}</p>
                          {role.description && (
                            <p className="text-xs text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {role._count.employees}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {role.isActive ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => onView(role)}>
                              <Eye className="w-4 h-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(role)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(role)} className="text-destructive">
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