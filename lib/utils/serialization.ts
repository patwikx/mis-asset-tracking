// lib/utils/serialization.ts
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes Prisma objects for client components by converting Decimal fields to numbers
 */
export function serializeAsset(asset: any): any {
  const serialized = { ...asset };
  
  // Convert Decimal fields to numbers
  if (serialized.purchasePrice instanceof Decimal) {
    serialized.purchasePrice = serialized.purchasePrice.toNumber();
  }
  
  // Handle nested objects that might contain Decimals
  if (serialized.deployments && Array.isArray(serialized.deployments)) {
    serialized.deployments = serialized.deployments.map((deployment: any) => ({
      ...deployment,
      // Add any deployment-specific Decimal conversions here if needed
    }));
  }
  
  return serialized;
}

/**
 * Serializes an array of assets
 */
export function serializeAssets(assets: any[]): any[] {
  return assets.map(asset => serializeAsset(asset));
}

/**
 * Serializes deployment objects that contain asset data
 */
export function serializeDeployment(deployment: any): any {
  const serialized = { ...deployment };
  
  // Serialize the nested asset if it exists
  if (serialized.asset) {
    serialized.asset = serializeAsset(serialized.asset);
  }
  
  return serialized;
}

/**
 * Serializes an array of deployments
 */
export function serializeDeployments(deployments: any[]): any[] {
  return deployments.map(deployment => serializeDeployment(deployment));
}

/**
 * Generic function to serialize any object with potential Decimal fields
 */
export function serializeDecimalFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Decimal) {
    return obj.toNumber();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimalFields(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeDecimalFields(value);
    }
    return serialized;
  }
  
  return obj;
}