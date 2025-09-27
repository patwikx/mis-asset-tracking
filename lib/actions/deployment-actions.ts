// lib/actions/deployment-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { DeploymentStatus, AssetStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import type {
  DeploymentQueryResult,
  CreateDeploymentData,
  UpdateDeploymentData,
  DeploymentFilters,
  PaginationParams,
  PaginatedResponse,
  BulkDeploymentData
} from '@/types/asset-types';

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

async function generateTransmittalNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `TN-${currentYear}-`;
  
  // Get the latest transmittal number for the current year
  const latestDeployment = await prisma.assetDeployment.findFirst({
    where: {
      transmittalNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      transmittalNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (latestDeployment) {
    // Extract the number part and increment
    const numberPart = latestDeployment.transmittalNumber.replace(prefix, '');
    nextNumber = parseInt(numberPart) + 1;
  }

  // Pad with zeros to make it 4 digits
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

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

    // Build where clause with proper typing
    const where: Prisma.AssetDeploymentWhereInput = {
      businessUnitId,
    };

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (assetId) {
      where.assetId = assetId;
    }

    if (dateFrom || dateTo) {
      where.deployedDate = {};
      if (dateFrom) {
        where.deployedDate.gte = dateFrom;
      }
      if (dateTo) {
        where.deployedDate.lte = dateTo;
      }
    }

    if (search) {
      where.OR = [
        { asset: { description: { contains: search, mode: 'insensitive' } } },
        { asset: { itemCode: { contains: search, mode: 'insensitive' } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [deployments, total] = await Promise.all([
      prisma.assetDeployment.findMany({
        where,
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
              businessUnitId: true,
              departmentId: true,
              roleId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              passwordHash: true,
              middleName: true,
              hireDate: true,
              terminateDate: true,
              emailVerified: true,
              image: true,
              lastLoginAt: true
            }
          },
          businessUnit: true,
          accountingApprover: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              email: true,
              position: true,
              businessUnitId: true,
              departmentId: true,
              roleId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              passwordHash: true,
              middleName: true,
              hireDate: true,
              terminateDate: true,
              emailVerified: true,
              image: true,
              lastLoginAt: true
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
      data: deployments,
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
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            businessUnitId: true,
            departmentId: true,
            roleId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: true,
            middleName: true,
            hireDate: true,
            terminateDate: true,
            emailVerified: true,
            image: true,
            lastLoginAt: true
          }
        },
        businessUnit: true,
        accountingApprover: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            businessUnitId: true,
            departmentId: true,
            roleId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: true,
            middleName: true,
            hireDate: true,
            terminateDate: true,
            emailVerified: true,
            image: true,
            lastLoginAt: true
          }
        }
      }
    });

    return deployment ? serializeForClient(deployment) : null;
  } catch (error) {
    console.error('Error fetching deployment:', error);
    throw new Error('Failed to fetch deployment');
  }
}

export async function createDeployment(
  data: CreateDeploymentData
): Promise<{ success: boolean; message: string; deploymentId?: string }> {
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

    // Generate transmittal number
    const transmittalNumber = data.transmittalNumber || await generateTransmittalNumber();
    
    // Prepare deployment data with proper types
    const deploymentData: Prisma.AssetDeploymentCreateInput = {
      transmittalNumber,
      asset: {
        connect: { id: data.assetId }
      },
      employee: {
        connect: { id: data.employeeId }
      },
      businessUnit: {
        connect: { id: data.businessUnitId }
      },
      expectedReturnDate: data.expectedReturnDate,
      deploymentNotes: data.deploymentNotes,
      deploymentCondition: data.deploymentCondition,
      status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
    };
    
    // Create deployment
    const deployment = await prisma.assetDeployment.create({
      data: deploymentData
    });

    // Update asset status to deployed (since it's pending approval, we'll keep it available until approved)
    // The asset status will be updated to DEPLOYED when the deployment is approved

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'CREATE',
      tableName: 'AssetDeployment',
      recordId: deployment.id,
      newValues: {
        transmittalNumber,
        assetId: data.assetId,
        employeeId: data.employeeId,
        businessUnitId: data.businessUnitId,
        expectedReturnDate: data.expectedReturnDate?.toISOString(),
        deploymentNotes: data.deploymentNotes,
        deploymentCondition: data.deploymentCondition,
        status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    return { success: true, message: 'Deployment created successfully', deploymentId: deployment.id };
  } catch (error) {
    console.error('Error creating deployment:', error);
    return { success: false, message: 'Failed to create deployment' };
  }
}

export async function updateDeployment(
  data: UpdateDeploymentData
): Promise<{ success: boolean; message: string }> {
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

    // Prepare update data with proper types
    const deploymentUpdateData: Prisma.AssetDeploymentUpdateInput = {
      ...updateData,
      updatedAt: new Date()
    };

    // Handle status changes
    if (updateData.status) {
      if (updateData.status === DeploymentStatus.APPROVED) {
        deploymentUpdateData.accountingApprover = {
          connect: { id: user.id }
        };
        deploymentUpdateData.accountingApprovedAt = new Date();
        
        // Set deployed date if not already set
        if (!currentDeployment.deployedDate) {
          deploymentUpdateData.deployedDate = new Date();
        }
        
        // Update deployment status to DEPLOYED and asset status to DEPLOYED
        deploymentUpdateData.status = DeploymentStatus.DEPLOYED;
        await prisma.asset.update({
          where: { id: currentDeployment.assetId },
          data: { status: AssetStatus.DEPLOYED }
        });
      } else if (updateData.status === DeploymentStatus.RETURNED) {
        deploymentUpdateData.returnedDate = updateData.returnedDate || new Date();
        
        // Update asset status back to available
        await prisma.asset.update({
          where: { id: currentDeployment.assetId },
          data: { status: AssetStatus.AVAILABLE }
        });
      }
    }

    await prisma.assetDeployment.update({
      where: { id },
      data: deploymentUpdateData
    });

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'AssetDeployment',
      recordId: id,
      newValues: {
        status: updateData.status,
        deploymentNotes: updateData.deploymentNotes,
        returnCondition: updateData.returnCondition,
        returnNotes: updateData.returnNotes,
        accountingNotes: updateData.accountingNotes,
        returnedDate: updateData.returnedDate?.toISOString(),
        deployedDate: updateData.deployedDate?.toISOString(),
        accountingApprovedAt: deploymentUpdateData.accountingApprovedAt instanceof Date 
          ? deploymentUpdateData.accountingApprovedAt.toISOString() 
          : undefined
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
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

    // Create audit log with proper typing
    const auditData: AuditLogData = {
      userId: user.id,
      action: 'UPDATE',
      tableName: 'AssetDeployment',
      recordId: id,
      newValues: { 
        status: DeploymentStatus.CANCELLED 
      } as Prisma.InputJsonValue,
      timestamp: new Date()
    };

    await prisma.auditLog.create({
      data: auditData
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
    
    // Build where condition with proper typing
    const whereCondition: Prisma.EmployeeWhereInput = { 
      isActive: true 
    };
    
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

    return serializeForClient(employees);
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
    
    // Build where condition with proper typing
    const whereCondition: Prisma.AssetWhereInput = {
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

    return serializeForClient(businessUnits);
  } catch (error) {
    console.error('Error fetching business units:', error);
    throw new Error('Failed to fetch business units');
  }
}

export async function createBulkDeployments(
  deployments: BulkDeploymentData[]
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    if (deployments.length === 0) {
      return { success: false, message: 'No deployments provided' };
    }

    // Validate all assets are available
    const assetIds = deployments.map(d => d.assetId);
    const assets = await prisma.asset.findMany({
      where: { 
        id: { in: assetIds },
        status: AssetStatus.AVAILABLE 
      }
    });

    if (assets.length !== assetIds.length) {
      const unavailableAssets = assetIds.filter(id => !assets.find(a => a.id === id));
      return { 
        success: false, 
        message: `Some assets are not available: ${unavailableAssets.length} assets` 
      };
    }

    // Validate all employees exist and are active
    const employeeIds = [...new Set(deployments.map(d => d.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { 
        id: { in: employeeIds },
        isActive: true 
      }
    });

    if (employees.length !== employeeIds.length) {
      return { success: false, message: 'Some employees are not found or inactive' };
    }

    // Generate all transmittal numbers BEFORE the transaction
    const transmittalNumbers: string[] = [];
    const currentYear = new Date().getFullYear();
    const prefix = `TN-${currentYear}-`;
    
    // Get the latest transmittal number for the current year
    const latestDeployment = await prisma.assetDeployment.findFirst({
      where: {
        transmittalNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        transmittalNumber: 'desc'
      }
    });

    let nextNumber = 1;
    if (latestDeployment) {
      // Extract the number part and increment
      const numberPart = latestDeployment.transmittalNumber.replace(prefix, '');
      nextNumber = parseInt(numberPart) + 1;
    }

    // Generate sequential transmittal numbers for all deployments
    for (let i = 0; i < deployments.length; i++) {
      const transmittalNumber = `${prefix}${(nextNumber + i).toString().padStart(4, '0')}`;
      transmittalNumbers.push(transmittalNumber);
    }

    // Create all deployments in a transaction
    const createdDeployments = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (let i = 0; i < deployments.length; i++) {
        const deploymentData = deployments[i];
        const transmittalNumber = transmittalNumbers[i];
        
        // Prepare deployment data with proper types
        const bulkDeploymentData: Prisma.AssetDeploymentCreateInput = {
          transmittalNumber,
          asset: {
            connect: { id: deploymentData.assetId }
          },
          employee: {
            connect: { id: deploymentData.employeeId }
          },
          businessUnit: {
            connect: { id: deploymentData.businessUnitId }
          },
          deploymentNotes: deploymentData.deploymentNotes,
          status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
        };
        
        // Create deployment
        const deployment = await tx.assetDeployment.create({
          data: bulkDeploymentData
        });

        // Create audit log for each deployment with proper typing
        const auditData: AuditLogData = {
          userId: user.id,
          action: 'CREATE',
          tableName: 'AssetDeployment',
          recordId: deployment.id,
          newValues: {
            transmittalNumber,
            assetId: deploymentData.assetId,
            employeeId: deploymentData.employeeId,
            businessUnitId: deploymentData.businessUnitId,
            deploymentNotes: deploymentData.deploymentNotes,
            status: DeploymentStatus.PENDING_ACCOUNTING_APPROVAL
          } as Prisma.InputJsonValue,
          timestamp: new Date()
        };

        await tx.auditLog.create({
          data: auditData
        });

        results.push(deployment);
      }

      return results;
    });

    revalidatePath('/deployments');
    revalidatePath('/assets');
    
    return { 
      success: true, 
      message: `Successfully created ${createdDeployments.length} deployments`,
      count: createdDeployments.length
    };
  } catch (error) {
    console.error('Error creating bulk deployments:', error);
    return { success: false, message: 'Failed to create deployments' };
  }
}

export async function getNextTransmittalNumber(): Promise<string> {
  try {
    return await generateTransmittalNumber();
  } catch (error) {
    console.error('Error generating transmittal number:', error);
    throw new Error('Failed to generate transmittal number');
  }
}