// Update in interfaces where needed

// In hooks/useBestPrices.ts
export interface BestPriceItem {
  id: string;
  fuelType: string;
  price: number;
  brand: string;
  stationName: string;
  stationId: string;
  area: string;
  distance?: number;
  source: 'doe' | 'community'; // Keep source
  confidence?: number; // Keep internally but don't display
  // Remove confidenceLevel field
}

// In components/price/PriceCard.tsx
interface PriceCardProps {
  fuelType: string;
  communityPrice: number | null;
  doeData: {
    minPrice: number | null;
    maxPrice: number | null;
    commonPrice: number | null;
    // Remove matchConfidence field
  } | null;
  verificationData?: {
    confirmedCount: number;
    disputedCount: number;
    lastUpdated: string;
    reporterName?: string;
  } | null;
  onConfirm?: () => void;
  onDispute?: () => void;
  onUpdate?: () => void;
}
