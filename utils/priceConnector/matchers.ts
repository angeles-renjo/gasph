// /utils/priceConnector/matchers.ts
// Functions for matching prices with stations

import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import {
  normalizeBrandName,
  calculateBrandSimilarity,
} from '@/utils/brandNormalization';
import { normalizeCityName } from '@/utils/areaMapping';
import {
  calculatePriceStationMatchConfidence,
  isPriceStationMatchValid,
} from '@/utils/priceWeighting';
import { isValidPrice } from '@/utils/formatters';
import {
  AreaName,
  CityName,
  ConfidenceScore,
  GroupedStations,
  NCR_CITIES,
  NCR_AREAS,
  NormalizedString,
  PriceStationMatch,
  ProvinceName,
  StationMatch,
} from './types';

/**
 * Determine if a city is in NCR region
 * @param city City name to check
 * @returns Boolean indicating if city is in NCR
 */
export function isNCRCity(city: CityName): boolean {
  return NCR_CITIES.includes(city.toLowerCase() as any);
}

/**
 * Check if an area name refers to the NCR region
 * @param area Area name to check
 * @returns Boolean indicating if the area is NCR
 */
export function isNCRArea(area: AreaName): boolean {
  return NCR_AREAS.includes(area.toLowerCase() as any);
}

/**
 * Calculate direct match between area and city
 * @param area Area name
 * @param city City name
 * @returns Boolean indicating if there's a direct match
 */
export function isDirectMatch(area: AreaName, city: CityName): boolean {
  return area.trim().toLowerCase() === city.trim().toLowerCase();
}

/**
 * Check if area contains city or vice versa
 * @param area Area name
 * @param city City name
 * @returns Boolean indicating if one contains the other
 */
export function isContainsMatch(area: AreaName, city: CityName): boolean {
  const normalizedArea = area.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  return (
    normalizedArea.includes(normalizedCity) ||
    normalizedCity.includes(normalizedArea)
  );
}

/**
 * Calculate match between area and city
 * @param area Area name
 * @param city City name
 * @returns Confidence score (0-1)
 */
export function calculateAreaMatch(
  area: AreaName,
  city: CityName
): ConfidenceScore {
  if (!area || !city) return 0;

  // Direct match
  if (isDirectMatch(area, city)) return 1;

  // Area contains city or vice versa
  if (isContainsMatch(area, city)) return 0.8;

  // Check for NCR area matching with an NCR city
  if (isNCRArea(area) && isNCRCity(city)) return 0.7;

  return 0.1; // Low confidence
}

/**
 * Apply small confidence penalty for zero prices
 * @param confidence Original confidence score
 * @param price Fuel price to check
 * @returns Adjusted confidence score
 */
export function adjustConfidenceForInvalidPrice(
  confidence: ConfidenceScore,
  price: FuelPrice
): ConfidenceScore {
  if (!isValidPrice(price.common_price)) {
    return confidence * 0.9; // 10% penalty for zero prices
  }
  return confidence;
}

/**
 * Find exact brand and city matches
 * @param prices Array of fuel prices to search
 * @param normalizedBrand Normalized brand name to match
 * @param normalizedCity Normalized city name to match
 * @param province Optional province for NCR matching
 * @returns Array of matching prices
 */
export function findExactMatches(
  prices: FuelPrice[],
  normalizedBrand: NormalizedString,
  normalizedCity: NormalizedString,
  province: ProvinceName = ''
): FuelPrice[] {
  return prices.filter(
    (price) =>
      normalizeBrandName(price.brand) === normalizedBrand &&
      (price.area.toLowerCase() === normalizedCity.toLowerCase() ||
        (price.area.toLowerCase() === 'ncr' && province === 'NCR'))
  );
}

/**
 * Calculate confidence for a single station against a given price
 * @param price Fuel price to check
 * @param station Gas station to match against
 * @returns Confidence score for this match
 */
export function calculateStationMatchConfidence(
  price: FuelPrice,
  station: GasStation
): ConfidenceScore {
  return calculatePriceStationMatchConfidence(price, station);
}

/**
 * Find best matching station in a specific city
 * @param price The fuel price to match
 * @param cityStations Array of stations in the target city
 * @returns Best matching station and confidence score
 */
export function findBestCityMatch(
  price: FuelPrice,
  cityStations: GasStation[]
): StationMatch {
  let bestMatch: GasStation | null = null;
  let bestConfidence: ConfidenceScore = 0;

  for (const station of cityStations) {
    const confidence = calculateStationMatchConfidence(price, station);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = station;
    }
  }

  return { station: bestMatch, confidence: bestConfidence };
}

/**
 * Find best matching station in other cities
 * @param price The fuel price to match
 * @param stations All available stations
 * @param cityStations Stations to exclude (already checked)
 * @param minConfidence Minimum confidence to beat
 * @returns Best matching station and confidence score
 */
export function findBestOtherMatch(
  price: FuelPrice,
  stations: GasStation[],
  cityStations: GasStation[],
  minConfidence: ConfidenceScore
): StationMatch {
  let bestMatch: GasStation | null = null;
  let bestConfidence: ConfidenceScore = minConfidence;

  for (const station of stations) {
    // Skip stations we already checked
    if (cityStations.includes(station)) continue;

    const confidence = calculateStationMatchConfidence(price, station);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = station;
    }
  }

  return { station: bestMatch, confidence: bestConfidence };
}

/**
 * Find best matching station for a price
 * @param price The fuel price entry
 * @param stations Array of stations to search
 * @param stationsByCity Stations grouped by city
 * @returns Best matching station and confidence score
 */
export function findBestMatchingStation(
  price: FuelPrice,
  stations: GasStation[],
  stationsByCity: GroupedStations
): StationMatch {
  // First try exact city match
  const cityStations = stationsByCity[normalizeCityName(price.area)] || [];
  const cityMatch = findBestCityMatch(price, cityStations);

  // If we have a good city match, use it
  if (cityMatch.confidence >= 0.7) {
    // Apply penalty for zero prices
    if (!isValidPrice(price.common_price)) {
      cityMatch.confidence *= 0.9;
    }
    return cityMatch;
  }

  // Otherwise try stations from other cities
  const otherMatch = findBestOtherMatch(
    price,
    stations,
    cityStations,
    cityMatch.confidence
  );

  // Apply penalty for zero prices if we found a match
  if (otherMatch.station && !isValidPrice(price.common_price)) {
    otherMatch.confidence *= 0.9;
  }

  // Return the best match we found
  return otherMatch;
}

/**
 * Find exact matches by brand and city
 * @param stations Array of stations to search
 * @param normalizedBrand Normalized brand name
 * @param normalizedArea Normalized area name
 * @returns Array of matching stations
 */
export function findExactStationMatches(
  stations: GasStation[],
  normalizedBrand: NormalizedString,
  normalizedArea: NormalizedString
): GasStation[] {
  return stations.filter(
    (station) =>
      normalizeBrandName(station.brand) === normalizedBrand &&
      normalizeCityName(station.city).toLowerCase() === normalizedArea
  );
}

/**
 * Check if a match between price and station is valid
 * Uses the imported isPriceStationMatchValid utility function
 * @param matchResult The price match result to check
 * @returns Boolean indicating if the match is valid
 */
export function isMatchValid(matchResult: PriceStationMatch): boolean {
  return isPriceStationMatchValid(matchResult.confidence);
}

/**
 * Calculate combined match confidence for a price and station
 * @param price Fuel price to match
 * @param station Gas station to match
 * @returns Combined confidence score (0-1)
 */
export function calculateCombinedMatchConfidence(
  price: FuelPrice,
  station: GasStation
): ConfidenceScore {
  // Uses the imported calculatePriceStationMatchConfidence as the primary method
  const primaryConfidence = calculatePriceStationMatchConfidence(
    price,
    station
  );

  // Also calculate using the local method as a backup
  const brandConfidence = calculateBrandSimilarity(price.brand, station.brand);
  const areaConfidence = calculateAreaMatch(price.area, station.city);
  const backupConfidence = brandConfidence * 0.7 + areaConfidence * 0.3;

  // Use the higher of the two methods
  return Math.max(primaryConfidence, backupConfidence);
}
