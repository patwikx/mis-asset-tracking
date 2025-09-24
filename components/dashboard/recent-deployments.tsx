// components/dashboard/recent-deployments.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import type { RecentDeployment } from '@/types/dashboard-types';

interface RecentDeploymentsProps {
  deployments: RecentDeployment[];
}

const getStatusColor = (status: RecentDeployment['status']): string => {
  switch (status) {
    case 'DEPLOYED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'PENDING_ACCOUNTING_APPROVAL':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'RETURNED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getStatusText = (status: RecentDeployment['status']): string => {
  switch (status) {
    case 'DEPLOYED':
      return 'Deployed';
    case 'PENDING_ACCOUNTING_APPROVAL':
      return 'Pending Approval';
    case 'RETURNED':
      return 'Returned';
    default:
      return status;
  }
};

const getStatusDotColor = (status: RecentDeployment['status']): string => {
  switch (status) {
    case 'DEPLOYED':
      return 'bg-green-500';
    case 'PENDING_ACCOUNTING_APPROVAL':
      return 'bg-yellow-500';
    case 'RETURNED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

export const RecentDeployments: React.FC<RecentDeploymentsProps> = ({ deployments }) => {
  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Asset Deployments</CardTitle>
          <CardDescription>
            Latest asset assignments and deployments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No recent deployments found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Asset Deployments</CardTitle>
        <CardDescription>
          Latest asset assignments and deployments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${getStatusDotColor(deployment.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {deployment.assetDescription}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assigned to {deployment.employeeName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(deployment.status)}
                    >
                      {getStatusText(deployment.status)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(deployment.deployedDate, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};