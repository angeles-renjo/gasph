// hooks/usePriceService.ts
// Let's update the usePriceReporting hook to support our new functionality

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { PriceReportData } from '@/components/price/PriceReportingModal';

// For demonstration - in a real app, you'd use an auth hook
interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface StationPrice {
  fuelType: string;
  communityPrice: number | null;
  reportId: string | null;
  doeData: {
    minPrice: number;
    maxPrice: number;
    commonPrice: number;
  } | null;
  verificationData: {
    confirmedCount: number;
    disputedCount: number;
    lastUpdated: string;
    reporterName?: string;
  } | null;
}

/**
 * Custom hook for managing price reporting functionality
 */
export function usePriceReporting(currentUser?: User | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [currentStation, setCurrentStation] = useState<GasStation | null>(null);
  const [currentFuelType, setCurrentFuelType] = useState<string | null>(null);
  const [initialPrice, setInitialPrice] = useState('');
  const [stationPrices, setStationPrices] = useState<StationPrice[]>([]);

  // Mock user for demonstration
  const mockUser = {
    id: '12345',
    email: 'demo@example.com',
    display_name: 'Demo User',
  };

  // Use mock user if no user provided
  const user = currentUser || mockUser;

  // Reset modal state when closed
  useEffect(() => {
    if (!isReportModalVisible) {
      setCurrentStation(null);
      setCurrentFuelType(null);
      setInitialPrice('');
    }
  }, [isReportModalVisible]);

  /**
   * Open price reporting modal
   */
  const openReportModal = useCallback(
    (
      station: GasStation,
      fuelType: string | null = null,
      price: number | string = ''
    ) => {
      setCurrentStation(station);
      setCurrentFuelType(fuelType);
      setInitialPrice(price.toString());
      setIsReportModalVisible(true);
    },
    []
  );

  /**
   * Close price reporting modal
   */
  const closeReportModal = useCallback(() => {
    setIsReportModalVisible(false);
  }, []);

  /**
   * Submit a new price report
   */
  const submitPriceReport = useCallback(
    async (reportData: PriceReportData) => {
      if (!reportData.stationId) {
        return;
      }

      setIsLoading(true);

      try {
        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create the report
        const { data, error } = await supabase
          .from('user_price_reports')
          .insert({
            station_id: reportData.stationId,
            fuel_type: reportData.fuelType,
            price: reportData.price,
            user_id: user.id,
            reported_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            upvotes: 1, // Start with 1 (the reporter's implicit upvote)
            downvotes: 0,
          })
          .select();

        if (error) throw error;

        Alert.alert(
          'Thank You!',
          'Your price report has been submitted. It helps keep the community informed.'
        );

        // Refresh prices after submission
        if (currentStation) {
          await getStationPrices(currentStation.id);
        }

        setIsReportModalVisible(false);
      } catch (error) {
        Alert.alert(
          'Error',
          'There was a problem submitting your report. Please try again.'
        );
        console.error('Error submitting price report:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentStation]
  );

  /**
   * Vote on an existing price report
   */
  const voteOnPrice = useCallback(
    async (reportId: string, isUpvote: boolean) => {
      setIsLoading(true);

      try {
        // Check if user has already voted
        const { data: existingVote } = await supabase
          .from('user_price_votes')
          .select('*')
          .eq('report_id', reportId)
          .eq('user_id', user.id)
          .single();

        // Get current report state
        const { data: report } = await supabase
          .from('user_price_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (!report) {
          throw new Error('Report not found');
        }

        // Calculate vote changes
        let upvoteDelta = 0;
        let downvoteDelta = 0;

        if (existingVote) {
          // Changing vote?
          if (existingVote.is_upvote !== isUpvote) {
            upvoteDelta = isUpvote ? 1 : -1;
            downvoteDelta = isUpvote ? -1 : 1;

            // Update vote record
            await supabase
              .from('user_price_votes')
              .update({ is_upvote: isUpvote })
              .eq('id', existingVote.id);
          }
        } else {
          // New vote
          upvoteDelta = isUpvote ? 1 : 0;
          downvoteDelta = isUpvote ? 0 : 1;

          // Create vote record
          await supabase.from('user_price_votes').insert({
            report_id: reportId,
            user_id: user.id,
            is_upvote: isUpvote,
          });
        }

        // Update report vote counts
        await supabase
          .from('user_price_reports')
          .update({
            upvotes: report.upvotes + upvoteDelta,
            downvotes: report.downvotes + downvoteDelta,
          })
          .eq('id', reportId);

        // Refresh prices after voting
        if (currentStation) {
          await getStationPrices(currentStation.id);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'There was a problem recording your vote. Please try again.'
        );
        console.error('Error voting on price:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentStation]
  );

  /**
   * Get community prices for a station
   */
  const getStationPrices = useCallback(
    async (stationId: string): Promise<StationPrice[]> => {
      setIsLoading(true);

      try {
        // Get latest week_of date for DOE prices
        const { data: latestWeek } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        // Get station info for brand and city
        const { data: station } = await supabase
          .from('gas_stations')
          .select('*')
          .eq('id', stationId)
          .single();

        if (!station) {
          throw new Error('Station not found');
        }

        // Get DOE prices for this station's brand and city
        const { data: doePrices } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek?.week_of || '')
          .eq('area', station.city)
          .ilike('brand', station.brand);

        // Create DOE prices lookup
        const doeByFuelType: Record<string, any> = {};
        (doePrices || []).forEach((price) => {
          doeByFuelType[price.fuel_type] = {
            minPrice: price.min_price,
            maxPrice: price.max_price,
            commonPrice: price.common_price,
          };
        });

        // Get all community-reported prices for this station
        const { data: communityPrices } = await supabase
          .from('user_price_reports')
          .select('*')
          .eq('station_id', stationId)
          .gte('expires_at', new Date().toISOString())
          .order('reported_at', { ascending: false }); // Order by most recent first

        // Process all fuel types (from both DOE and community)
        const fuelTypes = new Set<string>();
        (doePrices || []).forEach((price) => fuelTypes.add(price.fuel_type));
        (communityPrices || []).forEach((price) =>
          fuelTypes.add(price.fuel_type)
        );

        // Create result array
        const results: StationPrice[] = [];

        // For each fuel type, find the most relevant community price
        for (const fuelType of fuelTypes) {
          // Find community prices for this fuel type
          const pricesForType = (communityPrices || []).filter(
            (p) => p.fuel_type === fuelType
          );

          if (pricesForType.length > 0) {
            // Sort by reported_at (most recent first)
            // This is a change from the previous version which sorted by upvotes
            pricesForType.sort(
              (a, b) =>
                new Date(b.reported_at).getTime() -
                new Date(a.reported_at).getTime()
            );

            // Get most recent community price
            const latestPrice = pricesForType[0];

            // Format "time ago" for the report
            const reportTime = new Date(latestPrice.reported_at);
            const now = new Date();
            const diffMinutes = Math.floor(
              (now.getTime() - reportTime.getTime()) / (1000 * 60)
            );

            let lastUpdatedText: string;
            if (diffMinutes < 60) {
              lastUpdatedText = `${diffMinutes} minutes ago`;
            } else if (diffMinutes < 24 * 60) {
              const hours = Math.floor(diffMinutes / 60);
              lastUpdatedText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
              const days = Math.floor(diffMinutes / (24 * 60));
              lastUpdatedText = `${days} day${days > 1 ? 's' : ''} ago`;
            }

            // Add to results
            results.push({
              fuelType,
              communityPrice: latestPrice.price,
              reportId: latestPrice.id,
              doeData: doeByFuelType[fuelType] || null,
              verificationData: {
                confirmedCount: latestPrice.upvotes,
                disputedCount: latestPrice.downvotes,
                lastUpdated: lastUpdatedText,
                reporterName: 'Community User', // Placeholder - we would get real username
              },
            });
          } else {
            // No community price, just DOE data
            results.push({
              fuelType,
              communityPrice: null,
              reportId: null,
              doeData: doeByFuelType[fuelType] || null,
              verificationData: null,
            });
          }
        }

        setStationPrices(results);
        return results;
      } catch (error) {
        console.error('Error getting station prices:', error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  return {
    isLoading,
    isReportModalVisible,
    currentStation,
    currentFuelType,
    initialPrice,
    stationPrices,
    openReportModal,
    closeReportModal,
    submitPriceReport,
    voteOnPrice,
    getStationPrices,
  };
}
