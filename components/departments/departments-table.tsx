// components/departments/departments-table.tsx
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Eye, Building2, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DepartmentWithRelations } from '@/types/department-types';

interface DepartmentsTableProps {
  departments: DepartmentWithRelations[];
  onView: (department: DepartmentWithRelations) => void;
  onEdit: (department: DepartmentWithRelations) => void;
  onDelete: (department: DepartmentWithRelations) => void;
  isLoading?: boolean;
}

export const DepartmentsTable: React.FC<DepartmentsTableProps> = ({
  departments,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No departments found</p>
            <p className="text-sm">Get started by adding your first department</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Departments ({departments.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Department</th>
                    <th className="text-left py-3 px-4 font-medium">Business Unit</th>
                    <th className="text-left py-3 px-4 font-medium">Employees</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{department.name}</p>
                          <p className="text-sm text-muted-foreground">{department.code}</p>
                          {department.description && (
                            <p className="text-xs text-muted-foreground">{department.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{department.businessUnit.name}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {department._count.employees}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {department.isActive ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => onView(department)}>
                              <Eye className="w-4 h-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(department)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(department)} className="text-destructive">
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