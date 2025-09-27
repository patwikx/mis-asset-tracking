// types/notification-types.ts
import { Notification } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NotificationWithRelations extends Notification {}

export interface CreateNotificationData {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
}

export interface NotificationFilters {
  type?: string;
  isRead?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export enum NotificationType {
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  RETURN_DUE = 'RETURN_DUE',
  DEPRECIATION_DUE = 'DEPRECIATION_DUE',
  WARRANTY_EXPIRY = 'WARRANTY_EXPIRY',
  ASSET_ASSIGNED = 'ASSET_ASSIGNED',
  ASSET_RETURNED = 'ASSET_RETURNED',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}