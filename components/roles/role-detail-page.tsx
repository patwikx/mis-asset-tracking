// components/roles/role-detail-page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Users } from 'lucide-react';
import type { RoleWithCounts } from '@/types/role-types';

interface RoleDetailPageProps {
  role: RoleWithCounts;
  businessUnitId: string;
}

export function RoleDetailPage({ role }: RoleDetailPageProps) {


  const renderPermissions = (permissions: Record<string, unknown> | null) => {
    if (!permissions || typeof permissions !== 'object') {
      return <p className="text-muted-foreground">No permissions defined</p>;
    }

    return (
      <div className="space-y-3">
        {Object.entries(permissions).map(([module, modulePermissions]) => {
          if (typeof modulePermissions !== 'object' || modulePermissions === null) {
            return null;
          }

          const perms = modulePermissions as Record<string, boolean>;
          const activePermissions = Object.entries(perms)
            .filter(([, value]) => value === true)
            .map(([key]) => key);

          if (activePermissions.length === 0) {
            return null;
          }

          return (
            <div key={module} className="border rounded-lg p-3">
              <h4 className="font-medium capitalize mb-2">{module}</h4>
              <div className="flex flex-wrap gap-1">
                {activePermissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">{role.name}</h1>
            <p className="text-muted-foreground">{role.description || 'No description available'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role Name</label>
                <p className="mt-1 font-medium">{role.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role Code</label>
                <p className="mt-1 font-mono text-sm">{role.code}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{role.description || 'No description available'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {role.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee Count</label>
                <div className="mt-1 flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{role._count.employees} employees</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                <p className="mt-1">{new Date(role.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1">{new Date(role.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPermissions(role.permissions as Record<string, unknown> | null)}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Employees with this Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <p>Employee list will be displayed here</p>
              <Button variant="outline" size="sm" className="mt-2">
                View All Employees
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}