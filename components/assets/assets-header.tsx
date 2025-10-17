// components/assets/assets-header.tsx
'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download, ListFilter as Filter, Upload, Settings } from "lucide-react";

interface AssetsHeaderProps {
  title: string;
  description: string;
  onCreateNew: () => void;
  onBulkCreate?: () => void;
  onBulkOperations?: () => void;
  onRefresh: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  showCreateButton?: boolean;
  showBulkCreateButton?: boolean;
  showBulkOperationsButton?: boolean;
  showFilterButton?: boolean;
}

export const AssetsHeader: React.FC<AssetsHeaderProps> = ({
  title,
  description,
  onCreateNew,
  onBulkCreate,
  onBulkOperations,
  onRefresh,
  onExport,
  onFilter,
  showCreateButton = true,
  showBulkCreateButton = true,
  showBulkOperationsButton = true,
  showFilterButton = true
}) => {
  return (
    <div className="space-y-4">
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          {showFilterButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onFilter}
              className="hidden sm:flex"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          )}
          
          {onExport && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExport}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {showBulkOperationsButton && onBulkOperations && (
            <Button variant="outline" onClick={onBulkOperations}>
              <Settings className="w-4 h-4 mr-2" />
              Bulk Operations
            </Button>
          )}

          {showBulkCreateButton && onBulkCreate && (
            <Button variant="outline" onClick={onBulkCreate}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Create
            </Button>
          )}
          
          {showCreateButton && (
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};