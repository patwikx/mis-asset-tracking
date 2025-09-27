// lib/actions/profile-actions.ts
'use server'

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { serializeForClient } from '@/lib/utils/server-client-bridge';
import { DeploymentStatus } from '@prisma/client';
import type { UserProfile, AssignedAsset, ProfileStats } from '@/types/profile-types';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Unauthorized');
    }

    // Users can only view their own profile unless they're admin
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role?.code || '');
    if (!isAdmin && currentUser.id !== userId) {
      throw new Error('Unauthorized to view this profile');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: userId, isActive: true },
      include: {
        businessUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true
          }
        }
      }
    });

    return employee ? serializeForClient(employee) : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

export async function getUserAssignedAssets(userId: string): Promise<AssignedAsset[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Unauthorized');
    }

    // Users can only view their own assets unless they're admin
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role?.code || '');
    if (!isAdmin && currentUser.id !== userId) {
      throw new Error('Unauthorized to view these assets');
    }

    const deployments = await prisma.assetDeployment.findMany({
      where: {
        employeeId: userId,
        status: {
          in: [DeploymentStatus.DEPLOYED, DeploymentStatus.PENDING_ACCOUNTING_APPROVAL]
        }
      },
      include: {
        asset: {
          include: {
            category: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { deployedDate: 'desc' }
    });

    const assignedAssets: AssignedAsset[] = deployments.map(deployment => ({
      id: deployment.id,
      itemCode: deployment.asset.itemCode,
      description: deployment.asset.description,
      serialNumber: deployment.asset.serialNumber,
      brand: deployment.asset.brand,
      location: deployment.asset.location,
      purchasePrice: deployment.asset.purchasePrice ? deployment.asset.purchasePrice.toNumber() : null,
      currentBookValue: deployment.asset.currentBookValue ? deployment.asset.currentBookValue.toNumber() : null,
      categoryName: deployment.asset.category.name,
      status: deployment.status,
      deployedDate: deployment.deployedDate,
      expectedReturnDate: deployment.expectedReturnDate,
      deploymentNotes: deployment.deploymentNotes,
      deploymentCondition: deployment.deploymentCondition
    }));

    return serializeForClient(assignedAssets);
  } catch (error) {
    console.error('Error fetching user assigned assets:', error);
    throw new Error('Failed to fetch assigned assets');
  }
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Unauthorized');
    }

    // Users can only view their own stats unless they're admin
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role?.code || '');
    if (!isAdmin && currentUser.id !== userId) {
      throw new Error('Unauthorized to view these statistics');
    }

    const [
      totalAssignedAssets,
      activeDeployments,
      assetValues,
      assetAges
    ] = await Promise.all([
      prisma.assetDeployment.count({
        where: {
          employeeId: userId,
          status: {
            in: [DeploymentStatus.DEPLOYED, DeploymentStatus.PENDING_ACCOUNTING_APPROVAL]
          }
        }
      }),
      prisma.assetDeployment.count({
        where: {
          employeeId: userId,
          status: DeploymentStatus.DEPLOYED
        }
      }),
      prisma.assetDeployment.findMany({
        where: {
          employeeId: userId,
          status: {
            in: [DeploymentStatus.DEPLOYED, DeploymentStatus.PENDING_ACCOUNTING_APPROVAL]
          }
        },
        include: {
          asset: {
            select: {
              purchasePrice: true,
              purchaseDate: true
            }
          }
        }
      }),
      prisma.assetDeployment.findMany({
        where: {
          employeeId: userId,
          status: DeploymentStatus.DEPLOYED
        },
        include: {
          asset: {
            select: {
              purchaseDate: true
            }
          }
        }
      })
    ]);

    const totalAssetValue = assetValues.reduce((sum, deployment) => {
      return sum + (deployment.asset.purchasePrice ? deployment.asset.purchasePrice.toNumber() : 0);
    }, 0);

    const currentDate = new Date();
    const totalAgeInDays = assetAges.reduce((sum, deployment) => {
      if (deployment.asset.purchaseDate) {
        const ageInDays = Math.floor(
          (currentDate.getTime() - deployment.asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + ageInDays;
      }
      return sum;
    }, 0);

    const averageAssetAge = assetAges.length > 0 ? totalAgeInDays / assetAges.length : 0;

    return serializeForClient({
      totalAssignedAssets,
      activeDeployments,
      totalAssetValue,
      averageAssetAge: Math.round(averageAssetAge)
    });
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    throw new Error('Failed to fetch profile statistics');
  }
}

export async function updateUserProfile(
  userId: string,
  data: {
    email?: string;
    position?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized' };
    }

    // Users can only update their own profile unless they're admin
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role?.code || '');
    if (!isAdmin && currentUser.id !== userId) {
      return { success: false, message: 'Unauthorized to update this profile' };
    }

    // Check if email already exists (if being updated)
    if (data.email) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { 
          email: data.email,
          isActive: true,
          id: { not: userId }
        }
      });

      if (existingEmployee) {
        return { success: false, message: 'Email already exists' };
      }
    }

    await prisma.employee.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE',
        tableName: 'Employee',
        recordId: userId,
        newValues: data,
        timestamp: new Date()
      }
    });

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, message: 'Failed to update profile' };
  }
}