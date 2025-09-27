// components/dashboard/quick-actions.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Users, 
  FileText, 
  BarChart3, 
  PlusCircle,
  ArrowRight,
  Calculator
} from "lucide-react";
import Link from 'next/link';

interface QuickActionsProps {
  businessUnitId: string;
  userRole: string;
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  variant: 'default' | 'outline';
}

const getQuickActions = (businessUnitId: string, userRole: string): QuickAction[] => {
  const baseActions: QuickAction[] = [
    {
      title: "Deploy Asset",
      description: "Assign an asset to an employee",
      href: `/${businessUnitId}/assets/deployments`,
      icon: Package,
      variant: 'default'
    },
    {
      title: "Depreciation",
      description: "Manage asset depreciation",
      href: `/${businessUnitId}/depreciation`,
      icon: Calculator,
      variant: 'outline'
    },
    {
      title: "Generate Report",
      description: "Create asset or deployment reports",
      href: `/${businessUnitId}/reports`,
      icon: FileText,
      variant: 'outline'
    },
    {
      title: "View Analytics",
      description: "Check dashboard analytics",
      href: `/${businessUnitId}/analytics`,
      icon: BarChart3,
      variant: 'outline'
    }
  ];

  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'];
  if (adminRoles.includes(userRole)) {
    baseActions.push({
      title: "View Employees",
      description: "Browse employee directory",
      href: `/${businessUnitId}/employees`,
      icon: Users,
      variant: 'outline'
    });
  }

  return baseActions;
};

export const QuickActions: React.FC<QuickActionsProps> = ({ 
  businessUnitId, 
  userRole 
}) => {
  const quickActions = getQuickActions(businessUnitId, userRole);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and frequently used features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-5">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            
            return (
              <Button
                key={action.href}
                variant={action.variant}
                size="sm"
                className="justify-start h-auto p-3"
                asChild
              >
                <Link href={action.href}>
                  <div className="flex items-center space-x-3 w-full">
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};