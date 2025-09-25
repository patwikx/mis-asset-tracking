// components/system-settings/system-setting-filters.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SystemSettingFilters } from '@/types/system-settings-types';
import { getSystemSettingCategories } from '@/lib/actions/system-settings-actions';

interface SystemSettingFiltersComponentProps {
  filters: SystemSettingFilters;
  onFiltersChange: (filters: SystemSettingFilters) => void;
  onClearFilters: () => void;
}

export const SystemSettingFiltersComponent: React.FC<SystemSettingFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const categoriesData = await getSystemSettingCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search settings..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 w-64"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {Object.values(filters).filter(v => v !== undefined && v !== '' && v !== null).length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  <X className="w-4 h-4 mr-1" />Clear
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={filters.category || ''}
                  onValueChange={(value) => 
                    onFiltersChange({ ...filters, category: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.isActive?.toString() || ''}
                  onValueChange={(value) => 
                    onFiltersChange({ 
                      ...filters, 
                      isActive: value === '' ? undefined : value === 'true' 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All statuses</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};