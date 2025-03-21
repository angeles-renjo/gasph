// /utils/priceConnector/sorters.ts - Refactored version

import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import {
  PriceMatchResult,
  MatchedPriceStation,
} from '@/utils/priceStationConnector';
import { isValidPrice, normalizeFuelType } from '@/utils/formatters';

/**
 * Sort prices with valid ones first, then by fuel type
 */
export function sortPricesByValidityAndType(prices: FuelPrice[]): FuelPrice[] {
  return [...prices].sort((a, b) => {
    // First prioritize by price validity
    const aValid = isValidPrice(a.common_price);
    const bValid = isValidPrice(b.common_price);

    if (aValid !== bValid) {
      return aValid ? -1 : 1;
    }

    // If both valid or both invalid, sort by fuel type
    return a.fuel_type.localeCompare(b.fuel_type);
  });
}

/**
 * Sort price match results with valid ones first, then by price value
 */
export function sortPriceResults(
  results: PriceMatchResult[]
): PriceMatchResult[] {
  return [...results].sort((a, b) => {
    // First prioritize valid prices
    const aValid = isValidPrice(a.price.common_price);
    const bValid = isValidPrice(b.price.common_price);

    if (aValid !== bValid) {
      return aValid ? -1 : 1;
    }

    // For valid prices, sort by price value
    if (aValid && bValid) {
      return a.price.common_price - b.price.common_price;
    }

    // For invalid prices, sort by match confidence
    return b.matchConfidence - a.matchConfidence;
  });
}

/**
 * Determines if a new price result should replace an existing one
 */
function shouldReplacePriceResult(
  existing: PriceMatchResult | undefined,
  newResult: PriceMatchResult
): boolean {
  // If no existing result, always add the new one
  if (!existing) {
    return true;
  }

  // Check if new result has valid price but existing doesn't
  const existingHasValidPrice = isValidPrice(existing.price.common_price);
  const newHasValidPrice = isValidPrice(newResult.price.common_price);

  if (newHasValidPrice && !existingHasValidPrice) {
    return true;
  }

  // If both have valid prices or both don't, compare confidence
  return newResult.matchConfidence > existing.matchConfidence;
}

/**
 * Deduplicate price results by normalized fuel type
 */
export function deduplicateByFuelType(
  results: PriceMatchResult[]
): PriceMatchResult[] {
  const fuelTypeMap = new Map<string, PriceMatchResult>();

  results.forEach((result) => {
    const normalizedType = normalizeFuelType(result.price.fuel_type);
    const existing = fuelTypeMap.get(normalizedType);

    if (shouldReplacePriceResult(existing, result)) {
      fuelTypeMap.set(normalizedType, result);
    }
  });

  // Convert map back to array
  return Array.from(fuelTypeMap.values());
}

/**
 * Compare fuel types for sorting
 */
function compareFuelTypes(a: PriceMatchResult, b: PriceMatchResult): number {
  // First prioritize valid prices
  const aValid = isValidPrice(a.price.common_price);
  const bValid = isValidPrice(b.price.common_price);

  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }

  // Then sort by fuel category and type
  const aType = normalizeFuelType(a.price.fuel_type).split(' ')[0];
  const bType = normalizeFuelType(b.price.fuel_type).split(' ')[0];

  if (aType !== bType) {
    return aType.localeCompare(bType);
  }

  // Then by specific fuel type
  return a.price.fuel_type.localeCompare(b.price.fuel_type);
}

/**
 * Sort deduplicated results by fuel category then specific type
 */
export function sortDeduplicatedResults(
  results: PriceMatchResult[]
): PriceMatchResult[] {
  return [...results].sort(compareFuelTypes);
}

/**
 * Sort matched stations by price validity then confidence
 */
export function sortMatchedStations(
  matches: MatchedPriceStation[]
): MatchedPriceStation[] {
  return [...matches].sort((a, b) => {
    // First prioritize by price validity
    const aValid = isValidPrice(a.price.common_price);
    const bValid = isValidPrice(b.price.common_price);

    if (aValid !== bValid) {
      return aValid ? -1 : 1;
    }

    // Then by confidence
    return b.confidence - a.confidence;
  });
}

/**
 * Deduplicate matches by station ID
 */
export function deduplicateByStation(
  matches: MatchedPriceStation[]
): MatchedPriceStation[] {
  if (matches.length === 0) {
    return matches;
  }

  const stationIds = new Set<string>();
  const dedupedMatches: MatchedPriceStation[] = [];

  matches.forEach((match) => {
    if (match.station) {
      // Only add if we haven't seen this station already
      if (!stationIds.has(match.station.id)) {
        stationIds.add(match.station.id);
        dedupedMatches.push(match);
      }
    } else {
      // Always add entries that don't have stations
      dedupedMatches.push(match);
    }
  });

  return dedupedMatches;
}

/**
 * Filter out valid price matches from an array
 */
function getValidMatches(matches: PriceMatchResult[]): PriceMatchResult[] {
  return matches.filter((m) => isValidPrice(m.price.common_price));
}

/**
 * Process matches for a fuel type, limiting to max results
 */
export function processMatchesForFuelType(
  matches: PriceMatchResult[],
  maxResults: number = 5
): PriceMatchResult[] {
  // Sort matches
  const sortedMatches = sortPriceResults(matches);

  // Get valid matches
  const validMatches = getValidMatches(sortedMatches);

  // If we have enough valid matches or few total matches, just return top N
  if (validMatches.length >= 3 || sortedMatches.length <= maxResults) {
    return sortedMatches.slice(0, maxResults);
  }

  // Get invalid matches (those with no valid price)
  const invalidMatches = sortedMatches.filter(
    (m) => !isValidPrice(m.price.common_price)
  );

  // Combine valid matches with some invalid ones to reach max total
  return [
    ...validMatches,
    ...invalidMatches.slice(0, maxResults - validMatches.length),
  ];
}

/**
 * Sort prices by week descending
 */
export function sortPricesByWeekDescending(prices: FuelPrice[]): FuelPrice[] {
  return [...prices].sort((a, b) => {
    return new Date(b.week_of).getTime() - new Date(a.week_of).getTime();
  });
}
