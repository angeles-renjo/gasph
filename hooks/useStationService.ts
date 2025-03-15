// src/hooks/useStationService.ts
import { useState, useEffect } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';

export function useStationById(id: string | null) {
  const { stationService } = useServiceContext();
  const [station, setStation] = useState<GasStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setStation(null);
      setLoading(false);
      return;
    }

    const fetchStation = async () => {
      try {
        setLoading(true);
        const data = await stationService.getStationById(id);
        setStation(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [id, stationService]);

  return { station, loading, error };
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
        console.log('Current location:', location);

        // Get nearby stations
        console.log('Searching for stations within', radiusKm, 'km');
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

        console.log('Stations found:', sortedStations.length);
        if (sortedStations.length > 0) {
          console.log(
            'First station:',
            sortedStations[0].name,
            'distance:',
            sortedStations[0].distance,
            'km'
          );
        }

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
    };

    fetchNearbyStations();
  }, [radiusKm, stationService, locationService]);

  return { stations, loading, error };
}

export function useStationsByCity(city: string) {
  const { stationService } = useServiceContext();
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setLoading(true);
        const data = await stationService.getStationsByCity(city);
        setStations(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, [city, stationService]);

  return { stations, loading, error };
}
