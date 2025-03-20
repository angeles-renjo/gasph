// hooks/useStationPrices.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { PriceStationConnector } from '@/utils/priceStationConnector';
import { deduplicatePrices, ExtendedFuelPrice } from '@/utils/priceUtils';
import {
  normalizeFuelType,
  getShortFuelTypeName,
  isValidPrice,
} from '@/utils/formatters';

/**
 * Custom hook for fetching DOE prices for a specific station
 * Uses multiple strategies to find the best matching prices
 */
export function useStationPrices(station: GasStation | null) {
  const [doePrices, setDoePrices] = useState<ExtendedFuelPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOf, setWeekOf] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoePrices = async () => {
      if (!station) return;

      try {
        setLoading(true);
        setError(null);

        // Get latest week
        const { data: latestWeek, error: weekError } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (weekError) {
          console.error('Error fetching latest week:', weekError);
          setError('Failed to fetch price data week');
          return;
        }

        if (!latestWeek) {
          setLoading(false);
          return;
        }

        setWeekOf(latestWeek.week_of);

        // Get all prices from latest week
        const { data: allPrices, error: pricesError } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of);

        if (pricesError) {
          console.error('Error fetching all prices:', pricesError);
          setError('Failed to fetch price data');
          return;
        }

        if (!allPrices || allPrices.length === 0) {
          setLoading(false);
          return;
        }

        // Strategy 1: Use PriceStationConnector for enhanced matching
        try {
          console.log('Trying enhanced connector method');
          const matchedPrices = await PriceStationConnector.getPricesForStation(
            station
          );

          if (matchedPrices.length > 0) {
            console.log(
              `Found ${matchedPrices.length} matched prices using enhanced connector`
            );

            // Deduplicate the results
            const dedupedPrices = deduplicatePrices(matchedPrices);

            console.log(
              `After deduplication: ${dedupedPrices.length} unique fuel types`
            );
            setDoePrices(dedupedPrices);
            setLoading(false);
            return;
          }
        } catch (connectorError) {
          console.error('Error using PriceStationConnector:', connectorError);
          // Continue to fallback strategies
        }

        // Strategy 2: Simple brand+city matching
        console.log('Trying simple brand+city matching');
        const { data: simpleBrandCityMatches } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand)
          .order('fuel_type');

        if (simpleBrandCityMatches && simpleBrandCityMatches.length > 0) {
          console.log(
            `Found ${simpleBrandCityMatches.length} prices using simple matching`
          );

          // Deduplicate the results
          const dedupedPrices = deduplicatePrices(simpleBrandCityMatches);

          console.log(
            `After deduplication: ${dedupedPrices.length} unique fuel types`
          );
          setDoePrices(dedupedPrices);
          setLoading(false);
          return;
        }

        // Strategy 3: Try with NCR area as a last resort
        console.log('Trying NCR area matching as fallback');
        const { data: ncrData } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', 'NCR')
          .ilike('brand', station.brand)
          .order('fuel_type');

        if (ncrData && ncrData.length > 0) {
          console.log(`Found ${ncrData.length} prices using NCR area matching`);

          // Deduplicate these as well
          const dedupedPrices = deduplicatePrices(ncrData);

          console.log(
            `After deduplication: ${dedupedPrices.length} unique fuel types`
          );
          setDoePrices(dedupedPrices);
        } else {
          console.log('No matching prices found with any strategy');
          setDoePrices([]);
        }
      } catch (error) {
        console.error('Error fetching DOE prices:', error);
        setError('Failed to fetch price data');
      } finally {
        setLoading(false);
      }
    };

    fetchDoePrices();
  }, [station]);

  return { doePrices, loading, error, weekOf };
}
