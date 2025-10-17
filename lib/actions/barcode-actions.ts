// lib/actions/barcode-actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { redirect } from 'next/navigation';
import { AssetStatus } from '@prisma/client';
import type {
  AssetBarcode,
  ScanResult,
  AssetLookupResult,
  InventoryVerification,
  VerificationItem,
  BarcodeGenerationRequest,
  QuickLookupFilters,
  BarcodeSettings
} from '@/types/barcode-types';


export async function generateBarcodesForAssets(
  businessUnitId: string,
  request: BarcodeGenerationRequest
): Promise<{ success: boolean; generatedAssets: AssetBarcode[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    // Verify assets exist and belong to business unit
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: request.assetIds },
        businessUnitId
      },
      select: { 
        id: true, 
        itemCode: true,
        barcodeValue: true
      }
    });

    if (assets.length !== request.assetIds.length) {
      return {
        success: false,
        generatedAssets: [],
        error: 'Some assets not found or do not belong to this business unit'
      };
    }

    // Check for assets that already have barcodes
    const assetsWithBarcodes = assets.filter(asset => asset.barcodeValue);
    if (assetsWithBarcodes.length > 0) {
      const assetCodes = assetsWithBarcodes.map(asset => asset.itemCode).join(', ');
      return {
        success: false,
        generatedAssets: [],
        error: `The following assets already have barcodes: ${assetCodes}. Use replace option if needed.`
      };
    }

    const generatedAssets: AssetBarcode[] = [];

    // Generate barcodes for each asset
    for (const asset of assets) {
      const tagNumber = `TAG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const barcodeValue = `${asset.itemCode}-${request.barcodeType}-${Date.now()}`;

      // Update asset with barcode information
      const updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          barcodeValue,
          barcodeType: request.barcodeType,
          barcodeGenerated: new Date(),
          tagNumber
        }
      });

      generatedAssets.push({
        barcodeValue: updatedAsset.barcodeValue!,
        barcodeType: updatedAsset.barcodeType as AssetBarcode['barcodeType'],
        barcodeGenerated: updatedAsset.barcodeGenerated!,
        tagNumber: updatedAsset.tagNumber!
      });
    }

    return {
      success: true,
      generatedAssets
    };
  } catch (error) {
    console.error('Error generating barcodes:', error);
    return {
      success: false,
      generatedAssets: [],
      error: 'Failed to generate barcodes'
    };
  }
}

export async function scanBarcode(
  businessUnitId: string,
  scannedValue: string,
  scannedBy: string
): Promise<ScanResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    // Look up asset by barcode value
    const asset = await prisma.asset.findFirst({
      where: {
        barcodeValue: scannedValue,
        businessUnitId
      },
      include: {
        category: true,
        deployments: {
          where: {
            status: 'DEPLOYED'
          },
          include: {
            employee: true
          },
          take: 1,
          orderBy: {
            deployedDate: 'desc'
          }
        }
      }
    });

    if (!asset) {
      return {
        success: false,
        scannedValue,
        scanTimestamp: new Date(),
        scannedBy,
        error: 'Barcode not found'
      };
    }

    // Create scan log entry
    await prisma.barcodeScanLog.create({
      data: {
        assetId: asset.id,
        scannedValue,
        scannedBy,
        businessUnitId
      }
    });

    const currentDeployment = asset.deployments[0];

    return {
      success: true,
      scannedValue,
      assetId: asset.id,
      asset: {
        id: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        currentLocation: asset.location || undefined,
        assignedTo: currentDeployment?.employee ? `${currentDeployment.employee.firstName} ${currentDeployment.employee.lastName}` : undefined,
        status: asset.status
      },
      scanTimestamp: new Date(),
      scannedBy
    };
  } catch (error) {
    console.error('Error scanning barcode:', error);
    return {
      success: false,
      scannedValue,
      scanTimestamp: new Date(),
      scannedBy,
      error: 'Failed to process scan'
    };
  }
}

export async function quickAssetLookup(
  businessUnitId: string,
  filters: QuickLookupFilters
): Promise<AssetLookupResult[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    const whereClause = {
      businessUnitId,
      ...(filters.searchTerm && {
        OR: [
          { itemCode: { contains: filters.searchTerm, mode: 'insensitive' as const } },
          { description: { contains: filters.searchTerm, mode: 'insensitive' as const } }
        ]
      }),
      ...(filters.category && {
        category: { name: filters.category }
      }),
      ...(filters.status && {
        status: filters.status as AssetStatus
      }),
      ...(filters.location && {
        location: { contains: filters.location, mode: 'insensitive' as const }
      }),
      ...(filters.hasBarcode !== undefined && {
        barcodeValue: filters.hasBarcode ? { not: null } : null
      }),
      ...(filters.dateRange && {
        createdAt: {
          gte: filters.dateRange.from,
          lte: filters.dateRange.to
        }
      })
    };

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        category: true,
        deployments: {
          where: {
            status: 'DEPLOYED'
          },
          include: {
            employee: true
          },
          take: 1,
          orderBy: {
            deployedDate: 'desc'
          }
        }
      },
      take: 50, // Limit results for performance
      orderBy: { itemCode: 'asc' }
    });

    return assets.map(asset => {
      const currentDeployment = asset.deployments[0];
      return {
        id: asset.id,
        itemCode: asset.itemCode,
        description: asset.description,
        category: asset.category.name,
        currentLocation: asset.location || undefined,
        assignedTo: currentDeployment?.employee 
          ? `${currentDeployment.employee.firstName} ${currentDeployment.employee.lastName}`
          : undefined,
        status: asset.status,
        barcodeValue: asset.barcodeValue || undefined,
        barcodeType: asset.barcodeType || undefined,
        tagNumber: asset.tagNumber || undefined
      };
    });
  } catch (error) {
    console.error('Error in quick asset lookup:', error);
    return [];
  }
}

export async function createInventoryVerification(
  businessUnitId: string,
  verification: Omit<InventoryVerification, 'id' | 'totalAssets' | 'scannedAssets' | 'verifiedAssets' | 'discrepancies'>
): Promise<{ success: boolean; verification?: InventoryVerification; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    // Count total assets that match the verification criteria
    const totalAssets = await prisma.asset.count({
      where: {
        businessUnitId,
        ...(verification.locations.length > 0 && {
          location: { in: verification.locations }
        }),
        ...(verification.categories.length > 0 && {
          category: {
            name: { in: verification.categories }
          }
        })
      }
    });

    // Create the verification record
    const createdVerification = await prisma.inventoryVerification.create({
      data: {
        businessUnitId,
        verificationName: verification.verificationName,
        description: verification.description,
        startDate: verification.startDate,
        endDate: verification.endDate,
        status: verification.status,
        totalAssets,
        scannedAssets: 0,
        verifiedAssets: 0,
        discrepancies: 0,
        createdBy: user.id,
        assignedTo: verification.assignedTo,
        locations: verification.locations,
        categories: verification.categories
      }
    });

    // Create verification items for all matching assets
    const assets = await prisma.asset.findMany({
      where: {
        businessUnitId,
        ...(verification.locations.length > 0 && {
          location: { in: verification.locations }
        }),
        ...(verification.categories.length > 0 && {
          category: {
            name: { in: verification.categories }
          }
        })
      },
      include: {
        deployments: {
          where: {
            status: 'DEPLOYED'
          },
          include: {
            employee: true
          },
          take: 1,
          orderBy: {
            deployedDate: 'desc'
          }
        }
      }
    });

    const verificationItems = assets.map(asset => {
      const currentDeployment = asset.deployments[0];
      return {
        verificationId: createdVerification.id,
        assetId: asset.id,
        expectedLocation: asset.location || 'Unknown',
        expectedAssignee: currentDeployment?.employee 
          ? `${currentDeployment.employee.firstName} ${currentDeployment.employee.lastName}`
          : undefined,
        status: 'PENDING' as const
      };
    });

    await prisma.verificationItem.createMany({
      data: verificationItems
    });

    return {
      success: true,
      verification: {
        id: createdVerification.id,
        businessUnitId: createdVerification.businessUnitId,
        verificationName: createdVerification.verificationName,
        description: createdVerification.description || undefined,
        startDate: createdVerification.startDate,
        endDate: createdVerification.endDate || undefined,
        status: createdVerification.status as InventoryVerification['status'],
        totalAssets: createdVerification.totalAssets,
        scannedAssets: createdVerification.scannedAssets,
        verifiedAssets: createdVerification.verifiedAssets,
        discrepancies: createdVerification.discrepancies,
        createdBy: createdVerification.createdBy,
        assignedTo: createdVerification.assignedTo,
        locations: createdVerification.locations,
        categories: createdVerification.categories
      }
    };
  } catch (error) {
    console.error('Error creating inventory verification:', error);
    return {
      success: false,
      error: 'Failed to create inventory verification'
    };
  }
}

export async function getInventoryVerifications(
  businessUnitId: string
): Promise<InventoryVerification[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    const verifications = await prisma.inventoryVerification.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'desc' }
    });

    return verifications.map(v => ({
      id: v.id,
      businessUnitId: v.businessUnitId,
      verificationName: v.verificationName,
      description: v.description || undefined,
      startDate: v.startDate,
      endDate: v.endDate || undefined,
      status: v.status as InventoryVerification['status'],
      totalAssets: v.totalAssets,
      scannedAssets: v.scannedAssets,
      verifiedAssets: v.verifiedAssets,
      discrepancies: v.discrepancies,
      createdBy: v.createdBy,
      assignedTo: v.assignedTo,
      locations: v.locations,
      categories: v.categories
    }));
  } catch (error) {
    console.error('Error fetching inventory verifications:', error);
    return [];
  }
}

export async function getVerificationItems(
  verificationId: string
): Promise<VerificationItem[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    const items = await prisma.verificationItem.findMany({
      where: { verificationId },
      orderBy: { createdAt: 'asc' }
    });

    return items.map(item => ({
      id: item.id,
      verificationId: item.verificationId,
      assetId: item.assetId,
      expectedLocation: item.expectedLocation,
      actualLocation: item.actualLocation || undefined,
      expectedAssignee: item.expectedAssignee || undefined,
      actualAssignee: item.actualAssignee || undefined,
      scannedAt: item.scannedAt || undefined,
      scannedBy: item.scannedBy || undefined,
      status: item.status as VerificationItem['status'],
      notes: item.notes || undefined,
      photos: item.photos || undefined
    }));
  } catch (error) {
    console.error('Error fetching verification items:', error);
    return [];
  }
}

export async function updateVerificationItem(
  itemId: string,
  updates: Partial<VerificationItem>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    await prisma.verificationItem.update({
      where: { id: itemId },
      data: {
        ...(updates.actualLocation && { actualLocation: updates.actualLocation }),
        ...(updates.actualAssignee && { actualAssignee: updates.actualAssignee }),
        ...(updates.scannedAt && { scannedAt: updates.scannedAt }),
        ...(updates.scannedBy && { scannedBy: updates.scannedBy }),
        ...(updates.status && { status: updates.status }),
        ...(updates.notes && { notes: updates.notes }),
        ...(updates.photos && { photos: updates.photos }),
        updatedAt: new Date()
      }
    });

    // Update verification summary counts
    if (updates.status) {
      const verification = await prisma.verificationItem.findUnique({
        where: { id: itemId },
        select: { verificationId: true }
      });

      if (verification) {
        const counts = await prisma.verificationItem.groupBy({
          by: ['status'],
          where: { verificationId: verification.verificationId },
          _count: { status: true }
        });

        const scannedAssets = counts
          .filter(c => ['VERIFIED', 'DISCREPANCY'].includes(c.status))
          .reduce((sum, c) => sum + c._count.status, 0);

        const verifiedAssets = counts
          .find(c => c.status === 'VERIFIED')?._count.status || 0;

        const discrepancies = counts
          .find(c => c.status === 'DISCREPANCY')?._count.status || 0;

        await prisma.inventoryVerification.update({
          where: { id: verification.verificationId },
          data: {
            scannedAssets,
            verifiedAssets,
            discrepancies
          }
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating verification item:', error);
    return {
      success: false,
      error: 'Failed to update verification item'
    };
  }
}

export async function getBarcodeSettings(
  businessUnitId: string
): Promise<BarcodeSettings> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    const settings = await prisma.barcodeSettings.findUnique({
      where: { businessUnitId }
    });

    if (!settings) {
      // Return default settings if none exist
      return {
        defaultBarcodeType: 'QR_CODE',
        includeCompanyLogo: false,
        autoGenerateOnAssetCreation: false,
        barcodePrefix: 'AST'
      };
    }

    return {
      defaultBarcodeType: settings.defaultBarcodeType as BarcodeSettings['defaultBarcodeType'],
      includeCompanyLogo: settings.includeCompanyLogo,
      autoGenerateOnAssetCreation: settings.autoGenerateOnAssetCreation,
      barcodePrefix: settings.barcodePrefix
    };
  } catch (error) {
    console.error('Error fetching barcode settings:', error);
    return {
      defaultBarcodeType: 'QR_CODE',
      includeCompanyLogo: false,
      autoGenerateOnAssetCreation: false,
      barcodePrefix: 'AST'
    };
  }
}



export async function updateBarcodeSettings(
  businessUnitId: string,
  settings: BarcodeSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/login');
    }

    await prisma.barcodeSettings.upsert({
      where: { businessUnitId },
      update: {
        defaultBarcodeType: settings.defaultBarcodeType,
        includeCompanyLogo: settings.includeCompanyLogo,
        autoGenerateOnAssetCreation: settings.autoGenerateOnAssetCreation,
        barcodePrefix: settings.barcodePrefix,
        updatedAt: new Date()
      },
      create: {
        businessUnitId,
        defaultBarcodeType: settings.defaultBarcodeType,
        includeCompanyLogo: settings.includeCompanyLogo,
        autoGenerateOnAssetCreation: settings.autoGenerateOnAssetCreation,
        barcodePrefix: settings.barcodePrefix
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating barcode settings:', error);
    return {
      success: false,
      error: 'Failed to update barcode settings'
    };
  }
}