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
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  Building2,
  Shield,
  FolderOpen,
  UserCheck,
  Activity
} from 'lucide-react';

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
  'employees': { label: 'Employees', icon: Users },
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
  'settings': { label: 'Settings', icon: Settings },
  'settings/profile': { label: 'Profile', icon: UserCheck },
  'settings/preferences': { label: 'Preferences', icon: Settings },
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
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      
      // Build the current path
      if (currentPath) {
        currentPath += `/${segment}`;
      } else {
        currentPath = segment;
      }
      
      // Check if this is a dynamic route (UUID pattern)
      const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      if (isUuidPattern) {
        // For detail pages, use the parent route's label + "Details"
        const parentPath = currentPath.replace(`/${segment}`, '');
        const parentConfig = routeConfig[parentPath];
        
        breadcrumbs.push({
          label: parentConfig ? `${parentConfig.label} Details` : 'Details',
          icon: parentConfig?.icon,
          isCurrentPage: i === pathSegments.length - 1
        });
      } else {
        // Regular route
        const config = routeConfig[currentPath];
        const isLastSegment = i === pathSegments.length - 1;
        
        breadcrumbs.push({
          label: config?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
          href: isLastSegment ? undefined : `/${businessUnitId}/${currentPath}`,
          icon: config?.icon,
          isCurrentPage: isLastSegment
        });
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