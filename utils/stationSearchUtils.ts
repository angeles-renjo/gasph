// utils/stationSearchUtils.ts
import { GasStation } from '@/core/models/GasStation';

/**
 * Perform primary search using service's search method
 * @param searchQuery The search query string
 * @param stationService The station service to use for searching
 * @returns Array of matching gas stations
 */
export async function performPrimarySearch(
  searchQuery: string,
  stationService: any
): Promise<GasStation[]> {
  try {
    const exactMatches = await stationService.searchStations(searchQuery);
    return exactMatches || [];
  } catch {
    return [];
  }
}

/**
 * Perform advanced search with brand+city matching
 * @param searchQuery The search query string
 * @param stationService The station service to use for searching
 * @returns Array of matching gas stations
 */
export async function performAdvancedSearch(
  searchQuery: string,
  stationService: any
): Promise<GasStation[]> {
  // Split query into parts
  const parts = searchQuery.trim().split(/\s+/);

  // Need at least two parts for advanced matching
  if (parts.length < 2) {
    return [];
  }

  try {
    // Search by first part (likely brand)
    const brandMatches = await stationService.searchStations(parts[0]);

    // Filter brand matches by city or address
    const filteredMatches = brandMatches.filter((station: GasStation) => {
      const cityMatch = station.city
        .toLowerCase()
        .includes(parts[1].toLowerCase());
      const addressMatch = station.address
        .toLowerCase()
        .includes(parts[1].toLowerCase());
      return cityMatch || addressMatch;
    });

    return filteredMatches;
  } catch {
    return [];
  }
}
