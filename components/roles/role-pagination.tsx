// components/roles/role-pagination.tsx
'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RolePaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const RolePagination: React.FC<RolePaginationProps> = ({
  pagination,
  onPageChange,
  onLimitChange
}) => {
  const { page, limit, total, totalPages } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {total} roles
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => onLimitChange(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};