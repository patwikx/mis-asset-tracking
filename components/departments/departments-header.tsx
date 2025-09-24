// components/departments/departments-header.tsx
'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";

interface DepartmentsHeaderProps {
  title: string;
  description: string;
  onCreateNew: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export const DepartmentsHeader: React.FC<DepartmentsHeaderProps> = ({
  title,
  description,
  onCreateNew,
  onRefresh,
  onExport
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>
    </div>
  );
};