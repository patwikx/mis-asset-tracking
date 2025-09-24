// components/employees/employees-table.tsx
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  Calendar,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import type { EmployeeWithRelations } from '@/types/employee-types';

interface EmployeesTableProps {
  employees: EmployeeWithRelations[];
  onView: (employee: EmployeeWithRelations) => void;
  onEdit: (employee: EmployeeWithRelations) => void;
  onDelete: (employee: EmployeeWithRelations) => void;
  isLoading?: boolean;
}

export const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No employees found</p>
            <p className="text-sm">Get started by adding your first employee</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees ({employees.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Department</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Position</th>
                    <th className="text-left py-3 px-4 font-medium">Hire Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                          <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                          {employee.email && (
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {employee.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{employee.department.name}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{employee.role.name}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{employee.position || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {employee.hireDate ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(employee.hireDate, 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {employee.isActive ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => onView(employee)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(employee)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(employee)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {employees.map((employee) => (
              <Card key={employee.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{employee.firstName} {employee.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                      {employee.email && (
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {employee.email}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(employee)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(employee)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(employee)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Department:</span>
                      <Badge variant="secondary">{employee.department.name}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <Badge variant="outline">{employee.role.name}</Badge>
                    </div>
                    {employee.position && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Position:</span>
                        <span className="text-sm">{employee.position}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};