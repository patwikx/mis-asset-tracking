'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { DeploymentStatus, AssetStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';

// Type for audit log data
type AuditLogData = {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
};

export interface ApproveDeploymentData {
  deploymentId: string;
  accountingNotes?: string;
}

export interface RejectDeploymentData {
  deploymentId: string;
  rejectionReason: string;
  accountingNotes?: string;
}

export interface ReturnAssetData {
  deploymentId: string;
  returnCondition: string;
  returnNotes?: string;
  returnedDate?: Date;
}

export async function approveDeployment(
  data: ApproveDeploymentData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if user has permission to approve deployments
    const hasApprovalPermission = await checkApprovalPermission(user.id);
    if (!hasApprovalPermission) {
      return { success: false, message: 'You do not have permission to approve deployments' };
    }

    // Get the deployment
    const deployment = await prisma.assetDeployment.findUnique({
      where: { id: data.deploymentId },
      include: {
        asset: true,
        employee: true
      }
    });

    if (!deployment) {
      return { success: false, message: 'Deployment not found' };
    }

    if (deployment.status !== DeploymentStatus.PENDING_ACCOUNTING_APPROVAL) {
      return { success: false, message: 'Deployment is not pending approval' };
    }

    // Check if asset is still available
    if (deployment.asset.status !== AssetStatus.AVAILABLE) {
      return { success: false, message: 'Asset is no longer available for deployment' };
    }

    const now = new Date();

    // Update deployment and asset in a transaction
    await prisma.$transaction(async (tx) => {
      // Update deployment status
      await tx.assetDeployment.update({
        where: { id: data.deploymentId },
        data: {
          status: DeploymentStatus.DEPLOYED,
          accountingApproverId: user.id,
          accountingApprovedAt: now,
          deployedDate: now,
          accountingNotes: data.accountingNotes,
          updatedAt: now
        }
      });

      // Update asset status and assignment info
      await tx.asset.update({
        where: { id: deployment.assetId },
        data: {
          status: AssetStatus.DEPLOYED,
          currentlyAssignedTo: deployment.employeeId,
          currentDeploymentId: deployment.id,
          lastAssignedDate: now,
          updatedAt: now
        }
      });

      // Create asset history record
      await tx.assetHistory.create({
        data: {
          assetId: deployment.assetId,
          action: 'DEPLOYED',
          employeeId: deployment.employeeId,
          departmentId: deployment.employee.departmentId,
          businessUnitId: deployment.businessUnitId,
          deploymentId: deployment.id,
          previousStatus: AssetStatus.AVAILABLE,
          newStatus: AssetStatus.DEPLOYED,
          notes: `Asset deployed to ${deployment.employee.firstName} ${deployment.employee.lastName} - Approved by accounting`,
          performedById: user.id,
          performedAt: now,
          startDate: now
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetDeployment',
        recordId: data.deploymentId,
        oldValues: {
          status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL,
          accountingApproverId: null,
          accountingApprovedAt: null,
          deployedDate: null
        } as Prisma.InputJsonValue,
        newValues: {
          status: DeploymentStatus.DEPLOYED,
          accountingApproverId: user.id,
          accountingApprovedAt: now.toISOString(),
          deployedDate: now.toISOString(),
          accountingNotes: data.accountingNotes
        } as Prisma.InputJsonValue,
        timestamp: now
      };

      await tx.auditLog.create({
        data: auditData
      });
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    revalidatePath(`/deployments/${data.deploymentId}`);
    
    return { success: true, message: 'Deployment approved successfully' };
  } catch (error) {
    console.error('Error approving deployment:', error);
    return { success: false, message: 'Failed to approve deployment' };
  }
}

export async function rejectDeployment(
  data: RejectDeploymentData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if user has permission to approve/reject deployments
    const hasApprovalPermission = await checkApprovalPermission(user.id);
    if (!hasApprovalPermission) {
      return { success: false, message: 'You do not have permission to reject deployments' };
    }

    // Get the deployment
    const deployment = await prisma.assetDeployment.findUnique({
      where: { id: data.deploymentId },
      include: {
        asset: true,
        employee: true
      }
    });

    if (!deployment) {
      return { success: false, message: 'Deployment not found' };
    }

    if (deployment.status !== DeploymentStatus.PENDING_ACCOUNTING_APPROVAL) {
      return { success: false, message: 'Deployment is not pending approval' };
    }

    const now = new Date();

    // Update deployment status and create history in a transaction
    await prisma.$transaction(async (tx) => {
      // Update deployment status to cancelled
      await tx.assetDeployment.update({
        where: { id: data.deploymentId },
        data: {
          status: DeploymentStatus.CANCELLED,
          accountingApproverId: user.id,
          accountingApprovedAt: now,
          accountingNotes: `REJECTED: ${data.rejectionReason}. ${data.accountingNotes || ''}`,
          updatedAt: now
        }
      });

      // Create asset history record
      await tx.assetHistory.create({
        data: {
          assetId: deployment.assetId,
          action: 'STATUS_CHANGED',
          employeeId: deployment.employeeId,
          departmentId: deployment.employee.departmentId,
          businessUnitId: deployment.businessUnitId,
          deploymentId: deployment.id,
          previousStatus: deployment.asset.status,
          newStatus: deployment.asset.status, // Status remains the same
          notes: `Deployment rejected by accounting: ${data.rejectionReason}`,
          performedById: user.id,
          performedAt: now
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetDeployment',
        recordId: data.deploymentId,
        oldValues: {
          status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
        } as Prisma.InputJsonValue,
        newValues: {
          status: DeploymentStatus.CANCELLED,
          rejectionReason: data.rejectionReason,
          accountingNotes: data.accountingNotes
        } as Prisma.InputJsonValue,
        timestamp: now
      };

      await tx.auditLog.create({
        data: auditData
      });
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    revalidatePath(`/deployments/${data.deploymentId}`);
    
    return { success: true, message: 'Deployment rejected successfully' };
  } catch (error) {
    console.error('Error rejecting deployment:', error);
    return { success: false, message: 'Failed to reject deployment' };
  }
}

export async function returnAsset(
  data: ReturnAssetData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Get the deployment
    const deployment = await prisma.assetDeployment.findUnique({
      where: { id: data.deploymentId },
      include: {
        asset: true,
        employee: true
      }
    });

    if (!deployment) {
      return { success: false, message: 'Deployment not found' };
    }

    if (deployment.status !== DeploymentStatus.DEPLOYED) {
      return { success: false, message: 'Asset is not currently deployed' };
    }

    const returnDate = data.returnedDate || new Date();

    // Update deployment and asset in a transaction
    await prisma.$transaction(async (tx) => {
      // Update deployment status
      await tx.assetDeployment.update({
        where: { id: data.deploymentId },
        data: {
          status: DeploymentStatus.RETURNED,
          returnedDate: returnDate,
          returnCondition: data.returnCondition,
          returnNotes: data.returnNotes,
          updatedAt: returnDate
        }
      });

      // Update asset status and clear assignment info
      await tx.asset.update({
        where: { id: deployment.assetId },
        data: {
          status: AssetStatus.AVAILABLE,
          currentlyAssignedTo: null,
          currentDeploymentId: null,
          updatedAt: returnDate
        }
      });

      // End the current asset history record
      await tx.assetHistory.updateMany({
        where: {
          assetId: deployment.assetId,
          deploymentId: deployment.id,
          endDate: null
        },
        data: {
          endDate: returnDate
        }
      });

      // Create new asset history record for return
      await tx.assetHistory.create({
        data: {
          assetId: deployment.assetId,
          action: 'RETURNED',
          employeeId: deployment.employeeId,
          departmentId: deployment.employee.departmentId,
          businessUnitId: deployment.businessUnitId,
          deploymentId: deployment.id,
          previousStatus: AssetStatus.DEPLOYED,
          newStatus: AssetStatus.AVAILABLE,
          notes: `Asset returned from ${deployment.employee.firstName} ${deployment.employee.lastName}. Condition: ${data.returnCondition}`,
          metadata: {
            returnCondition: data.returnCondition,
            returnNotes: data.returnNotes
          } as Prisma.InputJsonValue,
          performedById: user.id,
          performedAt: returnDate,
          startDate: returnDate
        }
      });

      // Create audit log
      const auditData: AuditLogData = {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetDeployment',
        recordId: data.deploymentId,
        oldValues: {
          status: DeploymentStatus.DEPLOYED,
          returnedDate: null
        } as Prisma.InputJsonValue,
        newValues: {
          status: DeploymentStatus.RETURNED,
          returnedDate: returnDate.toISOString(),
          returnCondition: data.returnCondition,
          returnNotes: data.returnNotes
        } as Prisma.InputJsonValue,
        timestamp: returnDate
      };

      await tx.auditLog.create({
        data: auditData
      });
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    revalidatePath(`/deployments/${data.deploymentId}`);
    
    return { success: true, message: 'Asset returned successfully' };
  } catch (error) {
    console.error('Error returning asset:', error);
    return { success: false, message: 'Failed to return asset' };
  }
}

export async function getPendingApprovals(
  businessUnitId: string
): Promise<{ success: boolean; data: unknown[]; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, data: [], message: 'Unauthorized' };
    }

    const pendingDeployments = await prisma.assetDeployment.findMany({
      where: {
        businessUnitId,
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
      },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            department: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      success: true,
      data: serializeForClient(pendingDeployments)
    };
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return { success: false, data: [], message: 'Failed to fetch pending approvals' };
  }
}

export async function getDeployedAssets(
  businessUnitId: string
): Promise<{ success: boolean; data: unknown[]; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, data: [], message: 'Unauthorized' };
    }

    const deployedAssets = await prisma.assetDeployment.findMany({
      where: {
        businessUnitId,
        status: DeploymentStatus.DEPLOYED,
        returnedDate: null
      },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            department: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { deployedDate: 'desc' }
    });

    return {
      success: true,
      data: serializeForClient(deployedAssets)
    };
  } catch (error) {
    console.error('Error fetching deployed assets:', error);
    return { success: false, data: [], message: 'Failed to fetch deployed assets' };
  }
}

async function checkApprovalPermission(userId: string): Promise<boolean> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!employee?.isActive) return false;

    // Check role permissions
    const permissions = employee.role?.permissions as Record<string, unknown> | null;
    if (permissions && typeof permissions === 'object') {
      // Check for specific deployment approval permission
      if (permissions['deployments:approve'] === true) {
        return true;
      }
      
      // Check for admin permissions
      if (permissions['admin:full_access'] === true) {
        return true;
      }
    }

    // Check specific role codes that can approve
    const approverRoles = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTING', 'FINANCE', 'MANAGER'] as const;
    return approverRoles.includes(employee.role?.code as typeof approverRoles[number]);
  } catch (error) {
    console.error('Error checking approval permission:', error);
    return false;
  }
}

export async function bulkApproveDeployments(
  deploymentIds: string[],
  accountingNotes?: string
): Promise<{ success: boolean; message: string; approvedCount?: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if user has permission to approve deployments
    const hasApprovalPermission = await checkApprovalPermission(user.id);
    if (!hasApprovalPermission) {
      return { success: false, message: 'You do not have permission to approve deployments' };
    }

    // Get all deployments to validate
    const deployments = await prisma.assetDeployment.findMany({
      where: {
        id: { in: deploymentIds },
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
      },
      include: {
        asset: true,
        employee: true
      }
    });

    if (deployments.length === 0) {
      return { success: false, message: 'No valid deployments found for approval' };
    }

    const now = new Date();
    let approvedCount = 0;

    // Process each deployment in a transaction
    await prisma.$transaction(async (tx) => {
      for (const deployment of deployments) {
        // Check if asset is still available
        if (deployment.asset.status !== AssetStatus.AVAILABLE) {
          continue; // Skip this deployment
        }

        // Update deployment status
        await tx.assetDeployment.update({
          where: { id: deployment.id },
          data: {
            status: DeploymentStatus.DEPLOYED,
            accountingApproverId: user.id,
            accountingApprovedAt: now,
            deployedDate: now,
            accountingNotes,
            updatedAt: now
          }
        });

        // Update asset status and assignment info
        await tx.asset.update({
          where: { id: deployment.assetId },
          data: {
            status: AssetStatus.DEPLOYED,
            currentlyAssignedTo: deployment.employeeId,
            currentDeploymentId: deployment.id,
            lastAssignedDate: now,
            updatedAt: now
          }
        });

        // Create asset history record
        await tx.assetHistory.create({
          data: {
            assetId: deployment.assetId,
            action: 'DEPLOYED',
            employeeId: deployment.employeeId,
            departmentId: deployment.employee.departmentId,
            businessUnitId: deployment.businessUnitId,
            deploymentId: deployment.id,
            previousStatus: AssetStatus.AVAILABLE,
            newStatus: AssetStatus.DEPLOYED,
            notes: `Asset deployed to ${deployment.employee.firstName} ${deployment.employee.lastName} - Bulk approved by accounting`,
            performedById: user.id,
            performedAt: now,
            startDate: now
          }
        });

        // Create audit log
        const auditData: AuditLogData = {
          userId: user.id,
          action: 'UPDATE',
          tableName: 'AssetDeployment',
          recordId: deployment.id,
          oldValues: {
            status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
          } as Prisma.InputJsonValue,
          newValues: {
            status: DeploymentStatus.DEPLOYED,
            accountingApproverId: user.id,
            accountingApprovedAt: now.toISOString(),
            deployedDate: now.toISOString(),
            accountingNotes
          } as Prisma.InputJsonValue,
          timestamp: now
        };

        await tx.auditLog.create({
          data: auditData
        });

        approvedCount++;
      }
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    
    return { 
      success: true, 
      message: `Successfully approved ${approvedCount} out of ${deploymentIds.length} deployments`,
      approvedCount
    };
  } catch (error) {
    console.error('Error bulk approving deployments:', error);
    return { success: false, message: 'Failed to approve deployments' };
  }
}