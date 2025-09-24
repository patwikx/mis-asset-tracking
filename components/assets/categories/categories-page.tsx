// components/assets/categories/categories-page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { AssetsHeader } from '../assets-header';
import { CategoriesTable } from './categories-table';
import { CategoryFormDialog } from './category-form-dialog';
import { AssetDeleteDialog } from '../asset-delete-dialog';
import { AssetPagination } from '../asset-pagination';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { 
  AssetCategoryWithCounts,
  PaginationParams,
  PaginatedResponse 
} from '@/types/asset-types';
import { getAssetCategories, deleteAssetCategory } from '@/lib/actions/asset-category-actions';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<AssetCategoryWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryWithCounts | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationParams>({ page: 1, limit: 10 });
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedResponse<AssetCategoryWithCounts> = await getAssetCategories(
        searchTerm || undefined, 
        pagination
      );
      setCategories(result.data);
      setPaginationInfo(result.pagination);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, pagination]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setShowCreateDialog(true);
  };

  const handleView = (category: AssetCategoryWithCounts) => {
    // TODO: Implement category detail view
    console.log('View category:', category);
    toast.info('Category detail view coming soon');
  };

  const handleEdit = (category: AssetCategoryWithCounts) => {
    setSelectedCategory(category);
    setShowEditDialog(true);
  };

  const handleDelete = (category: AssetCategoryWithCounts) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  const handleRefresh = () => {
    loadCategories();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination({ page: 1, limit });
  };

  const handleFormSuccess = () => {
    loadCategories();
  };

  const handleDeleteSuccess = async () => {
    if (!selectedCategory) return;

    try {
      const result = await deleteAssetCategory(selectedCategory.id);
      
      if (result.success) {
        toast.success(result.message);
        loadCategories();
        setShowDeleteDialog(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-6">
      <AssetsHeader
        title="Asset Categories"
        description="Manage asset categories and classifications"
        onCreateNew={handleCreateNew}
        onRefresh={handleRefresh}
        onExport={handleExport}
        showFilterButton={false}
      />

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <CategoriesTable
        categories={categories}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {!isLoading && categories.length > 0 && (
        <AssetPagination
          pagination={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <CategoryFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        category={null}
        onSuccess={handleFormSuccess}
      />

      <CategoryFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        category={selectedCategory}
        onSuccess={handleFormSuccess}
      />

      {/* Reuse the AssetDeleteDialog but customize the content */}
      {selectedCategory && (
        <AssetDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          asset={{
            ...selectedCategory,
            description: `Category: ${selectedCategory.name}`,
            itemCode: selectedCategory.code,
            deployments: []
          } as any}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};