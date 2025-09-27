// components/assets/asset-detail-page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard as Edit, Trash2 } from 'lucide-react';
import { DepreciationCard } from './depreciation/depreciation-card';
import { BatchDepreciationDialog } from '../depreciation/batch-depreciation-dialog';
import type { SerializedAssetWithRelations } from '@/lib/utils/serialization';
import { DepreciationScheduleDialog } from './depreciation';

interface AssetDetailPageProps {
  asset: SerializedAssetWithRelations; // Change this to expect already serialized data
  businessUnitId: string;
}

export function AssetDetailPage({ asset }: AssetDetailPageProps) {
  const [showBatchDepreciation, setShowBatchDepreciation] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'DEPLOYED':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold">{asset.itemCode}</h1>
            <p className="text-muted-foreground">{asset.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <DepreciationScheduleDialog 
            assetId={asset.id}
            assetDescription={asset.description}
          >
            <Button variant="outline" size="sm">
              View Schedule
            </Button>
          </DepreciationScheduleDialog>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBatchDepreciation(true)}
          >
            Batch Calculate
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="mt-1">{asset.category.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                <p className="mt-1">{asset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Model Number</label>
                <p className="mt-1">{asset.modelNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Brand</label>
                <p className="mt-1">{asset.brand || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <p className="mt-1">{asset.quantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Purchase Price</label>
                <p className="mt-1">
                  {asset.purchasePrice 
                    ? `₱ ${asset.purchasePrice.toLocaleString()}` 
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                <p className="mt-1">
                  {asset.purchaseDate 
                    ? new Date(asset.purchaseDate).toLocaleDateString() 
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Warranty Expiry</label>
                <p className="mt-1">
                  {asset.warrantyExpiry 
                    ? new Date(asset.warrantyExpiry).toLocaleDateString() 
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <p className="mt-1">{asset.location || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <p className="mt-1">{asset.notes || 'No notes available'}</p>
            </div>
          </CardContent>
        </Card>

        <DepreciationCard 
          asset={asset} 
          onDepreciationCalculated={() => {
            // Refresh the page or update local state
            window.location.reload();
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Deployment History</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.deployments && asset.deployments.length > 0 ? (
              <div className="space-y-2">
                {asset.deployments.slice(0, 5).map((deployment) => (
                  <div key={deployment.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">Deployment #{deployment.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {deployment.status}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(deployment.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No deployment history available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <BatchDepreciationDialog
        open={showBatchDepreciation}
        onOpenChange={setShowBatchDepreciation}
        businessUnitId={asset.businessUnitId}
        onSuccess={() => {
          // Refresh the page or update local state
          window.location.reload();
        }}
      />
    </div>
  );
}