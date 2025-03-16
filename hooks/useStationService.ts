import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchNearbyStations = async () => {
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
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyStations();
  }, [radiusKm, stationService, locationService]);

  return { stations, loading, error };
}

export function useStationsByCity(city: string) {
  const { stationService } = useServiceContext();
  return useFetch(() => stationService.getStationsByCity(city), [city]);
}
