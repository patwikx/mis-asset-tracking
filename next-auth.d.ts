// next-auth.d.ts
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Prisma } from "@prisma/client";

// Define the structure for a user's role
export interface UserRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  permissions: Prisma.JsonValue | null; // Changed to match Prisma's JsonValue
}

// Define the structure for a user's department
export interface UserDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

// Define the structure for a user's business unit
export interface UserBusinessUnit {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      employeeId: string;
      email: string | null;
      firstName: string;
      lastName: string;
      middleName: string | null;
      name: string; // Computed from firstName + lastName
      position: string | null;
      isActive: boolean;
      hireDate: string | null;
      businessUnit: UserBusinessUnit;
      department: UserDepartment;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    middleName: string | null;
    position: string | null;
    isActive: boolean;
    hireDate: string | null;
    businessUnit: UserBusinessUnit;
    department: UserDepartment;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    middleName: string | null;
    name: string;
    position: string | null;
    isActive: boolean;
    hireDate: string | null;
    businessUnit: UserBusinessUnit;
    department: UserDepartment;
    role: UserRole;
  }
}