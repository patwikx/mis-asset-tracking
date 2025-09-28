'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Package, Users, FileText, ChartBar as BarChart3, Settings, Building2, Shield, FolderOpen, UserCheck, Activity, Home, Calculator, Wrench, Calendar, Plus, Eye, UserPlus } from 'lucide-react';

interface DynamicBreadcrumbsProps {
  businessUnitId: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrentPage?: boolean;
}

const routeConfig: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  '': { label: 'Dashboard', icon: Home },
  'assets': { label: 'Assets', icon: Package },
  'assets/categories': { label: 'Categories', icon: FolderOpen },
  'assets/deployments': { label: 'Deployments', icon: Package },
  'assets/deployments/create': { label: 'Create Deployment', icon: Package },
  'assets/create': { label: 'Create Asset', icon: Plus },
  'employees': { label: 'Employees', icon: Users },
  'employees/create': { label: 'Create Employee', icon: UserPlus },
  'departments': { label: 'Departments', icon: Building2 },
  'roles': { label: 'Roles', icon: Shield },
  'reports': { label: 'Reports', icon: FileText },
  'reports/assets': { label: 'Asset Reports', icon: FileText },
  'reports/deployments': { label: 'Deployment Reports', icon: FileText },
  'analytics': { label: 'Analytics', icon: BarChart3 },
  'audit-logs': { label: 'Audit Logs', icon: Activity },
  'system-settings': { label: 'System Settings', icon: Settings },
  'admin': { label: 'Administration', icon: Settings },
  'admin/business-units': { label: 'Business Units', icon: Building2 },
  'depreciation': { label: 'Depreciation', icon: Calculator },
  'maintenance': { label: 'Maintenance', icon: Wrench },
  'profile': { label: 'Profile', icon: UserCheck },
  'settings': { label: 'Settings', icon: Settings },
  'settings/profile': { label: 'Profile', icon: UserCheck },
  'settings/preferences': { label: 'Preferences', icon: Settings },
  'depreciation-schedule': { label: 'Depreciation Schedule', icon: Calendar },
};

export function DynamicBreadcrumbs({ businessUnitId }: DynamicBreadcrumbsProps) {
  const pathname = usePathname();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: `/${businessUnitId}`,
      icon: Home
    });

    // Skip the business unit ID segment (index 0)
    let currentPath = '';
    let actualPath = ''; // Track the actual path with UUIDs for href generation
    
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      
      // Build the actual path (including UUIDs)
      actualPath = actualPath ? `${actualPath}/${segment}` : segment;
      
      // Check if this is a dynamic route (UUID pattern)
      const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      if (isUuidPattern) {
        // For UUID segments, use the parent route's label + "Details"
        const parentPath = currentPath;
        const parentConfig = routeConfig[parentPath];
        
        breadcrumbs.push({
          label: parentConfig ? `${parentConfig.label} Details` : 'Details',
          href: i === pathSegments.length - 1 ? undefined : `/${businessUnitId}/${actualPath}`,
          icon: parentConfig?.icon || Eye,
          isCurrentPage: i === pathSegments.length - 1
        });
      } else {
        // For non-UUID segments, build the currentPath for config lookup
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        // Special handling for depreciation-schedule under assets/[id]
        if (segment === 'depreciation-schedule' && currentPath.includes('assets')) {
          const config = routeConfig['depreciation-schedule'];
          const isLastSegment = i === pathSegments.length - 1;
          
          breadcrumbs.push({
            label: config?.label || 'Depreciation Schedule',
            href: isLastSegment ? undefined : `/${businessUnitId}/${actualPath}`,
            icon: config?.icon || Calendar,
            isCurrentPage: isLastSegment
          });
        } else {
          // Regular route
          const config = routeConfig[currentPath];
          const isLastSegment = i === pathSegments.length - 1;
          
          breadcrumbs.push({
            label: config?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
            href: isLastSegment ? undefined : `/${businessUnitId}/${actualPath}`,
            icon: config?.icon,
            isCurrentPage: isLastSegment
          });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
              {crumb.isCurrentPage ? (
                <BreadcrumbPage className="flex items-center gap-2">
                  {crumb.icon && <crumb.icon className="h-4 w-4" />}
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href!} className="flex items-center gap-2">
                    {crumb.icon && <crumb.icon className="h-4 w-4" />}
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}