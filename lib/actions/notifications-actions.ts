// lib/actions/notification-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  NotificationWithRelations,
  CreateNotificationData,
  NotificationFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/notification-types';

export async function getUserNotifications(
  userId: string,
  filters: NotificationFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<NotificationWithRelations>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Users can only view their own notifications unless they're admin
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(user.role?.code || '');
    if (!isAdmin && user.id !== userId) {
      throw new Error('Unauthorized to view these notifications');
    }

    const { type, isRead } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      recipientId: userId,
      ...(type && { type }),
      ...(isRead !== undefined && { isRead })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    return serializeForClient({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

export async function createNotification(
  data: CreateNotificationData
): Promise<{ success: boolean; message: string; notificationId?: string }> {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedId: data.relatedId,
        isRead: false
      }
    });

    return { 
      success: true, 
      message: 'Notification created successfully',
      notificationId: notification.id
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, message: 'Failed to create notification' };
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }

    // Users can only mark their own notifications as read
    if (notification.recipientId !== user.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    revalidatePath('/notifications');
    return { success: true, message: 'Notification marked as read' };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, message: 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; message: string; updatedCount?: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Users can only mark their own notifications as read
    if (user.id !== userId) {
      return { success: false, message: 'Unauthorized' };
    }

    const result = await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    revalidatePath('/notifications');
    return { 
      success: true, 
      message: 'All notifications marked as read',
      updatedCount: result.count
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, message: 'Failed to mark notifications as read' };
  }
}

export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }

    // Users can only delete their own notifications
    if (notification.recipientId !== user.id) {
      return { success: false, message: 'Unauthorized' };
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    revalidatePath('/notifications');
    return { success: true, message: 'Notification deleted successfully' };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, message: 'Failed to delete notification' };
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Users can only check their own notification count
    if (user.id !== userId) {
      throw new Error('Unauthorized');
    }

    const count = await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });

    return count;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

export async function createDeploymentApprovalNotification(
  deploymentId: string,
  assetDescription: string,
  employeeName: string
): Promise<void> {
  try {
    // Get all users who can approve deployments
    const approvers = await prisma.employee.findMany({
      where: {
        isActive: true,
        role: {
          OR: [
            { code: 'ACCOUNTING' },
            { code: 'FINANCE' },
            { code: 'MANAGER' },
            { code: 'ADMIN' },
            { code: 'SUPER_ADMIN' }
          ]
        }
      }
    });

    // Create notifications for all approvers
    const notifications = approvers.map(approver => ({
      recipientId: approver.id,
      title: 'Deployment Approval Required',
      message: `Asset "${assetDescription}" deployment to ${employeeName} requires approval`,
      type: 'APPROVAL_PENDING',
      relatedId: deploymentId
    }));

    await prisma.notification.createMany({
      data: notifications
    });

  } catch (error) {
    console.error('Error creating deployment approval notifications:', error);
  }
}

export async function createMaintenanceDueNotification(
  assetId: string,
  assetCode: string,
  assetDescription: string,
  dueDate: Date
): Promise<void> {
  try {
    // Get asset owner or relevant personnel
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        deployments: {
          where: { status: 'DEPLOYED' },
          include: { employee: true },
          take: 1
        }
      }
    });

    if (!asset) return;

    const notifications: Array<{
      recipientId: string;
      title: string;
      message: string;
      type: string;
      relatedId: string;
    }> = [];

    // Notify assigned employee if asset is deployed
    if (asset.deployments.length > 0) {
      notifications.push({
        recipientId: asset.deployments[0].employee.id,
        title: 'Asset Maintenance Due',
        message: `Maintenance is due for asset ${assetCode} - ${assetDescription} on ${dueDate.toLocaleDateString()}`,
        type: 'MAINTENANCE_DUE',
        relatedId: assetId
      });
    }

    // Notify maintenance personnel
    const maintenanceStaff = await prisma.employee.findMany({
      where: {
        isActive: true,
        businessUnitId: asset.businessUnitId,
        role: {
          OR: [
            { code: 'MAINTENANCE' },
            { code: 'TECHNICIAN' },
            { code: 'MANAGER' }
          ]
        }
      }
    });

    maintenanceStaff.forEach(staff => {
      notifications.push({
        recipientId: staff.id,
        title: 'Scheduled Maintenance Due',
        message: `Asset ${assetCode} requires maintenance on ${dueDate.toLocaleDateString()}`,
        type: 'MAINTENANCE_DUE',
        relatedId: assetId
      });
    });

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

  } catch (error) {
    console.error('Error creating maintenance due notifications:', error);
  }
}