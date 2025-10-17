// app/(dashboard)/[businessUnitId]/assets/barcodes/page.tsx
import { AssetBarcodesPage } from '@/components/assets/asset-barcodes-page';

interface BarcodePageProps {
  params: Promise<{
    businessUnitId: string;
  }>;
}

export default async function BarcodePage({ params }: BarcodePageProps) {
  const { businessUnitId } = await params;
  return <AssetBarcodesPage businessUnitId={businessUnitId} />;
}