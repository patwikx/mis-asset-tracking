import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { LoginSchema } from "@/lib/validations/login-schema";
import { getUserByUsername } from "@/lib/auth-actions/auth-users";

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);
        if (validatedFields.success) {
          const { employeeId, passwordHash } = validatedFields.data;
          const employee = await getUserByUsername(employeeId);
          
          if (!employee || !employee.passwordHash) return null;
          
          const passwordsMatch = await bcryptjs.compare(
            passwordHash,
            employee.passwordHash
          );
         
          if (passwordsMatch) {
            // Transform Employee to User format matching your types
            return {
              id: employee.id,
              employeeId: employee.employeeId,
              email: employee.email,
              firstName: employee.firstName,
              lastName: employee.lastName,
              middleName: employee.middleName,
              position: employee.position,
              isActive: employee.isActive,
              hireDate: employee.hireDate?.toISOString() || null,
              businessUnit: employee.businessUnit,
              department: employee.department,
              role: employee.role,
            };
          }
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;