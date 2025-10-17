// app-sidebar.tsx
"use client"

import * as React from "react"
import { Users, Package, Settings, ChartBar as BarChart3, FileText, Shield } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { BusinessUnitItem } from "@/types/business-unit-types"
import type { Session } from "next-auth"
import BusinessUnitSwitcher from "../business-unit-swticher"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  session: Session
  businessUnits: BusinessUnitItem[]
  currentBusinessUnitId: string
}

// Define navigation items based on your asset management system
const getNavigationItems = (businessUnitId: string, userRole: string) => {
  const baseItems = [
    {
      title: "Dashboard",
      url: `/${businessUnitId}`,
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: `/${businessUnitId}`,
        },
        {
          title: "Analytics",
          url: `/${businessUnitId}/analytics`,
        },
      ],
    },
    {
      title: "Assets",
      url: `/${businessUnitId}/assets`,
      icon: Package,
      items: [
        {
          title: "All Assets",
          url: `/${businessUnitId}/assets`,
        },
        {
          title: "Deployments",
          url: `/${businessUnitId}/assets/deployments`,
        },
        {
          title: "Transfers",
          url: `/${businessUnitId}/assets/transfers`,
        },
        {
          title: "Utilization",
          url: `/${businessUnitId}/assets/utilization`,
        },
        {
          title: "Retirements",
          url: `/${businessUnitId}/assets/retirements`,
        },
                {
          title: "Disposals",
          url: `/${businessUnitId}/assets/disposals`,
        },
        {
          title: "Barcodes",
          url: `/${businessUnitId}/assets/barcodes`,
        },
        {
          title: "Categories",
          url: `/${businessUnitId}/assets/categories`,
        },
        {
          title: "Depreciation",
          url: `/${businessUnitId}/depreciation`,
        },
        {
          title: "Maintenance",
          url: `/${businessUnitId}/maintenance`,
        },
      ],
    },
    {
      title: "Employees",
      url: `/${businessUnitId}/employees`,
      icon: Users,
      items: [
        {
          title: "All Employees",
          url: `/${businessUnitId}/employees`,
        },
        {
          title: "Departments",
          url: `/${businessUnitId}/departments`,
        },
        {
          title: "Roles",
          url: `/${businessUnitId}/roles`,
        },
      ],
    },
    {
      title: "Reports",
      url: `/${businessUnitId}/reports`,
      icon: FileText,
      items: [
        {
          title: "Reports Dashboard",
          url: `/${businessUnitId}/reports`,
        },
        {
          title: "Asset Reports",
          url: `/${businessUnitId}/reports/assets`,
        },
        {
          title: "Deployment Reports",
          url: `/${businessUnitId}/reports/deployments`,
        },
        {
          title: "Depreciation Reports",
          url: `/${businessUnitId}/reports/depreciation`,
        },
        {
          title: "Audit Logs",
          url: `/${businessUnitId}/audit-logs`,
        },
      ],
    },
  ]

  // Add admin-only items
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN']
  if (adminRoles.includes(userRole)) {
    baseItems.push({
      title: "Administration",
      url: `/${businessUnitId}/admin`,
      icon: Shield,
      items: [
        {
          title: "Business Units",
          url: `/${businessUnitId}/admin/business-units`,
        },
        {
          title: "System Settings",
          url: `/${businessUnitId}/system-settings`,
        },
      ],
    })
  }

  baseItems.push({
    title: "Settings",
    url: `/${businessUnitId}/settings`,
    icon: Settings,
    items: [
      {
        title: "Profile",
        url: `/${businessUnitId}/profile`,
      },
      {
        title: "Preferences",
        url: `/${businessUnitId}/settings/preferences`,
      },
    ],
  })

  return baseItems
}



export function AppSidebar({ 
  session, 
  businessUnits, 
  currentBusinessUnitId,
  ...props 
}: AppSidebarProps) {
  const navItems = React.useMemo(() => 
    getNavigationItems(currentBusinessUnitId, session.user.role.code),
    [currentBusinessUnitId, session.user.role.code]
  )



  const userData = React.useMemo(() => ({
    name: session.user.name,
    email: session.user.email ?? '',
    avatar: session.user.image ?? '',
    employeeId: session.user.employeeId,
    position: session.user.position ?? '',
    businessUnit: session.user.businessUnit.name,
    role: session.user.role.name,
  }), [session.user])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BusinessUnitSwitcher 
          items={businessUnits}
          className="px-2"
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}