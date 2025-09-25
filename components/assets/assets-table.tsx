// components/assets/assets-table.tsx
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
  Package,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import type { AssetWithRelations } from '@/types/asset-types';
import { AssetStatus } from '@prisma/client';

interface AssetsTableProps {
  assets: AssetWithRelations[];
  onView: (asset: AssetWithRelations) => void;
  onEdit: (asset: AssetWithRelations) => void;
  onDelete: (asset: AssetWithRelations) => void;
  isLoading?: boolean;
}

const getStatusColor = (status: AssetStatus): string => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case AssetStatus.DEPLOYED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case AssetStatus.IN_MAINTENANCE:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case AssetStatus.RETIRED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case AssetStatus.LOST:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case AssetStatus.DAMAGED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getStatusText = (status: AssetStatus): string => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'Available';
    case AssetStatus.DEPLOYED:
      return 'Deployed';
    case AssetStatus.IN_MAINTENANCE:
      return 'Maintenance';
    case AssetStatus.RETIRED:
      return 'Retired';
    case AssetStatus.LOST:
      return 'Lost';
    case AssetStatus.DAMAGED:
      return 'Damaged';
    default:
      return status;
  }
};

export const AssetsTable: React.FC<AssetsTableProps> = ({
  assets,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No assets found</p>
            <p className="text-sm">Get started by adding your first asset</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets ({assets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Asset</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Purchase Price</th>
                    <th className="text-left py-3 px-4 font-medium">Purchase Date</th>
                    <th className="text-left py-3 px-4 font-medium">Location</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{asset.description}</p>
                          <p className="text-sm text-muted-foreground">{asset.itemCode}</p>
                          {asset.serialNumber && (
                            <p className="text-xs text-muted-foreground">SN: {asset.serialNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{asset.category.name}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(asset.status)}>
                          {getStatusText(asset.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {asset.purchasePrice ? (
                          <div className="flex items-center">
                           
                             ₱ {asset.purchasePrice.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {asset.purchaseDate ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(asset.purchaseDate, 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{asset.location || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(asset)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(asset)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(asset)}
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
            {assets.map((asset) => (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{asset.description}</h3>
                      <p className="text-sm text-muted-foreground">{asset.itemCode}</p>
                      {asset.serialNumber && (
                        <p className="text-xs text-muted-foreground">SN: {asset.serialNumber}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(asset)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(asset)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(asset)}
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
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <Badge variant="secondary">{asset.category.name}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(asset.status)}>
                        {getStatusText(asset.status)}
                      </Badge>
                    </div>
                    {asset.purchasePrice && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price:</span>
                        <span className="text-sm font-medium">
                          ₱{asset.purchasePrice.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {asset.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Location:</span>
                        <span className="text-sm">{asset.location}</span>
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