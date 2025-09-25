// components/deployments/deployments-page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getDeployments } from '@/lib/actions/deployment-actions';
import type { AssetDeploymentWithRelations, DeploymentFilters } from '@/types/asset-types';

interface DeploymentsPageProps {
  businessUnitId: string;
}

export function DeploymentsPage({ businessUnitId }: DeploymentsPageProps) {
  const router = useRouter();
  const [deployments, setDeployments] = useState<AssetDeploymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DeploymentFilters>({});

  useEffect(() => {
    loadDeployments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnitId, filters]);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const result = await getDeployments(businessUnitId, filters);
      setDeployments(result.data);
    } catch (error) {
      console.error('Error loading deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ACCOUNTING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      case 'RETURNED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeploymentClick = (deploymentId: string) => {
    router.push(`/${businessUnitId}/deployments/${deploymentId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Deployments</h1>
          <p className="text-muted-foreground">Manage asset deployments and assignments</p>
        </div>
        <Button onClick={() => router.push(`/${businessUnitId}/assets/deployments/create`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deployment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Deployments</CardTitle>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deployments..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading deployments...</div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deployments found
            </div>
          ) : (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleDeploymentClick(deployment.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">
                          {deployment.asset.itemCode} - {deployment.asset.description}
                        </h3>
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Employee: {deployment.employee.firstName} {deployment.employee.lastName}</p>
                        <p>Category: {deployment.asset.category.name}</p>
                        {deployment.deployedDate && (
                          <p>Deployed: {new Date(deployment.deployedDate).toLocaleDateString()}</p>
                        )}
                        {deployment.expectedReturnDate && (
                          <p>Expected Return: {new Date(deployment.expectedReturnDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Created: {new Date(deployment.createdAt).toLocaleDateString()}</p>
                      {deployment.returnedDate && (
                        <p>Returned: {new Date(deployment.returnedDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}