// utils/priceStationConnector.ts
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

      if (exactMatches.length > 0) {
        // Process exact matches with high confidence
        exactMatches.forEach((price) => {
          matchResults.push({
            price,
            stationId: station.id,
            stationName: station.name,
            matchConfidence: 0.95,
            confidenceLevel: 'High',
          });
        });
      } else {
        // If no exact matches, use fuzzy matching
        prices.forEach((price) => {
          const confidence = calculatePriceStationMatchConfidence(
            price,
            station
          );

          if (isPriceStationMatchValid(confidence)) {
            matchResults.push({
              price,
              stationId: station.id,
              stationName: station.name,
              matchConfidence: confidence,
              confidenceLevel: getConfidenceLevel(confidence),
            });
          }
        });
      }

      // Sort by confidence (highest first)
      matchResults.sort((a, b) => b.matchConfidence - a.matchConfidence);

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
        stationMatches.push({
          price,
          station,
          confidence: 0.95, // High confidence for exact matches
        });
      });
    }

    // Then try fuzzy matching for all stations
    stations.forEach((station) => {
      // Skip stations already matched exactly
      if (exactMatches.some((match) => match.id === station.id)) {
        return;
      }

      const confidence = calculatePriceStationMatchConfidence(price, station);

      if (isPriceStationMatchValid(confidence)) {
        stationMatches.push({
          price,
          station,
          confidence,
        });
      }
    });

    // Sort by confidence (highest first)
    stationMatches.sort((a, b) => b.confidence - a.confidence);

    return stationMatches;
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

    // Process each price
    prices.forEach((price) => {
      const fuelType = price.fuel_type;

      if (!result[fuelType]) {
        result[fuelType] = [];
      }

      // Try direct matching first
      const normalizedBrand = normalizeBrandName(price.brand);
      const normalizedArea = price.area.toLowerCase();
      const key = `${normalizedBrand}_${normalizedArea}`;

      const directMatches = stationMap[key] || [];

      if (directMatches.length > 0) {
        // Add direct matches with high confidence
        directMatches.forEach((station) => {
          result[fuelType].push({
            price,
            station,
            confidence: 0.95,
          });
        });
      } else {
        // Fall back to fuzzy matching
        const fuzzyMatches = this.findMatchingStations(price, stations);

        if (fuzzyMatches.length > 0) {
          result[fuelType].push(...fuzzyMatches);
        } else {
          // If no station matches, still include the price without a station
          result[fuelType].push({
            price,
            station: null as any, // Will be filtered out later where needed
            confidence: 0.1,
          });
        }
      }
    });

    // Sort each fuel type's matches by confidence
    Object.keys(result).forEach((fuelType) => {
      result[fuelType].sort((a, b) => b.confidence - a.confidence);
    });

    return result;
  },

  /**
   * Get price display name for UI consistency
   * @param price The fuel price entry
   * @returns Name for display in the UI
   */
  getPriceDisplayName(price: FuelPrice): string {
    return `${price.brand} - ${price.area}`;
  },

  /**
   * Check if a station search query might be referring to a price entry
   * @param query The search query
   * @returns Boolean indicating if this might be a price-related search
   */
  isPriceRelatedSearch(query: string): boolean {
    // Split the query to check if it has parts that might be brand+city
    const parts = query.split(/\s+/);
    return parts.length >= 2;
  },

  /**
   * Get latest prices for all fuel types
   * @returns Object with fuel types as keys and corresponding prices
   */
  async getLatestPrices(): Promise<Record<string, FuelPrice[]>> {
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

      // Get all prices for the latest week
      const { data: prices, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of);

      if (error) {
        console.error('Error fetching latest prices:', error);
        return {};
      }

      // Group by fuel type
      const pricesByFuelType: Record<string, FuelPrice[]> = {};

      prices?.forEach((price) => {
        if (!pricesByFuelType[price.fuel_type]) {
          pricesByFuelType[price.fuel_type] = [];
        }

        pricesByFuelType[price.fuel_type].push(price);
      });

      return pricesByFuelType;
    } catch (error) {
      console.error('Error in getLatestPrices:', error);
      return {};
    }
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
            matchResults.push({
              price,
              matchConfidence: 0.3,
              confidenceLevel: 'Low',
            });
          }
        }

        // Sort by price first, then by confidence
        matchResults.sort((a, b) => {
          // Primary sort by price
          const priceDiff = a.price.common_price - b.price.common_price;
          if (Math.abs(priceDiff) > 0.01) return priceDiff;

          // Secondary sort by confidence (higher first)
          return b.matchConfidence - a.matchConfidence;
        });

        // Take top 5 or fewer results
        bestPricesByFuelType[fuelType] = matchResults.slice(0, 5);
      }

      return bestPricesByFuelType;
    } catch (error) {
      console.error('Error in getBestPricesForLocation:', error);
      return {};
    }
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
