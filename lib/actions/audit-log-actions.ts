// lib/actions/audit-log-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  AuditLog,
  AuditLogFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/audit-log-types';

export async function getAuditLogs(
  businessUnitId: string,
  filters: AuditLogFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<AuditLog>> {
  try {
    const currentEmployee = await getCurrentUser();
    if (!currentEmployee) {
      throw new Error('Unauthorized');
    }

    const { search, action, tableName, userId, dateFrom, dateTo } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get employees from the business unit to filter audit logs
    const businessUnitEmployees = await prisma.employee.findMany({
      where: { businessUnitId },
      select: { id: true }
    });

    const businessUnitEmployeeIds = businessUnitEmployees.map((employee) => employee.id);

    const where = {
      userId: { in: businessUnitEmployeeIds },
      ...(action && { action }),
      ...(tableName && { tableName }),
      ...(userId && { userId }),
      ...(dateFrom && dateTo && {
        timestamp: {
          gte: dateFrom,
          lte: dateTo
        }
      }),
      ...(search && {
        OR: [
          { action: { contains: search, mode: 'insensitive' as const } },
          { tableName: { contains: search, mode: 'insensitive' as const } },
          { recordId: { contains: search, mode: 'insensitive' as const } },
          { userId: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    // Get employee data efficiently using a single query
    const employeeIds = [...new Set(auditLogs.map(log => log.userId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

    const auditLogsWithEmployees = auditLogs.map(log => {
      const employee = employeeMap.get(log.userId);
      return {
        ...log,
        user: employee ? {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email || 'no-email@example.com'
        } : {
          id: log.userId,
          firstName: 'Unknown',
          lastName: 'Employee',
          email: 'unknown@example.com'
        }
      };
    });

    return serializeForClient({
      data: auditLogsWithEmployees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  try {
    const currentEmployee = await getCurrentUser();
    if (!currentEmployee) {
      throw new Error('Unauthorized');
    }

    const auditLog = await prisma.auditLog.findUnique({
      where: { id }
    });

    if (!auditLog) return null;

    // Get employee data separately
    const employee = await prisma.employee.findUnique({
      where: { id: auditLog.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    const auditLogWithEmployee = {
      ...auditLog,
      user: employee ? {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || 'no-email@example.com'
      } : {
        id: auditLog.userId,
        firstName: 'Unknown',
        lastName: 'Employee',
        email: 'unknown@example.com'
      }
    };

    return serializeForClient(auditLogWithEmployee);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw new Error('Failed to fetch audit log');
  }
}

export async function getAuditLogStats(businessUnitId: string) {
  try {
    const currentEmployee = await getCurrentUser();
    if (!currentEmployee) {
      throw new Error('Unauthorized');
    }

    // Get employees from the business unit
    const businessUnitEmployees = await prisma.employee.findMany({
      where: { businessUnitId },
      select: { id: true }
    });

    const businessUnitEmployeeIds = businessUnitEmployees.map((employee) => employee.id);

    const [
      totalLogs,
      todayLogs,
      actionStats,
      tableStats
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          userId: { in: businessUnitEmployeeIds }
        }
      }),
      prisma.auditLog.count({
        where: {
          userId: { in: businessUnitEmployeeIds },
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          userId: { in: businessUnitEmployeeIds }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.auditLog.groupBy({
        by: ['tableName'],
        where: {
          userId: { in: businessUnitEmployeeIds }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    return serializeForClient({
      totalLogs,
      todayLogs,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count?.id || 0
      })),
      tableStats: tableStats.map(stat => ({
        tableName: stat.tableName,
        count: stat._count?.id || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    throw new Error('Failed to fetch audit log stats');
  }
}