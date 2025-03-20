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
 * Determines if a price has valid common price data for comparison
 * @param price Price object to check
 * @returns Boolean indicating if the price has valid common price
 */
function hasValidCommonPrice(price: ExtendedFuelPrice | undefined): boolean {
  return !!price && isValidPrice(price.common_price);
}

/**
 * Determines if a price has valid minimum price data
 * @param price Price object to check
 * @returns Boolean indicating if price has valid min price
 */
function hasValidMinPrice(price: FuelPrice): boolean {
  return isValidPrice(price.min_price);
}

/**
 * Determines if a price has valid maximum price data
 * @param price Price object to check
 * @returns Boolean indicating if price has valid max price
 */
function hasValidMaxPrice(price: FuelPrice): boolean {
  return isValidPrice(price.max_price);
}

/**
 * Checks if both prices have valid data and the new one has sufficient confidence
 * @param existing Existing price in the map
 * @param newPrice New price being considered
 * @param confidence Confidence score for the new price
 * @returns Boolean indicating if the new price should replace based on confidence
 */
function hasHigherConfidence(
  existing: ExtendedFuelPrice,
  newPrice: ExtendedFuelPrice,
  confidence: number
): boolean {
  // Check if both prices have valid data
  const bothHaveValidData =
    hasValidCommonPrice(existing) && hasValidCommonPrice(newPrice);

  // If both have data, check confidence threshold
  if (!bothHaveValidData) {
    return false;
  }

  // Check if confidence exceeds threshold
  return confidence > 0.8;
}

/**
 * Determines if a new price should replace an existing one based on priorities:
 * 1. Add if no existing price for this fuel type
 * 2. Replace if new price has valid data but existing doesn't
 * 3. Replace if both have valid data but new one has higher confidence
 *
 * @param existing The existing price in the map (if any)
 * @param newPrice The new price being considered
 * @param confidence Confidence score for the new price
 * @returns Boolean indicating if replacement should occur
 */
function shouldReplacePrice(
  existing: ExtendedFuelPrice | undefined,
  newPrice: ExtendedFuelPrice,
  confidence: number
): boolean {
  // Case 1: No existing price for this fuel type
  if (!existing) return true;

  // Case 2: New price has valid data but existing doesn't
  const existingHasValidPrice = hasValidCommonPrice(existing);
  const newHasValidPrice = hasValidCommonPrice(newPrice);

  if (!existingHasValidPrice && newHasValidPrice) return true;

  // Case 3: Both have valid data but new one has higher confidence
  return hasHigherConfidence(existing, newPrice, confidence);
}

/**
 * Creates an ExtendedFuelPrice object from a price object or match result
 *
 * @param price Raw price or match result object
 * @returns ExtendedFuelPrice with display and normalized type information
 */
function createExtendedPrice(price: any): ExtendedFuelPrice {
  // Handle both raw price objects and match results
  const priceObj = price.price ? price.price : price;
  const normalized = normalizeFuelType(priceObj.fuel_type);

  return {
    ...priceObj,
    display_type: getShortFuelTypeName(priceObj.fuel_type),
    normalized_type: normalized,
  };
}

/**
 * Sorts deduplicated prices by fuel category first, then by specific variant
 *
 * @param prices Array of ExtendedFuelPrice objects to sort
 * @returns Sorted array of prices
 */
function sortDeduplicatedPrices(
  prices: ExtendedFuelPrice[]
): ExtendedFuelPrice[] {
  return prices.sort((a, b) => {
    // First sort by fuel category (Diesel, Gasoline, etc.)
    const aType = a.normalized_type?.split(' ')[0] || '';
    const bType = b.normalized_type?.split(' ')[0] || '';

    if (aType !== bType) return aType.localeCompare(bType);

    // Then by specific fuel type (RON 91, RON 95, etc.)
    return a.fuel_type.localeCompare(b.fuel_type);
  });
}

/**
 * Deduplicates an array of prices by normalized fuel type with the following priority:
 * 1. Prices with valid data (non-zero) are prioritized over invalid ones
 * 2. When both prices have valid data, higher confidence scores take precedence
 * 3. Results are sorted by fuel category first, then by specific variant
 *
 * @param prices Array of prices to deduplicate (raw prices or match results)
 * @param matchConfidence Default confidence score for matches without explicit confidence
 * @returns Array of deduplicated prices, sorted consistently by fuel type
 */
export function deduplicatePrices(
  prices: FuelPrice[] | any[],
  matchConfidence = 0
): ExtendedFuelPrice[] {
  // Handle empty input
  if (!prices || prices.length === 0) return [];

  // Create a map to deduplicate by normalized fuel type
  const fuelTypeMap = new Map<string, ExtendedFuelPrice>();

  // Process and deduplicate prices
  prices.forEach((price) => {
    const confidence =
      typeof price.matchConfidence === 'number'
        ? price.matchConfidence
        : matchConfidence;

    const extendedPrice = createExtendedPrice(price);
    const normalizedType = extendedPrice.normalized_type as string;

    // Check if we should add/replace this price
    if (
      shouldReplacePrice(
        fuelTypeMap.get(normalizedType),
        extendedPrice,
        confidence
      )
    ) {
      fuelTypeMap.set(normalizedType, extendedPrice);
    }
  });

  // Convert map back to array and sort
  return sortDeduplicatedPrices(Array.from(fuelTypeMap.values()));
}

/**
 * Determines if a price object has any valid price data
 *
 * @param price The price object to check
 * @returns Boolean indicating if the price has any valid data
 */
export function hasValidPriceData(price: FuelPrice): boolean {
  // Check min price
  if (hasValidMinPrice(price)) {
    return true;
  }

  // Check common price
  if (isValidPrice(price.common_price)) {
    return true;
  }

  // Check max price
  return hasValidMaxPrice(price);
}

/**
 * Counts prices with valid (non-zero, non-null) data
 *
 * @param prices Array of prices to check
 * @returns Number of prices with valid data
 */
export function countValidPrices(prices: FuelPrice[]): number {
  return prices.filter((price) => hasValidPriceData(price)).length;
}
