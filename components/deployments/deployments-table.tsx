// components/deployments/deployments-table.tsx
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  User,
  Package
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import type { AssetDeploymentWithRelations } from '@/types/asset-types';
import { DeploymentStatus } from '@prisma/client';

interface DeploymentsTableProps {
  deployments: AssetDeploymentWithRelations[];
  onView: (deployment: AssetDeploymentWithRelations) => void;
  onEdit: (deployment: AssetDeploymentWithRelations) => void;
  onApprove: (deployment: AssetDeploymentWithRelations) => void;
  onReject: (deployment: AssetDeploymentWithRelations) => void;
  onReturn: (deployment: AssetDeploymentWithRelations) => void;
  isLoading?: boolean;
}

const getStatusColor = (status: DeploymentStatus): string => {
  switch (status) {
    case DeploymentStatus.DEPLOYED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case DeploymentStatus.PENDING_ACCOUNTING_APPROVAL:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case DeploymentStatus.APPROVED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';

    case DeploymentStatus.RETURNED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case DeploymentStatus.CANCELLED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getStatusText = (status: DeploymentStatus): string => {
  switch (status) {
    case DeploymentStatus.DEPLOYED:
      return 'Deployed';
    case DeploymentStatus.PENDING_ACCOUNTING_APPROVAL:
      return 'Pending Approval';
    case DeploymentStatus.APPROVED:
      return 'Approved';

    case DeploymentStatus.RETURNED:
      return 'Returned';
    case DeploymentStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
};

export const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  onView,
  onEdit,
  onApprove,
  onReject,
  onReturn,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No deployments found</p>
            <p className="text-sm">Get started by creating your first deployment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployments ({deployments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Asset</th>
                    <th className="text-left py-3 px-4 font-medium">Employee</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Deployed Date</th>
                    <th className="text-left py-3 px-4 font-medium">Expected Return</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((deployment) => (
                    <tr key={deployment.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{deployment.asset.description}</p>
                          <p className="text-sm text-muted-foreground">{deployment.asset.itemCode}</p>
                          <Badge variant="outline" className="text-xs">
                            {deployment.asset.category.name}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {deployment.employee.firstName} {deployment.employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {deployment.employee.employeeId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {deployment.employee.position}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(deployment.status)}>
                          {getStatusText(deployment.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {deployment.deployedDate ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(deployment.deployedDate, 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {deployment.expectedReturnDate ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(deployment.expectedReturnDate, 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(deployment)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {deployment.status === DeploymentStatus.PENDING_ACCOUNTING_APPROVAL && (
                              <>
                                <DropdownMenuItem onClick={() => onApprove(deployment)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onReject(deployment)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {deployment.status === DeploymentStatus.DEPLOYED && (
                              <DropdownMenuItem onClick={() => onReturn(deployment)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Return Asset
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem onClick={() => onEdit(deployment)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
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
          <div className="lg:hidden space-y-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{deployment.asset.description}</h3>
                      <p className="text-sm text-muted-foreground">{deployment.asset.itemCode}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-3 h-3" />
                        <span className="text-xs text-muted-foreground">
                          {deployment.employee.firstName} {deployment.employee.lastName}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(deployment)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        
                        {deployment.status === DeploymentStatus.PENDING_ACCOUNTING_APPROVAL && (
                          <>
                            <DropdownMenuItem onClick={() => onApprove(deployment)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReject(deployment)}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {deployment.status === DeploymentStatus.DEPLOYED && (
                          <DropdownMenuItem onClick={() => onReturn(deployment)}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Return Asset
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => onEdit(deployment)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(deployment.status)}>
                        {getStatusText(deployment.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <Badge variant="outline">{deployment.asset.category.name}</Badge>
                    </div>
                    {deployment.deployedDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Deployed:</span>
                        <span className="text-sm">
                          {format(deployment.deployedDate, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    {deployment.expectedReturnDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Expected Return:</span>
                        <span className="text-sm">
                          {format(deployment.expectedReturnDate, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
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