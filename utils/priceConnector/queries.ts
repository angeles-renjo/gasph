// /utils/priceConnector/queries.ts
// Database query helper functions for price-station connector

import { supabase } from '@/utils/supabase';
import { FuelPrice } from '@/core/models/FuelPrice';

/**
 * Get the latest week data from the fuel_prices table
 * @returns The latest week_of date or null if not found
 */
export async function getLatestWeek(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching latest week:', error);
      return null;
    }

    return data.week_of;
  } catch (error) {
    console.error('Error fetching latest week:', error);
    return null;
  }
}

/**
 * Get prices for the specified week
 * @param weekOf The week date to get prices for
 * @returns Array of fuel prices for the specified week
 */
export async function getPricesForWeek(weekOf: string): Promise<FuelPrice[]> {
  try {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .eq('week_of', weekOf);

    if (error) {
      console.error('Error fetching prices for week:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPricesForWeek:', error);
    return [];
  }
}

/**
 * Get NCR/Metro Manila prices for the specified week
 * @param weekOf The week date to get prices for
 * @returns Array of fuel prices for NCR/Metro Manila
 */
export async function getNCRPricesForWeek(
  weekOf: string
): Promise<FuelPrice[]> {
  try {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .eq('week_of', weekOf)
      .or('area.eq.NCR,area.eq.Metro Manila,area.ilike.%City%');

    if (error) {
      console.error('Error fetching NCR prices:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNCRPricesForWeek:', error);
    return [];
  }
}

/**
 * Get historical prices for a specific area and fuel type
 * @param area Area name
 * @param fuelType Fuel type
 * @param normalizedType Normalized fuel type
 * @param weeks Number of weeks to include
 * @returns Array of prices sorted by date
 */
export async function getHistoricalPrices(
  area: string,
  fuelType: string,
  normalizedType: string,
  weeks: number
): Promise<FuelPrice[]> {
  try {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .or(`fuel_type.ilike.%${fuelType}%,fuel_type.ilike.%${normalizedType}%`)
      .or(`area.eq.${area},area.eq.NCR,area.eq.Metro Manila`)
      .order('week_of', { ascending: false })
      .limit(weeks * 10); // Get more data than needed to ensure coverage

    if (error) {
      console.error('Error fetching price history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getHistoricalPrices:', error);
    return [];
  }
}
