// app/(dashboard)/[businessUnitId]/assets/inventory-verification/page.tsx
import { InventoryVerificationPage } from '@/components/assets/inventory-verification-page';

interface InventoryVerificationPageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function InventoryVerificationPageRoute({ params }: InventoryVerificationPageProps) {
  const { businessUnitId } = await params;
  return <InventoryVerificationPage businessUnitId={businessUnitId} />;
}