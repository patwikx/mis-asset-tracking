// nav-projects.tsx
"use client"

import * as React from "react"
import {
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavProjectsItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavProjectsProps {
  projects: NavProjectsItem[]
}

export function NavProjects({ projects }: NavProjectsProps) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()

  // Check if project item is active
  const isProjectActive = React.useCallback((url: string): boolean => {
    return pathname === url || pathname.startsWith(url + '/')
  }, [pathname])

  if (projects.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = isProjectActive(item.url)
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton 
                asChild
                tooltip={item.name}
                className={cn(
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More actions for {item.name}</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem asChild>
                    <Link href={item.url}>
                      <span>Open {item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <span>Add to favorites</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
        <SidebarMenuItem>
          <SidebarMenuButton 
            className="text-sidebar-foreground/70"
            tooltip="More actions"
          >
            <MoreHorizontal className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}