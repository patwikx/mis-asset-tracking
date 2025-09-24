import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import type { BusinessUnitItem } from '@/types/business-unit-types';
import { prisma } from '@/lib/prisma';
import "../globals.css";
import { Toaster } from 'sonner';
import { BusinessUnitProvider } from '@/context/business-unit-context';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Session } from 'next-auth';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const metadata = {
  title: "Tropicana Worldwide Corp.",
  description: "Asset Management System for TWC",
};

// Type guard to ensure we have a complete user session
function isValidUserSession(session: Session | null): session is Session & {
  user: NonNullable<Session['user']> & {
    businessUnit: NonNullable<Session['user']['businessUnit']>;
    role: NonNullable<Session['user']['role']>;
  }
} {
  return !!(
    session?.user?.id &&
    session.user.businessUnit?.id &&
    session.user.role?.code &&
    session.user.isActive
  );
}

// Helper function to check if user is admin based on role
function isUserAdmin(roleCode: string): boolean {
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'] as const;
  return adminRoles.includes(roleCode as typeof adminRoles[number]);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers();
  const businessUnitId = headersList.get("x-business-unit-id");
  const session = await auth();

  // Redirect to sign-in if there's no session or user
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Check if user account is active
  if (!session.user.isActive) {
    redirect("/auth/sign-in?error=AccountDeactivated");
  }

  // Ensure we have a complete user session
  if (!isValidUserSession(session)) {
    redirect("/auth/sign-in?error=IncompleteProfile");
  }

  // If no business unit is in the URL, redirect to the user's assigned unit
  if (!businessUnitId) {
    const defaultUnitId = session.user.businessUnit.id;
    redirect(`/${defaultUnitId}`);
  }

  // Check if user is admin based on their role
  const isAdmin = isUserAdmin(session.user.role.code);

  // Check if user is authorized for the requested business unit
  // Admins can access any unit, regular users can only access their assigned unit
  const isAuthorizedForUnit = isAdmin || session.user.businessUnit.id === businessUnitId;

  // If the user is not authorized for the requested unit, redirect them
  if (!isAuthorizedForUnit) {
    redirect(`/${session.user.businessUnit.id}`);
  }

  let businessUnits: BusinessUnitItem[] = [];

  // If the user is an admin, fetch all business units from the database
  if (isAdmin) {
    try {
      businessUnits = await prisma.businessUnit.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });
    } catch (error) {
      console.error("Failed to fetch business units:", error);
      // Fallback to user's own business unit
      businessUnits = [{
        id: session.user.businessUnit.id,
        code: session.user.businessUnit.code,
        name: session.user.businessUnit.name,
      }];
    }
  } else {
    // Regular users only see their assigned business unit
    businessUnits = [{
      id: session.user.businessUnit.id,
      code: session.user.businessUnit.code,
      name: session.user.businessUnit.name,
    }];
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* App Sidebar */}
        <AppSidebar 
          session={session}
          businessUnits={businessUnits}
          currentBusinessUnitId={businessUnitId}
        />
        
        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          {/* Header with breadcrumb */}
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Home</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4">
            <BusinessUnitProvider businessUnitId={businessUnitId}>
              {children}
            </BusinessUnitProvider>
          </main>
        </SidebarInset>

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </SidebarProvider>
  )
}