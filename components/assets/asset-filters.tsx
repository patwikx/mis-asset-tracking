// components/assets/asset-filters.tsx
'use client'

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, Check, ChevronsUpDown, FolderOpen, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetStatus } from '@prisma/client';
import type { AssetFilters } from '@/types/asset-types';
import { getAssetCategories } from '@/lib/actions/asset-actions';

interface AssetFiltersProps {
  filters: AssetFilters;
  onFiltersChange: (filters: AssetFilters) => void;
  onClearFilters: () => void;
}

export const AssetFiltersComponent: React.FC<AssetFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [open, setOpen] = useState(false);
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [localFilters, setLocalFilters] = useState<AssetFilters>(filters);

  const filteredCategories = categories.filter(category =>
    `${category.name} ${category.code}`
      .toLowerCase()
      .includes(categorySearch.toLowerCase())
  );

  const statuses = Object.values(AssetStatus);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const loadFilterData = async () => {
    try {
      const categoriesData = await getAssetCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  const updateFilter = (key: keyof AssetFilters, value: string | number | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: AssetFilters = {};
    setLocalFilters(emptyFilters);
    onClearFilters();
    setOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filter
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="px-6">
        <SheetHeader className="px-0">
          <SheetTitle>Filter Assets</SheetTitle>
          <SheetDescription>
            Use the filters below to narrow down your asset search.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full px-0">
          <div className="flex-1 space-y-8 py-6">
            {/* Search */}
            <div className="space-y-3">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <Input
                id="search"
                placeholder="Search by item code, description, serial number..."
                value={localFilters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="h-10"
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Category</Label>
              <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryComboOpen}
                    className="w-full justify-between h-10"
                  >
                    {localFilters.categoryId
                      ? categories.find((category) => category.id === localFilters.categoryId)?.name || "Select category..."
                      : "All categories"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-2">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="h-8"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      <div
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                          !localFilters.categoryId && "bg-accent"
                        )}
                        onClick={() => {
                          updateFilter('categoryId', undefined);
                          setCategoryComboOpen(false);
                          setCategorySearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !localFilters.categoryId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                        All categories
                      </div>
                      {filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className={cn(
                            "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                            localFilters.categoryId === category.id && "bg-accent"
                          )}
                          onClick={() => {
                            updateFilter('categoryId', category.id);
                            setCategoryComboOpen(false);
                            setCategorySearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              localFilters.categoryId === category.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
                          {category.name}
                        </div>
                      ))}
                      {filteredCategories.length === 0 && categorySearch && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No categories found.
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Status</Label>
              <Select 
                value={localFilters.status || 'all'} 
                onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value as AssetStatus)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>



            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Price Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-10"
                />
                <Input
                  type="number"
                  placeholder="Max price"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="border-t pt-6 pb-6">
            <div className="flex space-x-3">
              <Button onClick={applyFilters} className="flex-1 h-10">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} className="h-10 px-3">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};