// app-sidebar.tsx
"use client"

import * as React from "react"
import {
  Users,
  Package,
  Settings,
  BarChart3,
  FileText,
  Shield,
} from "lucide-react"
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
import { NavProjects } from "./nav-projects"
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
          title: "Categories",
          url: `/${businessUnitId}/assets/categories`,
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
          title: "Asset Reports",
          url: `/${businessUnitId}/reports/assets`,
        },
        {
          title: "Deployment Reports",
          url: `/${businessUnitId}/reports/deployments`,
        },
        {
          title: "Audit Logs",
          url: `/${businessUnitId}/reports/audit`,
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
        url: `/${businessUnitId}/settings/profile`,
      },
      {
        title: "Preferences",
        url: `/${businessUnitId}/settings/preferences`,
      },
    ],
  })

  return baseItems
}

// Define quick action projects based on user role
const getQuickActions = (businessUnitId: string, userRole: string) => {
  const baseActions = [
    {
      name: "Asset Deployment",
      url: `/${businessUnitId}/assets/deploy`,
      icon: Package,
    },
    {
      name: "Employee Directory",
      url: `/${businessUnitId}/employees`,
      icon: Users,
    },
  ]

  // Add admin-specific quick actions
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN']
  if (adminRoles.includes(userRole)) {
    baseActions.push({
      name: "System Management",
      url: `/${businessUnitId}/admin`,
      icon: Settings,
    })
  }

  return baseActions
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

  const quickActions = React.useMemo(() => 
    getQuickActions(currentBusinessUnitId, session.user.role.code),
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
        <NavProjects projects={quickActions} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}