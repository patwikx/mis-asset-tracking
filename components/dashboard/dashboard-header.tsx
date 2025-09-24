// components/dashboard/dashboard-header.tsx
'use client'

import React from 'react';

import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { format } from 'date-fns';

interface DashboardHeaderProps {
  userName: string;
  businessUnitName: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  businessUnitName
}) => {
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'EEEE, MMMM d, yyyy');
  
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    // TODO: Implement dashboard export functionality
    console.log('Export dashboard data');
  };

  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          {businessUnitName} • {formattedDate}
        </p>
      </div>

      {/* Action Bar */}
<div>
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center space-x-2">
      {/* Remove this div and its closing tag */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleExport}
        className="hidden sm:flex"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  </div>
</div>
    </div>
  );
};