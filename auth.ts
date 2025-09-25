import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
    signOut: "/auth/sign-in"
  },
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user?.id) return false;
      
      // Check if employee exists and is active
      const existingEmployee = await prisma.employee.findUnique({ 
        where: { id: user.id } 
      });
      
      return existingEmployee?.isActive === true;
    },
    
    async jwt({ token }) {
      if (!token.sub) return token;
      
      // Fetch employee with all related data
      const employeeWithDetails = await prisma.employee.findUnique({
        where: { id: token.sub },
        include: {
          businessUnit: true,
          department: true,
          role: true
        },
      });
      
      if (!employeeWithDetails) return token;

      // Update last login timestamp
      await prisma.employee.update({
        where: { id: token.sub },
        data: { lastLoginAt: new Date() }
      });

      // Set token data
      token.id = employeeWithDetails.id;
      token.employeeId = employeeWithDetails.employeeId;
      token.firstName = employeeWithDetails.firstName;
      token.lastName = employeeWithDetails.lastName;
      token.middleName = employeeWithDetails.middleName;
      token.name = `${employeeWithDetails.firstName} ${employeeWithDetails.lastName}`;
      token.position = employeeWithDetails.position;
      token.isActive = employeeWithDetails.isActive;
      token.hireDate = employeeWithDetails.hireDate?.toISOString() ?? null;
      
      // Business Unit data
      token.businessUnit = {
        id: employeeWithDetails.businessUnit.id,
        name: employeeWithDetails.businessUnit.name,
        code: employeeWithDetails.businessUnit.code,
        description: employeeWithDetails.businessUnit.description
      };
      
      // Department data
      token.department = {
        id: employeeWithDetails.department.id,
        name: employeeWithDetails.department.name,
        code: employeeWithDetails.department.code,
        description: employeeWithDetails.department.description
      };
      
      // Role data - pass permissions directly without conversion
      token.role = {
        id: employeeWithDetails.role.id,
        name: employeeWithDetails.role.name,
        code: employeeWithDetails.role.code,
        description: employeeWithDetails.role.description,
        permissions: employeeWithDetails.role.permissions // Direct assignment
      };
     
      return token;
    },
    
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.id as string;
        session.user.employeeId = token.employeeId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.middleName = token.middleName as string | null;
        session.user.name = token.name as string;
        session.user.position = token.position as string | null;
        session.user.isActive = token.isActive as boolean;
        session.user.hireDate = token.hireDate as string | null;
        session.user.businessUnit = token.businessUnit as typeof token.businessUnit;
        session.user.department = token.department as typeof token.department;
        session.user.role = token.role as typeof token.role;
      }
      return session;
    },
  },
});