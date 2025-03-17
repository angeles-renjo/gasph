// hooks/useStationService.ts
import { useState, useEffect, useCallback } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';
import { useFetch } from './useFetch';

export function useStationById(id: string | null) {
  const { stationService } = useServiceContext();

  return useFetch(
    () => (id ? stationService.findById(id) : Promise.resolve(null)),
    [id]
  );
}

export function useNearbyStations(radiusKm: number = 5) {
  const { stationService, locationService } = useServiceContext();
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch stations function that can be called to refresh data
  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await locationService.getCurrentLocation();

      // Get nearby stations
      const data = await stationService.getStationsNearby(
        location.latitude,
        location.longitude,
        radiusKm
      );

      // Sort by distance (closest first)
      const sortedStations = [...data].sort(
        (a, b) =>
          (a.distance || Number.MAX_VALUE) - (b.distance || Number.MAX_VALUE)
      );

      setStations(sortedStations);
      setError(null);
    } catch (err) {
      console.error('Error fetching nearby stations:', err);
      setError(
        err instanceof Error ? err : new Error('Unknown error occurred')
      );
    } finally {
      setLoading(false);
    }
  }, [radiusKm, stationService, locationService]);

  // Initial fetch
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return {
    stations,
    loading,
    error,
    refreshStations: fetchStations, // Expose the refresh function
  };
}

export function useStationsByCity(city: string) {
  const { stationService } = useServiceContext();
  return useFetch(() => stationService.getStationsByCity(city), [city]);
}

// New hook for searching stations with brand and city matching
export function useStationSearch() {
  const { stationService } = useServiceContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Enhanced search function that attempts to match by brand+city too
  const searchStations = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        // First try exact search through service
        const exactMatches = await stationService.searchStations(searchQuery);

        // If we get results, return them
        if (exactMatches && exactMatches.length > 0) {
          setResults(exactMatches);
          setError(null);
          return;
        }

        // If no results, try splitting the query to see if it might be a brand+city combination
        // This helps users find stations when they search for what they see in the prices tab
        const parts = searchQuery.split(/\s+/);
        if (parts.length > 1) {
          // Try to find stations matching the brand part
          const brandMatches = await stationService.searchStations(parts[0]);
          if (brandMatches && brandMatches.length > 0) {
            // Filter by city part if present
            const filteredMatches = brandMatches.filter(
              (station) =>
                station.city.toLowerCase().includes(parts[1].toLowerCase()) ||
                station.address.toLowerCase().includes(parts[1].toLowerCase())
            );

            if (filteredMatches.length > 0) {
              setResults(filteredMatches);
              setError(null);
              return;
            }
          }
        }

        // If still no results, just return whatever the initial search gave us
        setResults(exactMatches || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setLoading(false);
      }
    },
    [stationService]
  );

  // Update query
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
