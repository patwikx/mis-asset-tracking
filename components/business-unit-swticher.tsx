"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Store, 
  Plus, 
  Check, 
  Monitor, 
  Smartphone, 
  Code, 
  Settings, 
  ChevronsUpDown 
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useBusinessUnitModal } from "@/hooks/use-bu-modal"
import type { BusinessUnitItem } from "@/types/business-unit-types"

interface BusinessUnitSwitcherProps {
  items: BusinessUnitItem[]
  className?: string
}

// Define icon types for better type safety
type IconComponent = React.ComponentType<{ className?: string }>

// Icon mapping based on business unit name
const getBusinessUnitIcon = (name: string): IconComponent => {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('mobile') || lowerName.includes('app')) {
    return Smartphone
  }
  if (lowerName.includes('admin') || lowerName.includes('settings')) {
    return Settings
  }
  if (lowerName.includes('store') || lowerName.includes('shop') || lowerName.includes('retail')) {
    return Store
  }
  if (lowerName.includes('dev') || lowerName.includes('code') || lowerName.includes('development')) {
    return Code
  }
  if (lowerName.includes('hotel') || lowerName.includes('resort') || lowerName.includes('hospitality')) {
    return Store // Using Store as a generic business icon
  }
  
  return Monitor // Default fallback
}

const getBusinessUnitTypeLabel = (name: string): string => {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('mobile') || lowerName.includes('app')) {
    return 'Mobile application'
  }
  if (lowerName.includes('admin')) {
    return 'Administrative unit'
  }
  if (lowerName.includes('dev') || lowerName.includes('development')) {
    return 'Development unit'
  }
  if (lowerName.includes('hotel') || lowerName.includes('resort')) {
    return 'Hotel property'
  }
  if (lowerName.includes('store') || lowerName.includes('shop') || lowerName.includes('retail')) {
    return 'Retail location'
  }
  
  return 'Business unit' // Default fallback
}

export default function BusinessUnitSwitcher({ 
  className, 
  items = [] 
}: BusinessUnitSwitcherProps) {
  const businessUnitModal = useBusinessUnitModal()
  const params = useParams()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState<boolean>(false)

  // Type-safe params access
  const businessUnitId = typeof params.businessUnitId === 'string' ? params.businessUnitId : undefined

  const isSwitcherActive = items.length > 1
  const currentBusinessUnit = items.find((item) => item.id === businessUnitId)

  const onBusinessUnitSelect = React.useCallback((selectedBusinessUnitId: string) => {
    setOpen(false)
    router.push(`/${selectedBusinessUnitId}`)
    router.refresh()
  }, [router])

  const handleAddBusinessUnit = React.useCallback(() => {
    setOpen(false)
    businessUnitModal.onOpen()
  }, [businessUnitModal])

  // Get current business unit info
  const CurrentIcon = getBusinessUnitIcon(currentBusinessUnit?.name ?? '')
  const currentUnitName = currentBusinessUnit?.name ?? "No Unit Assigned"
  const currentUnitType = getBusinessUnitTypeLabel(currentBusinessUnit?.name ?? '')

  // Static display for single unit users
  if (!isSwitcherActive) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className={cn(
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
              className
            )}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <CurrentIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {currentUnitName}
              </span>
              <span className="truncate text-xs">
                {currentUnitType}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Interactive dropdown for multi-unit users
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CurrentIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentUnitName}
                </span>
                <span className="truncate text-xs">
                  {currentUnitType}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Active Units Section */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Business Units
            </DropdownMenuLabel>

            {/* Current/Selected item */}
            {currentBusinessUnit && (
              <DropdownMenuItem
                onClick={() => onBusinessUnitSelect(currentBusinessUnit.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <CurrentIcon className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="font-medium truncate">
                    {currentBusinessUnit.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {getBusinessUnitTypeLabel(currentBusinessUnit.name)}
                  </div>
                </div>
                <Check className="ml-auto size-4" />
              </DropdownMenuItem>
            )}

            {/* Other business units */}
            {items
              .filter((item): item is BusinessUnitItem => item.id !== currentBusinessUnit?.id)
              .slice(0, 5) // Show up to 5 additional units
              .map((item) => {
                const IconComponent = getBusinessUnitIcon(item.name)
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onBusinessUnitSelect(item.id)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <IconComponent className="size-4 shrink-0" />
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getBusinessUnitTypeLabel(item.name)}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}

            {/* Show overflow indicator if there are more units */}
            {items.length > 6 && (
              <DropdownMenuItem disabled className="gap-2 p-2 opacity-50">
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Monitor className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="text-sm truncate">
                    +{items.length - 6} more units...
                  </div>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Add Business Unit Option */}
            <DropdownMenuItem
              onClick={handleAddBusinessUnit}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                <Plus className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <div className="font-medium">Add Business Unit</div>
                <div className="text-xs text-muted-foreground">
                  Create new unit
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}