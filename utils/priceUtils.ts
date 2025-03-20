// utils/priceUtils.ts
import { FuelPrice } from '@/core/models/FuelPrice';
import {
  normalizeFuelType,
  getShortFuelTypeName,
  isValidPrice,
} from '@/utils/formatters';

// Extended FuelPrice type to include display properties
export interface ExtendedFuelPrice extends FuelPrice {
  display_type?: string;
  normalized_type?: string;
}

/**
 * Deduplicates an array of prices by normalized fuel type
 * Prioritizes prices with valid data and higher confidence scores
 *
 * @param prices Array of prices to deduplicate
 * @param matchConfidence Optional confidence score for matched prices
 * @returns Array of deduplicated prices, sorted by fuel type
 */
export function deduplicatePrices(
  prices: FuelPrice[] | any[],
  matchConfidence = 0
): ExtendedFuelPrice[] {
  if (!prices || prices.length === 0) return [];

  // Create a map to deduplicate by normalized fuel type
  const fuelTypeMap = new Map<string, ExtendedFuelPrice>();

  // Process and deduplicate prices
  prices.forEach((price) => {
    // Handle both raw price objects and match results
    const priceObj = price.price ? price.price : price;
    const confidence = price.matchConfidence || matchConfidence;

    const normalized = normalizeFuelType(priceObj.fuel_type);

    // Create extended price with normalized type
    const extendedPrice: ExtendedFuelPrice = {
      ...priceObj,
      display_type: getShortFuelTypeName(priceObj.fuel_type),
      normalized_type: normalized,
    };

    // Only add or replace if:
    // 1. We don't have this fuel type yet, or
    // 2. This price has valid data but existing one doesn't, or
    // 3. Both have valid data but this one has higher confidence
    if (
      !fuelTypeMap.has(normalized) ||
      // Prioritize prices with valid common price
      (!isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
        isValidPrice(extendedPrice.common_price)) ||
      // If both valid, use the one with higher confidence
      (isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
        isValidPrice(extendedPrice.common_price) &&
        confidence > 0.8)
    ) {
      fuelTypeMap.set(normalized, extendedPrice);
    }
  });

  // Convert map back to array and sort
  const dedupedPrices = Array.from(fuelTypeMap.values());

  // Sort by fuel category first, then by specific fuel type
  dedupedPrices.sort((a, b) => {
    // First sort by fuel category (Diesel, Gasoline, etc.)
    const aType = a.normalized_type?.split(' ')[0] || '';
    const bType = b.normalized_type?.split(' ')[0] || '';

    if (aType !== bType) return aType.localeCompare(bType);

    // Then by specific fuel type (RON 91, RON 95, etc.)
    return a.fuel_type.localeCompare(b.fuel_type);
  });

  return dedupedPrices;
}

/**
 * Counts prices with valid (non-zero, non-null) data
 *
 * @param prices Array of prices to check
 * @returns Number of prices with valid data
 */
export function countValidPrices(prices: FuelPrice[]): number {
  return prices.filter(
    (price) =>
      isValidPrice(price.min_price) ||
      isValidPrice(price.common_price) ||
      isValidPrice(price.max_price)
  ).length;
}

/**
 * Determines if a price object has any valid price data
 *
 * @param price The price object to check
 * @returns Boolean indicating if the price has any valid data
 */
export function hasValidPriceData(price: FuelPrice): boolean {
  return (
    isValidPrice(price.min_price) ||
    isValidPrice(price.common_price) ||
    isValidPrice(price.max_price)
  );
}
