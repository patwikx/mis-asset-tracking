// lib/utils/serialization.ts
import { Decimal } from '@prisma/client/runtime/library';
import { Asset, AssetDeployment, AssetMaintenance } from '@prisma/client';
import { AssetWithRelations, AssetDeploymentWithRelations, DeploymentQueryResult } from '@/types/asset-types';

// Helper type to convert Decimal fields to number
type DecimalToNumber<T> = {
  [K in keyof T]: T[K] extends Decimal
    ? number
    : T[K] extends Decimal | null
    ? number | null
    : T[K] extends Decimal | undefined
    ? number | undefined
    : T[K] extends Decimal | null | undefined
    ? number | null | undefined
    : T[K];
};

// Helper type for nested object serialization
type SerializeNested<T> = T extends Decimal
  ? number
  : T extends Array<infer U>
  ? Array<SerializeNested<U>>
  : T extends object
  ? { [K in keyof T]: SerializeNested<T[K]> }
  : T;

// Type for serialized asset (Decimal fields converted to numbers)
export type SerializedAsset = DecimalToNumber<Asset>;

// Type for serialized asset with relations
export type SerializedAssetWithRelations = DecimalToNumber<
  Omit<AssetWithRelations, 'deployments'>
> & {
  deployments: SerializedAssetDeployment[];
};

// Type for serialized deployment (no Decimal fields, so same as original)
export type SerializedAssetDeployment = AssetDeployment;

// Type for serialized deployment with relations
export type SerializedAssetDeploymentWithRelations = Omit<
  AssetDeploymentWithRelations,
  'asset'
> & {
  asset: SerializedAsset & { 
    category: AssetDeploymentWithRelations['asset']['category'] 
  };
};

// Type for serialized deployment query result
export type SerializedDeploymentQueryResult = Omit<DeploymentQueryResult, 'asset'> & {
  asset: SerializedAsset & { 
    category: DeploymentQueryResult['asset']['category'] 
  };
};

// Type for serialized maintenance record
export type SerializedAssetMaintenance = DecimalToNumber<AssetMaintenance>;

/**
 * Converts a Decimal value to number, preserving null/undefined
 */
function convertDecimal(value: Decimal): number;
function convertDecimal(value: null): null;
function convertDecimal(value: undefined): undefined;
function convertDecimal(value: Decimal | null): number | null;
function convertDecimal(value: Decimal | undefined): number | undefined;
function convertDecimal(value: Decimal | null | undefined): number | null | undefined;
function convertDecimal(value: Decimal | null | undefined): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value instanceof Decimal) return value.toNumber();
  return value;
}

/**
 * Serializes Prisma objects for client components by converting Decimal fields to numbers
 */
export function serializeAsset(asset: Asset): SerializedAsset {
  return {
    ...asset,
    purchasePrice: convertDecimal(asset.purchasePrice),
  };
}

/**
 * Serializes an asset with relations
 */
export function serializeAssetWithRelations(asset: AssetWithRelations): SerializedAssetWithRelations {
  return {
    ...asset,
    purchasePrice: convertDecimal(asset.purchasePrice),
    deployments: asset.deployments.map(deployment => serializeDeployment(deployment)),
  };
}

/**
 * Serializes an array of assets
 */
export function serializeAssets(assets: Asset[]): SerializedAsset[] {
  return assets.map(asset => serializeAsset(asset));
}

/**
 * Serializes deployment objects that contain asset data
 */
export function serializeDeployment(deployment: AssetDeployment): SerializedAssetDeployment {
  // Deployments don't have Decimal fields, so just return as-is
  return { ...deployment };
}

/**
 * Serializes deployment with relations (includes asset data)
 */
export function serializeDeploymentWithRelations(
  deployment: AssetDeploymentWithRelations
): SerializedAssetDeploymentWithRelations {
  return {
    ...deployment,
    asset: {
      ...deployment.asset,
      purchasePrice: convertDecimal(deployment.asset.purchasePrice),
    },
  };
}

/**
 * Serializes deployment query result
 */
export function serializeDeploymentQueryResult(
  deployment: DeploymentQueryResult
): SerializedDeploymentQueryResult {
  return {
    ...deployment,
    asset: {
      ...deployment.asset,
      purchasePrice: convertDecimal(deployment.asset.purchasePrice),
    },
  };
}

/**
 * Serializes an array of deployments
 */
export function serializeDeployments(deployments: AssetDeployment[]): SerializedAssetDeployment[] {
  return deployments.map(deployment => serializeDeployment(deployment));
}

/**
 * Serializes an array of deployments with relations
 */
export function serializeDeploymentsWithRelations(
  deployments: AssetDeploymentWithRelations[]
): SerializedAssetDeploymentWithRelations[] {
  return deployments.map(deployment => serializeDeploymentWithRelations(deployment));
}

/**
 * Serializes maintenance record
 */
export function serializeAssetMaintenance(maintenance: AssetMaintenance): SerializedAssetMaintenance {
  return {
    ...maintenance,
    cost: convertDecimal(maintenance.cost),
  };
}

/**
 * Serializes an array of maintenance records
 */
export function serializeAssetMaintenances(
  maintenances: AssetMaintenance[]
): SerializedAssetMaintenance[] {
  return maintenances.map(maintenance => serializeAssetMaintenance(maintenance));
}

/**
 * Deep serialization function for complex nested objects with Decimal fields
 * This is a type-safe alternative to the previous generic approach
 */
export function deepSerializeDecimals<T>(obj: T): SerializeNested<T> {
  if (obj === null || obj === undefined) {
    return obj as SerializeNested<T>;
  }
  
  if (obj instanceof Decimal) {
    return obj.toNumber() as SerializeNested<T>;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerializeDecimals(item)) as SerializeNested<T>;
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const serialized = {} as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = deepSerializeDecimals(value);
    }
    return serialized as SerializeNested<T>;
  }
  
  // For other objects (Date, custom classes, etc.), return as-is
  return obj as SerializeNested<T>;
}

/**
 * Type guard to check if a value is a Decimal
 */
export function isDecimal(value: unknown): value is Decimal {
  return value instanceof Decimal;
}

/**
 * Utility type to extract decimal field names from a type
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DecimalFields<T> = {
  [K in keyof T]: T[K] extends Decimal | null | undefined ? K : never;
}[keyof T];

/**
 * Helper function to get decimal field names from an object
 * Useful for debugging or validation
 */
export function getDecimalFields<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj).filter(key => isDecimal(obj[key])) as (keyof T)[];
}