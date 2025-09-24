// lib/actions/deployment-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { DeploymentStatus, AssetStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  DeploymentQueryResult,
  CreateDeploymentData,
  UpdateDeploymentData,
  DeploymentFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types/asset-types';

export async function getDeployments(
  businessUnitId: string,
  filters: DeploymentFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<DeploymentQueryResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { search, status, employeeId, assetId, dateFrom, dateTo } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      businessUnitId,
      ...(status && { status }),
      ...(employeeId && { employeeId }),
      ...(assetId && { assetId }),
      ...(dateFrom && { deployedDate: { gte: dateFrom } }),
      ...(dateTo && { 
        deployedDate: { 
          ...(dateFrom ? { gte: dateFrom } : {}),
          lte: dateTo 
        } 
      }),
      ...(search && {
        OR: [
          { asset: { description: { contains: search, mode: 'insensitive' as const } } },
          { asset: { itemCode: { contains: search, mode: 'insensitive' as const } } },
          { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
          { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
          { employee: { employeeId: { contains: search, mode: 'insensitive' as const } } }
        ]
      })
    };

    const [deployments, total] = await Promise.all([
      prisma.assetDeployment.findMany({
        where,
        include: {
          asset: {
            include: {
              category: true
            }
          },
          employee: true,
          businessUnit: true,
          accountingApprover: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.assetDeployment.count({ where })
    ]);

    return serializeForClient({
      data: deployments as DeploymentQueryResult[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw new Error('Failed to fetch deployments');
  }
}

export async function getDeploymentById(id: string): Promise<DeploymentQueryResult | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const deployment = await prisma.assetDeployment.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        employee: true,
        businessUnit: true,
        accountingApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return deployment as DeploymentQueryResult | null;
  } catch (error) {
    console.error('Error fetching deployment:', error);
    throw new Error('Failed to fetch deployment');
  }
}

export async function createDeployment(data: CreateDeploymentData): Promise<{ success: boolean; message: string; deploymentId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Check if asset is available
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId }
    });

    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      return { success: false, message: 'Asset is not available for deployment' };
    }

    // Check if employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId }
    });

    if (!employee || !employee.isActive) {
      return { success: false, message: 'Employee not found or inactive' };
    }

    // Create deployment
    const deployment = await prisma.assetDeployment.create({
      data: {
        ...data,
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
      }
    });

    // Update asset status to deployed (since it's pending approval, we'll keep it available until approved)
    // The asset status will be updated to DEPLOYED when the deployment is approved

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        tableName: 'AssetDeployment',
        recordId: deployment.id,
        newValues: JSON.parse(JSON.stringify(data))
      }
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    return { success: true, message: 'Deployment created successfully', deploymentId: deployment.id };
  } catch (error) {
    console.error('Error creating deployment:', error);
    return { success: false, message: 'Failed to create deployment' };
  }
}

export async function updateDeployment(data: UpdateDeploymentData): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { id, ...updateData } = data;

    // Get current deployment
    const currentDeployment = await prisma.assetDeployment.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!currentDeployment) {
      return { success: false, message: 'Deployment not found' };
    }

    // Handle status changes
    if (updateData.status) {
      if (updateData.status === DeploymentStatus.APPROVED) {
        updateData.accountingApproverId = user.id;
        updateData.accountingApprovedAt = new Date();
        
        // Set deployed date if not already set
        if (!currentDeployment.deployedDate) {
          updateData.deployedDate = new Date();
        }
        
        // Update deployment status to DEPLOYED and asset status to DEPLOYED
        updateData.status = DeploymentStatus.DEPLOYED;
        await prisma.asset.update({
          where: { id: currentDeployment.assetId },
          data: { status: AssetStatus.DEPLOYED }
        });
      } else if (updateData.status === DeploymentStatus.RETURNED) {
        updateData.returnedDate = updateData.returnedDate || new Date();
        
        // Update asset status back to available
        await prisma.asset.update({
          where: { id: currentDeployment.assetId },
          data: { status: AssetStatus.AVAILABLE }
        });
      }
    }

    await prisma.assetDeployment.update({
      where: { id },
      data: updateData
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetDeployment',
        recordId: id,
        newValues: JSON.parse(JSON.stringify(updateData))
      }
    });

    revalidatePath('/deployments');
    revalidatePath(`/deployments/${id}`);
    revalidatePath('/assets');
    return { success: true, message: 'Deployment updated successfully' };
  } catch (error) {
    console.error('Error updating deployment:', error);
    return { success: false, message: 'Failed to update deployment' };
  }
}

export async function cancelDeployment(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const deployment = await prisma.assetDeployment.findUnique({
      where: { id }
    });

    if (!deployment) {
      return { success: false, message: 'Deployment not found' };
    }

    if (deployment.status === DeploymentStatus.DEPLOYED) {
      return { success: false, message: 'Cannot cancel deployed asset. Use return instead.' };
    }

    await prisma.assetDeployment.update({
      where: { id },
      data: {
        status: DeploymentStatus.CANCELLED
      }
    });

    // Update asset status back to available
    await prisma.asset.update({
      where: { id: deployment.assetId },
      data: { status: AssetStatus.AVAILABLE }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        tableName: 'AssetDeployment',
        recordId: id,
        newValues: { status: DeploymentStatus.CANCELLED }
      }
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    return { success: true, message: 'Deployment cancelled successfully' };
  } catch (error) {
    console.error('Error cancelling deployment:', error);
    return { success: false, message: 'Failed to cancel deployment' };
  }
}

export async function getEmployees(businessUnitId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // If no businessUnitId provided, use the current user's business unit
    // Admin users can see all employees if no specific business unit is requested
    const whereCondition: any = { isActive: true };
    
    if (businessUnitId) {
      whereCondition.businessUnitId = businessUnitId;
    } else if (user.role?.code !== 'SUPER_ADMIN' && user.role?.code !== 'ADMIN') {
      // Non-admin users can only see employees from their own business unit
      whereCondition.businessUnitId = user.businessUnit?.id;
    }

    const employees = await prisma.employee.findMany({
      where: whereCondition,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        businessUnit: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }
}

export async function getAvailableAssets(businessUnitId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    
    // If no businessUnitId provided, use the current user's business unit
    // Admin users can see all assets if no specific business unit is requested
    const whereCondition: any = {
      isActive: true,
      status: AssetStatus.AVAILABLE
    };
    
    if (businessUnitId) {
      whereCondition.businessUnitId = businessUnitId;
    } else if (user.role?.code !== 'SUPER_ADMIN' && user.role?.code !== 'ADMIN') {
      // Non-admin users can only see assets from their own business unit
      whereCondition.businessUnitId = user.businessUnit?.id;
    }

    const assets = await prisma.asset.findMany({
      where: whereCondition,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: { description: 'asc' }
    });

    return serializeForClient(assets);
  } catch (error) {
    console.error('Error fetching available assets:', error);
    throw new Error('Failed to fetch available assets');
  }
}

export async function getBusinessUnits() {
  try {
    const businessUnits = await prisma.businessUnit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    return businessUnits;
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}