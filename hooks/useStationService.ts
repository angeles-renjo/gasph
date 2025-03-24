import { useState, useEffect } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';

export function useStationById(id: string | string[] | undefined) {
  const { stationService } = useServiceContext();
  const [data, setData] = useState<GasStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStation = async () => {
      // Ensure id is a string and not undefined
      if (!id) {
        setLoading(false);
        return;
      }

      const stationId = Array.isArray(id) ? id[0] : id;

      try {
        setLoading(true);
        const station = await stationService.findById(stationId);
        setData(station);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to fetch station')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [id, stationService]);

  return { data, loading, error };
}
