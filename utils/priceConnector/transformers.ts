// /utils/priceConnector/transformers.ts
// Data transformation utilities for price-station data

import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import { normalizeCityName } from '@/utils/g';
import { normalizeFuelType, isValidPrice } from '@/utils/formatters';
import { normalizeBrandName } from '../brandNormalization';

/**
 * Group stations by city for efficient lookup
 * @param stations Array of gas stations
 * @returns Object with city names as keys and arrays of stations as values
 */
export function groupStationsByCity(
  stations: GasStation[]
): Record<string, GasStation[]> {
  const stationsByCity: Record<string, GasStation[]> = {};

  stations.forEach((station) => {
    const city = normalizeCityName(station.city);
    if (!stationsByCity[city]) {
      stationsByCity[city] = [];
    }
    stationsByCity[city].push(station);
  });

  return stationsByCity;
}

/**
 * Group stations by brand and city for quicker lookup
 * @param stations Array of gas stations
 * @returns Object with brand_city keys and arrays of stations as values
 */
export function groupStationsByBrandAndCity(
  stations: GasStation[]
): Record<string, GasStation[]> {
  const stationMap: Record<string, GasStation[]> = {};

  stations.forEach((station) => {
    const normalizedBrand = normalizeBrandName(station.brand);
    const normalizedCity = normalizeCityName(station.city);
    const key = `${normalizedBrand}_${normalizedCity}`;

    if (!stationMap[key]) {
      stationMap[key] = [];
    }

    stationMap[key].push(station);
  });

  return stationMap;
}
/**
 * Group prices by week
 * @param prices Array of fuel prices
 * @returns Map with week keys and arrays of prices as values
 */
export function groupPricesByWeek(
  prices: FuelPrice[]
): Map<string, FuelPrice[]> {
  const pricesByWeek = new Map<string, FuelPrice[]>();

  prices.forEach((price) => {
    // Convert Date to string if needed
    const weekKey =
      typeof price.week_of === 'string'
        ? price.week_of
        : price.week_of.toISOString().split('T')[0]; // For Date objects

    if (!pricesByWeek.has(weekKey)) {
      pricesByWeek.set(weekKey, []);
    }
    pricesByWeek.get(weekKey)!.push(price);
  });

  return pricesByWeek;
}

/**
 * Find the best price for each week based on matched type and validity
 * @param pricesByWeek Map of prices grouped by week
 * @param normalizedType Normalized fuel type to match
 * @param exactArea Area to prefer for exact matches
 * @returns Array of best matching prices
 */
export function findBestPriceForEachWeek(
  pricesByWeek: Map<string, FuelPrice[]>,
  normalizedType: string,
  exactArea: string
): FuelPrice[] {
  const results: FuelPrice[] = [];

  pricesByWeek.forEach((weekPrices, week) => {
    // First pick by normalized fuel type
    const matchingPrices = weekPrices.filter(
      (p) => normalizeFuelType(p.fuel_type) === normalizedType
    );

    if (matchingPrices.length > 0) {
      // Take the first price with valid data
      const validPrices = matchingPrices.filter((p) =>
        isValidPrice(p.common_price)
      );

      if (validPrices.length > 0) {
        // Add the one with the most specific area match
        const exactAreaMatch = validPrices.find((p) => p.area === exactArea);
        if (exactAreaMatch) {
          results.push(exactAreaMatch);
        } else {
          // Otherwise take the first valid price
          results.push(validPrices[0]);
        }
      } else {
        // No valid prices, just take the first one
        results.push(matchingPrices[0]);
      }
    }
  });

  return results;
}

/**
 * Transform array of prices into a record keyed by normalized fuel type
 * @param prices Array of fuel prices
 * @returns Object with normalized fuel types as keys and arrays of prices as values
 */
export function groupPricesByNormalizedType(
  prices: FuelPrice[]
): Record<string, FuelPrice[]> {
  const result: Record<string, FuelPrice[]> = {};

  prices.forEach((price) => {
    const normalizedType = normalizeFuelType(price.fuel_type);

    if (!result[normalizedType]) {
      result[normalizedType] = [];
    }

    result[normalizedType].push(price);
  });

  return result;
}
