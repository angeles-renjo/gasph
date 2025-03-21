// /utils/priceStationConnector.ts
// Connects fuel prices with gas stations using fuzzy matching and confidence scoring

import { GasStation } from '@/core/models/GasStation';
import { FuelPrice } from '@/core/models/FuelPrice';
import { getConfidenceLevel } from '@/utils/priceWeighting';
import { normalizeFuelType } from '@/utils/formatters';

// Import utility functions from our new structure
import {
  // Database queries
  getLatestWeek,
  getPricesForWeek,
  getNCRPricesForWeek,
  getHistoricalPrices,

  // Matchers
  adjustConfidenceForInvalidPrice,
  findExactMatches,
  findBestMatchingStation,
  findExactStationMatches,
  isNCRCity,
  calculateAreaMatch,
  calculateCombinedMatchConfidence,
  isMatchValid,

  // Sorters
  sortPricesByValidityAndType,
  sortPriceResults,
  deduplicateByFuelType,
  sortDeduplicatedResults,
  sortMatchedStations,
  deduplicateByStation,
  processMatchesForFuelType,
  sortPricesByWeekDescending,

  // Transformers
  groupStationsByCity,
  groupStationsByBrandAndCity,
  groupPricesByWeek,
  findBestPriceForEachWeek,
  groupPricesByNormalizedType,
} from '@/utils/priceConnector';

/**
 * Represents brand and city information for matching
 */
export interface LocationIdentifier {
  brand: string;
  area: string;
}

/**
 * Confidence information for a match
 */
export interface ConfidenceScore {
  value: number;
  level: 'High' | 'Medium' | 'Low';
}

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
      const latestWeek = await getLatestWeek();
      if (!latestWeek) {
        return [];
      }

      // Get prices from the latest week
      const prices = await getPricesForWeek(latestWeek);
      if (prices.length === 0) {
        return [];
      }

      // Prepare normalized values for comparison
      const normalizedStationBrand = station.brand.toLowerCase();
      const normalizedStationCity = station.city.toLowerCase();

      // Process matches using different strategies
      const allMatchResults = await this.processPriceMatchesForStation(
        prices,
        station,
        normalizedStationBrand,
        normalizedStationCity
      );

      // Deduplicate by normalized fuel type
      const dedupedResults = deduplicateByFuelType(allMatchResults);

      // Sort results
      const sortedResults = sortDeduplicatedResults(dedupedResults);

      console.log(
        `PriceStationConnector: Deduplication reduced ${allMatchResults.length} matches to ${sortedResults.length} unique fuel types`
      );

      return sortedResults;
    } catch (error) {
      console.error('Error in getPricesForStation:', error);
      return [];
    }
  },

  /**
   * Process matches using exact and fuzzy strategies
   * Extracted to reduce complexity of main method
   */
  async processPriceMatchesForStation(
    prices: FuelPrice[],
    station: GasStation,
    normalizedStationBrand: string,
    normalizedStationCity: string
  ): Promise<PriceMatchResult[]> {
    const allMatchResults: PriceMatchResult[] = [];

    // First try exact matches
    const exactMatches = findExactMatches(
      prices,
      normalizedStationBrand,
      normalizedStationCity,
      station.province
    );

    // Sort exact matches with valid prices first
    const sortedExactMatches = sortPricesByValidityAndType(exactMatches);

    if (sortedExactMatches.length > 0) {
      // Process exact matches with high confidence
      this.processExactPriceMatches(
        sortedExactMatches,
        station,
        allMatchResults
      );
    } else {
      // If no exact matches, use fuzzy matching with all prices
      this.processFuzzyPriceMatches(prices, station, allMatchResults);
    }

    return allMatchResults;
  },

  /**
   * Process exact price matches for a station
   */
  processExactPriceMatches(
    prices: FuelPrice[],
    station: GasStation,
    results: PriceMatchResult[]
  ): void {
    prices.forEach((price) => {
      // Calculate match confidence, with a slight difference for zero prices
      let confidence = 0.95; // Base high confidence for exact matches
      confidence = adjustConfidenceForInvalidPrice(confidence, price);

      results.push({
        price,
        stationId: station.id,
        stationName: station.name,
        matchConfidence: confidence,
        confidenceLevel: getConfidenceLevel(confidence),
      });
    });
  },

  /**
   * Process prices using fuzzy matching
   */
  processFuzzyPriceMatches(
    prices: FuelPrice[],
    station: GasStation,
    results: PriceMatchResult[]
  ): void {
    // Build the results array with all prices that meet the match threshold
    prices.forEach((price) => {
      // Get matching confidence from external utility
      const confidence = this.calculateMatchConfidence(price, station);
      const adjustedConfidence = adjustConfidenceForInvalidPrice(
        confidence,
        price
      );

      // Only include matches that meet our validity threshold
      if (adjustedConfidence >= 0.5) {
        results.push({
          price,
          stationId: station.id,
          stationName: station.name,
          matchConfidence: adjustedConfidence,
          confidenceLevel: getConfidenceLevel(adjustedConfidence),
        });
      }
    });
  },

  /**
   * Calculate match confidence for a price and station
   * Now uses the utility function from matchers.ts
   */
  calculateMatchConfidence(price: FuelPrice, station: GasStation): number {
    return calculateCombinedMatchConfidence(price, station);
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
    // First get exact matches
    const exactMatches = this.getExactMatchingStations(price, stations);

    // Then get fuzzy matches from stations not already exactly matched
    const fuzzyMatches = this.getFuzzyMatchingStations(
      price,
      stations,
      exactMatches
    );

    // Combine matches
    const allMatches = [...exactMatches, ...fuzzyMatches];

    // Sort combined matches
    return this.sortMatchesByConfidence(allMatches);
  },

  /**
   * Sort matches by confidence and price validity
   */
  sortMatchesByConfidence(
    matches: MatchedPriceStation[]
  ): MatchedPriceStation[] {
    // Use the imported sorting function
    return sortMatchedStations(matches);
  },

  /**
   * Get exact matches between price and stations
   */
  getExactMatchingStations(
    price: FuelPrice,
    stations: GasStation[]
  ): MatchedPriceStation[] {
    // Normalize values for comparison
    const normalizedBrand = price.brand.toLowerCase();
    const normalizedArea = price.area.toLowerCase();

    // Get exact matching stations
    const exactStations = this.findExactStationsByBrandAndArea(
      stations,
      normalizedBrand,
      normalizedArea
    );

    // Convert to MatchedPriceStation objects
    return this.createMatchesForStations(price, exactStations, 0.95);
  },

  /**
   * Find stations that exactly match the brand and area
   */
  findExactStationsByBrandAndArea(
    stations: GasStation[],
    brand: string,
    area: string
  ): GasStation[] {
    return findExactStationMatches(stations, brand, area);
  },

  /**
   * Create match objects for a list of stations with the given base confidence
   */
  createMatchesForStations(
    price: FuelPrice,
    stations: GasStation[],
    baseConfidence: number
  ): MatchedPriceStation[] {
    const matches: MatchedPriceStation[] = [];

    stations.forEach((station) => {
      // Apply price validity adjustment to the base confidence
      const confidence = adjustConfidenceForInvalidPrice(baseConfidence, price);

      matches.push({ price, station, confidence });
    });

    return matches;
  },

  /**
   * Get fuzzy matches between price and stations
   */
  getFuzzyMatchingStations(
    price: FuelPrice,
    stations: GasStation[],
    alreadyMatched: MatchedPriceStation[]
  ): MatchedPriceStation[] {
    // Create a set of already matched station IDs
    const matchedIds = this.extractMatchedStationIds(alreadyMatched);

    // Get stations not already matched
    const unmatchedStations = this.filterUnmatchedStations(
      stations,
      matchedIds
    );

    // Find matching stations from the unmatched ones
    return this.findFuzzyMatches(price, unmatchedStations);
  },

  /**
   * Extract the IDs of stations that have already been matched
   */
  extractMatchedStationIds(matches: MatchedPriceStation[]): Set<string> {
    return new Set(matches.map((match) => match.station.id));
  },

  /**
   * Filter out stations that have already been matched
   */
  filterUnmatchedStations(
    stations: GasStation[],
    matchedIds: Set<string>
  ): GasStation[] {
    return stations.filter((station) => !matchedIds.has(station.id));
  },

  /**
   * Find stations with fuzzy matching over a confidence threshold
   */
  findFuzzyMatches(
    price: FuelPrice,
    stations: GasStation[]
  ): MatchedPriceStation[] {
    const matches: MatchedPriceStation[] = [];

    stations.forEach((station) => {
      // Calculate match confidence
      let confidence = this.calculateMatchConfidence(price, station);
      confidence = adjustConfidenceForInvalidPrice(confidence, price);

      // Only include matches above confidence threshold
      if (confidence >= 0.5) {
        matches.push({ price, station, confidence });
      }
    });

    return matches;
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
      const latestWeek = await getLatestWeek();
      if (!latestWeek) {
        return {};
      }

      // Get prices for NCR/Metro Manila
      const prices = await getNCRPricesForWeek(latestWeek);
      if (prices.length === 0) {
        return {};
      }

      // Group stations by city for efficient lookup
      const stationsByCity = groupStationsByCity(stations);

      // Process prices and match with stations
      const normalizedPricesByFuelType = await this.processPricesForLocation(
        prices,
        stations,
        stationsByCity
      );

      // Process each fuel type to limit results
      const bestPricesByFuelType: Record<string, PriceMatchResult[]> = {};

      Object.entries(normalizedPricesByFuelType).forEach(
        ([fuelType, matches]) => {
          bestPricesByFuelType[fuelType] = processMatchesForFuelType(matches);

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
   * Process prices for a location and match with stations
   */
  async processPricesForLocation(
    prices: FuelPrice[],
    stations: GasStation[],
    stationsByCity: Record<string, GasStation[]>
  ): Promise<Record<string, PriceMatchResult[]>> {
    // Group prices by fuel type first
    const pricesByFuelType = groupPricesByNormalizedType(prices);

    // Process each fuel type group
    const normalizedPricesByFuelType: Record<string, PriceMatchResult[]> = {};

    // Process each fuel type
    for (const [fuelType, fuelPrices] of Object.entries(pricesByFuelType)) {
      normalizedPricesByFuelType[fuelType] = this.processOneFuelType(
        fuelPrices,
        stations,
        stationsByCity
      );
    }

    return normalizedPricesByFuelType;
  },

  /**
   * Process prices for a single fuel type
   */
  processOneFuelType(
    prices: FuelPrice[],
    stations: GasStation[],
    stationsByCity: Record<string, GasStation[]>
  ): PriceMatchResult[] {
    const results: PriceMatchResult[] = [];

    // Process each price in this fuel type
    prices.forEach((price) => {
      // Find best matching station
      const { station, confidence } = findBestMatchingStation(
        price,
        stations,
        stationsByCity
      );

      if (station && confidence >= 0.5) {
        // Add with station match
        results.push(this.createMatchWithStation(price, station, confidence));
      } else {
        // Include price without station match
        results.push(this.createMatchWithoutStation(price));
      }
    });

    return results;
  },

  /**
   * Create a match result with a station
   */
  createMatchWithStation(
    price: FuelPrice,
    station: GasStation,
    confidence: number
  ): PriceMatchResult {
    return {
      price,
      stationId: station.id,
      stationName: station.name,
      matchConfidence: confidence,
      confidenceLevel: getConfidenceLevel(confidence),
    };
  },

  /**
   * Create a match result without a station
   */
  createMatchWithoutStation(price: FuelPrice): PriceMatchResult {
    const noMatchConfidence = adjustConfidenceForInvalidPrice(0.3, price);

    return {
      price,
      matchConfidence: noMatchConfidence,
      confidenceLevel: 'Low',
    };
  },

  /**
   * Match all prices with their best station matches
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
    const stationMap = groupStationsByBrandAndCity(stations);

    // Process each price
    prices.forEach((price) => {
      // Process this price
      this.processOnePrice(price, stations, stationMap, result);
    });

    // Process each fuel type group
    Object.keys(result).forEach((fuelType) => {
      // First sort by validity and confidence
      result[fuelType] = sortMatchedStations(result[fuelType]);

      // Then deduplicate by station
      result[fuelType] = deduplicateByStation(result[fuelType]);
    });

    return result;
  },

  /**
   * Process a single price for matching
   */
  processOnePrice(
    price: FuelPrice,
    stations: GasStation[],
    stationMap: Record<string, GasStation[]>,
    resultMap: Record<string, MatchedPriceStation[]>
  ): void {
    // Get normalized values
    const normalizedType = normalizeFuelType(price.fuel_type);
    const normalizedBrand = price.brand.toLowerCase();
    const normalizedArea = price.area.toLowerCase();

    // Make sure the array exists
    if (!resultMap[normalizedType]) {
      resultMap[normalizedType] = [];
    }

    // Get result array for this fuel type
    const resultArray = resultMap[normalizedType];

    // Try direct matching first
    const key = `${normalizedBrand}_${normalizedArea}`;
    const directMatches = stationMap[key] || [];

    if (directMatches.length > 0) {
      // Process direct matches
      this.processDirectMatches(price, directMatches, resultArray);
    } else {
      // Fall back to fuzzy matching
      this.processFallbackMatches(price, stations, resultArray);
    }
  },

  /**
   * Process direct matches for a price
   */
  processDirectMatches(
    price: FuelPrice,
    directMatches: GasStation[],
    resultArray: MatchedPriceStation[]
  ): void {
    directMatches.forEach((station) => {
      // Calculate confidence with small adjustment for zero prices
      let confidence = 0.95; // Base high confidence
      confidence = adjustConfidenceForInvalidPrice(confidence, price);

      resultArray.push({
        price,
        station,
        confidence,
      });
    });
  },

  /**
   * Process fallback matches for a price when no direct matches found
   */
  processFallbackMatches(
    price: FuelPrice,
    stations: GasStation[],
    resultArray: MatchedPriceStation[]
  ): void {
    const fuzzyMatches = this.findMatchingStations(price, stations);

    if (fuzzyMatches.length > 0) {
      resultArray.push(...fuzzyMatches);
    } else {
      // If no station matches, still include the price without a station
      let confidence = 0.1;
      confidence = adjustConfidenceForInvalidPrice(confidence, price);

      resultArray.push({
        price,
        station: null as any, // Will be filtered out later where needed
        confidence,
      });
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
      // Normalize the fuel type
      const normalizedType = normalizeFuelType(fuelType);

      // Get historical price data
      const priceData = await getHistoricalPrices(
        area,
        fuelType,
        normalizedType,
        weeks
      );

      if (priceData.length === 0) {
        return [];
      }

      // Group prices by week for processing
      const pricesByWeek = groupPricesByWeek(priceData);

      // Find best price for each week
      const results = findBestPriceForEachWeek(
        pricesByWeek,
        normalizedType,
        area
      );

      // Sort by week descending
      return sortPricesByWeekDescending(results);
    } catch (error) {
      console.error('Error in getPriceHistory:', error);
      return [];
    }
  },
};
