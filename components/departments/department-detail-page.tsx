// components/departments/department-detail-page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Users, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DepartmentWithRelations } from '@/types/department-types';

interface DepartmentDetailPageProps {
  department: DepartmentWithRelations;
  businessUnitId: string;
}

export function DepartmentDetailPage({ department, businessUnitId }: DepartmentDetailPageProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push(`/${businessUnitId}/departments`);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit department:', department.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Departments
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{department.name}</h1>
            <p className="text-muted-foreground">{department.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Department Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Department Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Department Code</label>
              <p className="mt-1 font-medium">{department.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Business Unit</label>
              <p className="mt-1">{department.businessUnit.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge className="mt-1 bg-green-100 text-green-800">
                {department.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created Date</label>
              <p className="mt-1">{new Date(department.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{department._count.employees}</div>
            <p className="text-xs text-muted-foreground">Active employees in department</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Department Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Assets assigned to department</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Current asset deployments</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Description */}
      {department.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{department.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recent activity to display</p>
            <p className="text-sm text-muted-foreground mt-2">
              Employee assignments and asset deployments will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}