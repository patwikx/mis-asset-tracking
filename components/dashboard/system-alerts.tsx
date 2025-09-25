// components/dashboard/system-alerts.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  Calendar,
  ExternalLink 
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { SystemAlert } from '@/types/dashboard-types';


interface SystemAlertsProps {
  alerts: SystemAlert[];
}

const getAlertIcon = (type: SystemAlert['type']) => {
  switch (type) {
    case 'MAINTENANCE_DUE':
      return AlertTriangle;
    case 'APPROVAL_PENDING':
      return Clock;
    case 'LOW_STOCK':
      return Package;
    case 'WARRANTY_EXPIRY':
      return Calendar;
    default:
      return AlertTriangle;
  }
};

const getSeverityColor = (severity: SystemAlert['severity']): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getSeverityDotColor = (severity: SystemAlert['severity']): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-500';
    case 'HIGH':
      return 'bg-orange-500';
    case 'MEDIUM':
      return 'bg-yellow-500';
    case 'LOW':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};



const getActionLink = (alert: SystemAlert): string | null => {
  switch (alert.type) {
    case 'MAINTENANCE_DUE':
      return alert.relatedId ? `/assets/${alert.relatedId}` : '/assets';
    case 'APPROVAL_PENDING':
      return alert.relatedId ? `/deployments/${alert.relatedId}` : '/deployments';
    case 'LOW_STOCK':
      return '/inventory';
    case 'WARRANTY_EXPIRY':
      return alert.relatedId ? `/assets/${alert.relatedId}` : '/assets';
    default:
      return null;
  }
};

export const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>
            Important notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No alerts at this time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
        <CardDescription>
          Important notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.slice(0, 6).map((alert) => {
            const IconComponent = getAlertIcon(alert.type);
            const actionLink = getActionLink(alert);
            
            return (
              <div key={alert.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityDotColor(alert.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <IconComponent className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <Badge 
                        variant="secondary" 
                        className={getSeverityColor(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                      {actionLink && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={actionLink} className="p-1">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          
          {alerts.length > 6 && (
            <div className="pt-2 border-t">
              <Button variant="link" className="p-0 h-auto text-sm">
                View all {alerts.length} alerts
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};