# Decimal Serialization Guide

## Problem
Prisma's `Decimal` type cannot be passed directly from Server Components to Client Components in Next.js. This causes the error:
```
Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.
```

## Solution
Always serialize data containing Decimal fields before returning from server actions.

## Usage

### For Server Actions
Use `serializeForClient()` to wrap any return value that might contain Prisma objects:

```typescript
import { serializeForClient } from '@/lib/utils/server-client-bridge';

export async function getAssets() {
  const assets = await prisma.asset.findMany({
    // ... query
  });
  
  // ✅ Correct - serialize before returning
  return serializeForClient(assets);
  
  // ❌ Wrong - will cause Decimal error
  // return assets;
}
```

### For Complex Return Objects
```typescript
export async function getAssetsWithPagination() {
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({}),
    prisma.asset.count({})
  ]);
  
  // ✅ Serialize the entire response object
  return serializeForClient({
    data: assets,
    pagination: { total, page: 1, limit: 10 }
  });
}
```

## Fields That Need Serialization
- `purchasePrice` (Decimal)
- Any other Decimal fields in your schema
- Nested objects containing Decimal fields

## Prevention
1. Always use `serializeForClient()` in server actions that return Prisma objects
2. The utility automatically handles nested objects and arrays
3. It also converts Dates to ISO strings for consistency

## Files Updated
- `lib/actions/asset-actions.ts` - Asset-related server actions
- `lib/actions/deployment-actions.ts` - Deployment-related server actions
- `lib/utils/server-client-bridge.ts` - Serialization utilities

## Testing
Test your server actions by calling them from client components to ensure no Decimal errors occur.