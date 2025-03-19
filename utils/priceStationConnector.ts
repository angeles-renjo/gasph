// utils/priceStationConnector.ts
// Revised approach to handle zero prices appropriately - keep the stations but display prices as "--"

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
import { isValidPrice } from './formatters';

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
      const matchResults: PriceMatchResult[] = [];

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

          matchResults.push({
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
            matchResults.push({
              price,
              stationId: station.id,
              stationName: station.name,
              matchConfidence: adjustedConfidence,
              confidenceLevel: getConfidenceLevel(adjustedConfidence),
            });
          }
        });
      }

      // Sort with valid prices first, then by confidence
      matchResults.sort((a, b) => {
        // First prioritize valid prices
        const aValid = isValidPrice(a.price.common_price);
        const bValid = isValidPrice(b.price.common_price);

        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;

        // Then sort by confidence
        return b.matchConfidence - a.matchConfidence;
      });

      return matchResults;
    } catch (error) {
      console.error('Error in getPricesForStation:', error);
      return [];
    }
  },

  /**
   * Find matching stations for a specific price entry
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

      // Group by fuel type and find best matches
      const bestPricesByFuelType: Record<string, PriceMatchResult[]> = {};

      // Process each fuel type separately
      const fuelTypes = [...new Set(prices.map((price) => price.fuel_type))];

      for (const fuelType of fuelTypes) {
        const pricesForType = prices.filter(
          (price) => price.fuel_type === fuelType
        );

        // Count valid vs. invalid prices
        const validPrices = pricesForType.filter((p) =>
          isValidPrice(p.common_price)
        );
        const hasValidPrices = validPrices.length > 0;

        // Use all prices, but tracking which ones are valid
        const matchResults: PriceMatchResult[] = [];

        for (const price of pricesForType) {
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

          // Add the best match (or just price if no good match)
          if (bestMatch && bestConfidence >= 0.5) {
            matchResults.push({
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

            matchResults.push({
              price,
              matchConfidence: confidence,
              confidenceLevel: 'Low',
            });
          }
        }

        // Sort matches: valid prices first by price value, then invalid prices by confidence
        matchResults.sort((a, b) => {
          // First prioritize valid prices
          const aValid = isValidPrice(a.price.common_price);
          const bValid = isValidPrice(b.price.common_price);

          if (aValid && !bValid) return -1;
          if (!aValid && bValid) return 1;

          // If both are valid, sort by price
          if (aValid && bValid) {
            return a.price.common_price - b.price.common_price;
          }

          // For invalid prices, sort by match confidence
          return b.matchConfidence - a.matchConfidence;
        });

        // If we have enough valid matches, limit results more strictly
        // Otherwise include more stations even without price data
        let resultsLimit = 5;
        if (!hasValidPrices && matchResults.length > 5) {
          resultsLimit = Math.min(10, matchResults.length);
        }

        bestPricesByFuelType[fuelType] = matchResults.slice(0, resultsLimit);
      }

      return bestPricesByFuelType;
    } catch (error) {
      console.error('Error in getBestPricesForLocation:', error);
      return {};
    }
  },

  /**
   * Enhanced function to match all prices with their best station matches
   * @param prices Array of fuel prices
   * @param stations Array of gas stations
   * @returns Object with fuel types as keys and arrays of price-station matches as values
   */
  matchPricesWithStations(
    prices: FuelPrice[],
    stations: GasStation[]
  ): Record<string, MatchedPriceStation[]> {
    // Group prices by fuel type
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

    // Process each fuel type with all prices - valid and invalid
    const fuelTypes = [...new Set(prices.map((p) => p.fuel_type))];

    fuelTypes.forEach((fuelType) => {
      const pricesForType = prices.filter((p) => p.fuel_type === fuelType);
      result[fuelType] = [];

      // Process each price
      pricesForType.forEach((price) => {
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

            result[fuelType].push({
              price,
              station,
              confidence,
            });
          });
        } else {
          // Fall back to fuzzy matching
          const fuzzyMatches = this.findMatchingStations(price, stations);

          if (fuzzyMatches.length > 0) {
            result[fuelType].push(...fuzzyMatches);
          } else {
            // If no station matches, still include the price without a station
            // With a small penalty for zero prices
            let confidence = 0.1;
            if (!isValidPrice(price.common_price)) {
              confidence *= 0.9; // 10% penalty
            }

            result[fuelType].push({
              price,
              station: null as any, // Will be filtered out later where needed
              confidence,
            });
          }
        }
      });

      // Sort with valid prices first, then by confidence
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
    });

    return result;
  },

  /**
   * Get price history for a specific area and fuel type
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
      // Get prices for the specified period
      const { data, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('fuel_type', fuelType)
        .or(`area.eq.${area},area.eq.NCR,area.eq.Metro Manila`)
        .order('week_of', { ascending: false })
        .limit(weeks);

      if (error) {
        console.error('Error fetching price history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPriceHistory:', error);
      return [];
    }
  },
};
