// hooks/useStationService.ts
import { useState, useCallback } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';
import {
  performPrimarySearch,
  performAdvancedSearch,
} from '@/utils/stationSearchUtils';

/**
 * A hook for searching stations with flexible matching
 */
export function useStationSearch() {
  const { stationService } = useServiceContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Perform a search with brand+city combination fallback
   * @param searchQuery The search query string
   */
  const searchStations = useCallback(
    async (searchQuery: string) => {
      // Early return for empty queries
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Primary search strategy: direct search
        const searchResults = await performPrimarySearch(
          searchQuery,
          stationService
        );

        // If primary search fails, try advanced matching
        if (searchResults.length === 0) {
          const advancedResults = await performAdvancedSearch(
            searchQuery,
            stationService
          );
          setResults(advancedResults);
        } else {
          setResults(searchResults);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Station search failed';
        setError(new Error(errorMessage));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [stationService]
  );

  /**
   * Update query and trigger search
   */
  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      searchStations(newQuery);
    },
    [searchStations]
  );

  return {
    query,
    results,
    loading,
    error,
    updateQuery,
    searchStations,
  };
}
