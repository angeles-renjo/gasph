// utils/priceStationConnector.ts
// Revised to implement deduplication by normalized fuel type

import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { FuelPrice } from '@/core/models/FuelPrice';
import {
  normalizeBrandName,
  calculateBrandSimilarity,
} from './brandNormalization';
import {
  normalizeCityName,
  calculateAreaCityMatchConfidence,
} from './areaMapping';
import {
  calculatePriceStationMatchConfidence,
  isPriceStationMatchValid,
  getConfidenceLevel,
} from './priceWeighting';
import {
  isValidPrice,
  normalizeFuelType,
  getShortFuelTypeName,
} from './formatters';

/**
 * Interface for a matched price-station result
 */
export interface MatchedPriceStation {
  price: FuelPrice;
  station: GasStation;
  confidence: number;
}

/**
 * Enhanced match result with confidence data
 */
export interface PriceMatchResult {
  price: FuelPrice;
  stationId?: string;
  stationName?: string;
  matchConfidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

/**
 * Service to connect fuel prices with gas stations
 * Uses fuzzy matching and confidence scoring to associate DOE price data with actual stations
 */
export const PriceStationConnector = {
  /**
   * Get prices for a specific gas station with enhanced matching
   * Updated to deduplicate by normalized fuel type
   * @param station The gas station
   * @returns Array of matching fuel prices with confidence scores
   */
  async getPricesForStation(station: GasStation): Promise<PriceMatchResult[]> {
    try {
      // Get latest week
      const { data: latestWeek } = await supabase
        .from('fuel_prices')
        .select('week_of')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      if (!latestWeek) {
        return [];
      }

      // Get prices from the latest week
      const { data: prices, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of);

      if (error) {
        console.error('Error fetching prices for station:', error);
        return [];
      }

      if (!prices || prices.length === 0) {
        return [];
      }

      // Calculate confidence for each price
      const allMatchResults: PriceMatchResult[] = [];

      // Normalize the station brand and city for comparison
      const normalizedStationBrand = normalizeBrandName(station.brand);
      const normalizedStationCity = normalizeCityName(station.city);

      // First try exact matches
      const exactMatches = prices.filter(
        (price) =>
          normalizeBrandName(price.brand) === normalizedStationBrand &&
          (price.area.toLowerCase() === normalizedStationCity.toLowerCase() ||
            (price.area.toLowerCase() === 'ncr' && station.province === 'NCR'))
      );

      // Sort exact matches with valid prices first
      const sortedExactMatches = exactMatches.sort((a, b) => {
        // First prioritize by price validity (non-zero prices first)
        const aValid = isValidPrice(a.common_price);
        const bValid = isValidPrice(b.common_price);

        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;

        // If both valid or both invalid, sort by fuel type or price value
        return a.fuel_type.localeCompare(b.fuel_type);
      });

      if (sortedExactMatches.length > 0) {
        // Process exact matches with high confidence
        sortedExactMatches.forEach((price) => {
          // Calculate match confidence, with a slight difference for zero prices
          let confidence = 0.95; // Base high confidence for exact matches
          if (!isValidPrice(price.common_price)) {
            confidence *= 0.9; // Small penalty for zero prices (not too much)
          }

          allMatchResults.push({
            price,
            stationId: station.id,
            stationName: station.name,
            matchConfidence: confidence,
            confidenceLevel: getConfidenceLevel(confidence),
          });
        });
      } else {
        // If no exact matches, use fuzzy matching
        // Include all prices, but sort them appropriately
        prices.forEach((price) => {
          const confidence = calculatePriceStationMatchConfidence(
            price,
            station
          );

          // Apply small penalty for zero prices
          let adjustedConfidence = confidence;
          if (!isValidPrice(price.common_price)) {
            adjustedConfidence *= 0.9; // 10% penalty (keep it minor)
          }

          if (isPriceStationMatchValid(adjustedConfidence)) {
            allMatchResults.push({
              price,
              stationId: station.id,
              stationName: station.name,
              matchConfidence: adjustedConfidence,
              confidenceLevel: getConfidenceLevel(adjustedConfidence),
            });
          }
        });
      }

      // DEDUPLICATION: Group by normalized fuel type
      const fuelTypeMap = new Map<string, PriceMatchResult>();

      allMatchResults.forEach((result) => {
        const normalizedType = normalizeFuelType(result.price.fuel_type);

        // Add if not exists or if this is a better match than existing
        if (
          !fuelTypeMap.has(normalizedType) ||
          // Prioritize prices with valid data
          (!isValidPrice(fuelTypeMap.get(normalizedType)!.price.common_price) &&
            isValidPrice(result.price.common_price)) ||
          // Or higher confidence matches
          fuelTypeMap.get(normalizedType)!.matchConfidence <
            result.matchConfidence
        ) {
          fuelTypeMap.set(normalizedType, result);
        }
      });

      // Convert map back to array
      const dedupedResults = Array.from(fuelTypeMap.values());

      // Sort with valid prices first, then by fuel type category
      dedupedResults.sort((a, b) => {
        // First prioritize valid prices
        const aValid = isValidPrice(a.price.common_price);
        const bValid = isValidPrice(b.price.common_price);

        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;

        // Then sort by fuel category and type
        const aType = normalizeFuelType(a.price.fuel_type).split(' ')[0];
        const bType = normalizeFuelType(b.price.fuel_type).split(' ')[0];

        if (aType !== bType) return aType.localeCompare(bType);

        // Then by specific fuel type
        return a.price.fuel_type.localeCompare(b.price.fuel_type);
      });

      console.log(
        `PriceStationConnector: Deduplication reduced ${allMatchResults.length} matches to ${dedupedResults.length} unique fuel types`
      );
      return dedupedResults;
    } catch (error) {
      console.error('Error in getPricesForStation:', error);
      return [];
    }
  },

  /**
   * Find matching stations for a specific price entry
   * Updated to use normalized fuel types
   * @param price The fuel price entry
   * @param stations Array of stations to search
   * @returns Matching stations ranked by confidence
   */
  findMatchingStations(
    price: FuelPrice,
    stations: GasStation[]
  ): MatchedPriceStation[] {
    // Normalize the price brand and area for comparison
    const normalizedPriceBrand = normalizeBrandName(price.brand);
    const normalizedPriceArea = price.area.toLowerCase();
    const normalizedFuelType = normalizeFuelType(price.fuel_type);

    // Map to store results with confidence scores
    const stationMatches: MatchedPriceStation[] = [];

    // First try exact matches
    const exactMatches = stations.filter(
      (station) =>
        normalizeBrandName(station.brand) === normalizedPriceBrand &&
        normalizeCityName(station.city).toLowerCase() === normalizedPriceArea
    );

    if (exactMatches.length > 0) {
      // Add exact matches with high confidence
      exactMatches.forEach((station) => {
        // Apply small confidence penalty for zero prices
        let confidence = 0.95; // High confidence for exact matches
        if (!isValidPrice(price.common_price)) {
          confidence *= 0.9; // 10% penalty (keep it minor)
        }

        stationMatches.push({
          price,
          station,
          confidence,
        });
      });
    }

    // Then try fuzzy matching for all stations
    stations.forEach((station) => {
      // Skip stations already matched exactly
      if (exactMatches.some((match) => match.id === station.id)) {
        return;
      }

      let confidence = calculatePriceStationMatchConfidence(price, station);

      // Apply small penalty for zero prices
      if (!isValidPrice(price.common_price)) {
        confidence *= 0.9; // 10% penalty (keep it minor)
      }

      if (isPriceStationMatchValid(confidence)) {
        stationMatches.push({
          price,
          station,
          confidence,
        });
      }
    });

    // Sort by confidence with valid prices first
    stationMatches.sort((a, b) => {
      // First prioritize by price validity
      const aValid = isValidPrice(a.price.common_price);
      const bValid = isValidPrice(b.price.common_price);

      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    return stationMatches;
  },

  /**
   * Get the best price matches for a specific location
   * Updated with fuel type normalization and deduplication
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param stations Nearby stations to match with prices
   * @returns Object with fuel types as keys and best price matches as values
   */
  async getBestPricesForLocation(
    latitude: number,
    longitude: number,
    stations: GasStation[]
  ): Promise<Record<string, PriceMatchResult[]>> {
    try {
      // Get latest week
      const { data: latestWeek } = await supabase
        .from('fuel_prices')
        .select('week_of')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      if (!latestWeek) {
        return {};
      }

      // Get all prices for the latest week, focusing on NCR/Metro Manila
      const { data: prices, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of)
        .or('area.eq.NCR,area.eq.Metro Manila,area.ilike.%City%');

      if (error) {
        console.error('Error fetching latest prices:', error);
        return {};
      }

      // Group stations by city to help with matching
      const stationsByCity: Record<string, GasStation[]> = {};
      stations.forEach((station) => {
        const city = normalizeCityName(station.city);
        if (!stationsByCity[city]) {
          stationsByCity[city] = [];
        }
        stationsByCity[city].push(station);
      });

      // Group by normalized fuel type and find best matches
      const normalizedPricesByFuelType: Record<string, PriceMatchResult[]> = {};

      // Process all available prices
      for (const price of prices) {
        // Normalize the fuel type
        const normalizedType = normalizeFuelType(price.fuel_type);

        if (!normalizedPricesByFuelType[normalizedType]) {
          normalizedPricesByFuelType[normalizedType] = [];
        }

        // Find best matching station
        let bestMatch: MatchedPriceStation | null = null;
        let bestConfidence = 0;

        // Try exact city match first
        const cityStations =
          stationsByCity[normalizeCityName(price.area)] || [];
        for (const station of cityStations) {
          const confidence = calculatePriceStationMatchConfidence(
            price,
            station
          );
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = { price, station, confidence };
          }
        }

        // If no good match in exact city, try all stations
        if (bestConfidence < 0.7) {
          for (const station of stations) {
            // Skip stations we already checked
            if (cityStations.includes(station)) continue;

            const confidence = calculatePriceStationMatchConfidence(
              price,
              station
            );
            if (confidence > bestConfidence) {
              bestConfidence = confidence;
              bestMatch = { price, station, confidence };
            }
          }
        }

        // Apply small penalty for zero prices
        if (!isValidPrice(price.common_price)) {
          bestConfidence *= 0.9; // 10% penalty (keep it minor)
        }

        // Add the result
        if (bestMatch && bestConfidence >= 0.5) {
          normalizedPricesByFuelType[normalizedType].push({
            price,
            stationId: bestMatch.station.id,
            stationName: bestMatch.station.name,
            matchConfidence: bestConfidence,
            confidenceLevel: getConfidenceLevel(bestConfidence),
          });
        } else {
          // Include price without station match
          // Apply a light penalty for zero prices with no station match
          let confidence = 0.3;
          if (!isValidPrice(price.common_price)) {
            confidence *= 0.9; // 10% penalty
          }

          normalizedPricesByFuelType[normalizedType].push({
            price,
            matchConfidence: confidence,
            confidenceLevel: 'Low',
          });
        }
      }

      // For each normalized fuel type, deduplicate and sort the matches
      const bestPricesByFuelType: Record<string, PriceMatchResult[]> = {};

      Object.entries(normalizedPricesByFuelType).forEach(
        ([fuelType, matches]) => {
          // Sort the matches for this fuel type
          matches.sort((a, b) => {
            // First prioritize valid prices
            const aValid = isValidPrice(a.price.common_price);
            const bValid = isValidPrice(b.price.common_price);

            if (aValid && !bValid) return -1;
            if (!aValid && bValid) return 1;

            // For valid prices, sort by price value
            if (aValid && bValid) {
              return a.price.common_price - b.price.common_price;
            }

            // For invalid prices, sort by match confidence
            return b.matchConfidence - a.matchConfidence;
          });

          // If we have enough valid matches, limit results more strictly
          // Otherwise include more stations even without price data
          const validMatches = matches.filter((m) =>
            isValidPrice(m.price.common_price)
          );
          let resultsLimit = 5;

          if (validMatches.length >= 3 || matches.length <= 5) {
            bestPricesByFuelType[fuelType] = matches.slice(0, 5);
          } else {
            // Include all valid matches plus some invalid ones to reach 5 total
            bestPricesByFuelType[fuelType] = [
              ...validMatches,
              ...matches
                .filter((m) => !isValidPrice(m.price.common_price))
                .slice(0, 5 - validMatches.length),
            ];
          }

          console.log(
            `Normalized ${fuelType}: ${matches.length} matches → ${bestPricesByFuelType[fuelType].length} results`
          );
        }
      );

      return bestPricesByFuelType;
    } catch (error) {
      console.error('Error in getBestPricesForLocation:', error);
      return {};
    }
  },

  /**
   * Enhanced function to match all prices with their best station matches
   * Updated to use normalized fuel types for deduplication
   * @param prices Array of fuel prices
   * @param stations Array of gas stations
   * @returns Object with fuel types as keys and arrays of price-station matches as values
   */
  matchPricesWithStations(
    prices: FuelPrice[],
    stations: GasStation[]
  ): Record<string, MatchedPriceStation[]> {
    // Group prices by normalized fuel type
    const result: Record<string, MatchedPriceStation[]> = {};

    // Group stations by brand and city for quicker lookup
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

    // Process each price and organize by normalized fuel type
    prices.forEach((price) => {
      const normalizedType = normalizeFuelType(price.fuel_type);

      if (!result[normalizedType]) {
        result[normalizedType] = [];
      }

      // Try direct matching first
      const normalizedBrand = normalizeBrandName(price.brand);
      const normalizedArea = price.area.toLowerCase();
      const key = `${normalizedBrand}_${normalizedArea}`;

      const directMatches = stationMap[key] || [];

      if (directMatches.length > 0) {
        // Add direct matches with high confidence
        directMatches.forEach((station) => {
          // Calculate confidence with small adjustment for zero prices
          let confidence = 0.95; // Base high confidence
          if (!isValidPrice(price.common_price)) {
            confidence *= 0.9; // 10% penalty (keep it minor)
          }

          result[normalizedType].push({
            price,
            station,
            confidence,
          });
        });
      } else {
        // Fall back to fuzzy matching
        const fuzzyMatches = this.findMatchingStations(price, stations);

        if (fuzzyMatches.length > 0) {
          result[normalizedType].push(...fuzzyMatches);
        } else {
          // If no station matches, still include the price without a station
          // With a small penalty for zero prices
          let confidence = 0.1;
          if (!isValidPrice(price.common_price)) {
            confidence *= 0.9; // 10% penalty
          }

          result[normalizedType].push({
            price,
            station: null as any, // Will be filtered out later where needed
            confidence,
          });
        }
      }
    });

    // Sort and deduplicate each fuel type's results
    Object.keys(result).forEach((fuelType) => {
      // First sort by validity and confidence
      result[fuelType].sort((a, b) => {
        // First prioritize valid prices
        const aValid = isValidPrice(a.price.common_price);
        const bValid = isValidPrice(b.price.common_price);

        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;

        // For valid prices, sort by price value
        if (aValid && bValid) {
          return a.price.common_price - b.price.common_price;
        }

        // For invalid prices, sort by confidence
        return b.confidence - a.confidence;
      });

      // Then deduplicate by station to avoid showing multiple prices for the same station
      if (result[fuelType].length > 0) {
        const stationIds = new Set<string>();
        const dedupedMatches: MatchedPriceStation[] = [];

        result[fuelType].forEach((match) => {
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

        result[fuelType] = dedupedMatches;
      }
    });

    return result;
  },

  /**
   * Get price history for a specific area and fuel type
   * Updated to use normalized fuel types
   * @param area Area name
   * @param fuelType Fuel type
   * @param weeks Number of weeks to include
   * @returns Array of prices sorted by date
   */
  async getPriceHistory(
    area: string,
    fuelType: string,
    weeks: number = 4
  ): Promise<FuelPrice[]> {
    try {
      // Normalize the fuel type
      const normalizedType = normalizeFuelType(fuelType);

      // Get prices for the specified period, using a broader match for fuel type
      const { data, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .or(`fuel_type.ilike.%${fuelType}%,fuel_type.ilike.%${normalizedType}%`)
        .or(`area.eq.${area},area.eq.NCR,area.eq.Metro Manila`)
        .order('week_of', { ascending: false })
        .limit(weeks);

      if (error) {
        console.error('Error fetching price history:', error);
        return [];
      }

      // Group prices by week to deduplicate and get the best price for each week
      const pricesByWeek = new Map<string, FuelPrice[]>();

      (data || []).forEach((price) => {
        const weekKey = price.week_of;
        if (!pricesByWeek.has(weekKey)) {
          pricesByWeek.set(weekKey, []);
        }
        pricesByWeek.get(weekKey)!.push(price);
      });

      // For each week, pick the best matching price
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
            const exactAreaMatch = validPrices.find((p) => p.area === area);
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

      // Sort by week descending
      results.sort((a, b) => {
        return new Date(b.week_of).getTime() - new Date(a.week_of).getTime();
      });

      return results;
    } catch (error) {
      console.error('Error in getPriceHistory:', error);
      return [];
    }
  },
};
