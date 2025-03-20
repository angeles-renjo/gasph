// app/station/[id].tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/utils/supabase';

// Custom hooks
import { useStationById } from '@/hooks/useStationService';
import { usePriceReporting } from '@/hooks/usePriceService';
import { useStationPrices } from '@/hooks/useStationPrice';
import { usePriceCycle } from '@/hooks/usePriceCycle';

// Components
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import StationHeader from '@/components/station/StationHeader';
import OfficialPricesSection from '@/components/station/OfficialPriceSection';
import CommunityPricesSection from '@/components/station/CommunityPricesSection';
import PriceReportingModal from '@/components/price/PriceReportingModal';
import ActionButtons from '@/components/station/ActionButtons';
import StationInfoSection from '@/components/station/StatusInfoSecition';

// Constants and styles
import { FUEL_TYPES } from '@/utils/constants';
import { stationDetailsStyles as styles } from '@/styles/screens/StationDetailsScreen';

/**
 * Station details screen showing official prices, community prices, and station info
 */
export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: station, loading, error } = useStationById(id);
  const { currentCycle, daysRemaining } = usePriceCycle();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Custom hooks for data
  const {
    doePrices,
    loading: loadingPrices,
    weekOf,
  } = useStationPrices(station);

  // Get the authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    };

    getUser();
  }, []);

  // Use the price reporting hook with the current user
  const priceReporting = usePriceReporting(currentUser);

  // Load station prices when station data is available
  useEffect(() => {
    if (station) {
      priceReporting.getStationPrices(station.id);
    }
  }, [station, priceReporting.getStationPrices]);

  if (loading) {
    return <LoadingIndicator message='Loading station details...' />;
  }

  if (error || !station) {
    return (
      <ErrorDisplay
        message='Failed to load station details. Please try again.'
        onRetry={() => router.replace(`/station/${id}`)}
      />
    );
  }

  // Event handlers
  const handleConfirmPrice = (reportId: string | null) => {
    if (reportId && checkIfUserLoggedIn()) {
      priceReporting.voteOnPrice(reportId, true);
    }
  };

  const handleDisputePrice = (reportId: string | null) => {
    if (reportId && checkIfUserLoggedIn()) {
      priceReporting.voteOnPrice(reportId, false);
    }
  };

  const handleUpdatePrice = (fuelType: string, currentPrice: number | null) => {
    if (checkIfUserLoggedIn()) {
      priceReporting.openReportModal(station, fuelType, currentPrice || '');
    }
  };

  const handleAddPrice = () => {
    if (checkIfUserLoggedIn()) {
      priceReporting.openReportModal(station);
    }
  };

  const checkIfUserLoggedIn = () => {
    // For testing without authentication, always return true
    return true;

    // When you implement auth, replace with this:
    /*
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to report prices.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
    */
  };

  const handleGetDirections = () => {
    // TODO: Implement directions functionality
    Alert.alert(
      'Coming Soon',
      'Directions feature will be available in a future update.'
    );
  };

  const handleSaveStation = () => {
    // TODO: Implement save station functionality
    Alert.alert(
      'Coming Soon',
      'Save station feature will be available in a future update.'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StationHeader station={station} onBack={() => router.back()} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DOE Reference Data</Text>
        <OfficialPricesSection
          prices={doePrices}
          loading={loadingPrices}
          weekOf={weekOf}
        />
      </View>

      <CommunityPricesSection
        prices={priceReporting.stationPrices}
        loading={priceReporting.isLoading}
        cycle={{ currentCycle, daysRemaining }}
        onAddPrice={handleAddPrice}
        onConfirm={handleConfirmPrice}
        onDispute={handleDisputePrice}
        onUpdate={handleUpdatePrice}
      />

      <ActionButtons
        onGetDirections={handleGetDirections}
        onSaveStation={handleSaveStation}
      />

      <StationInfoSection
        hours={station.operating_hours}
        amenities={station.amenities}
      />

      {/* Price Reporting Modal */}
      {priceReporting.currentStation && (
        <PriceReportingModal
          visible={priceReporting.isReportModalVisible}
          onClose={priceReporting.closeReportModal}
          onSubmit={priceReporting.submitPriceReport}
          stationName={priceReporting.currentStation.name}
          stationId={priceReporting.currentStation.id}
          initialPrice={priceReporting.initialPrice}
          selectedFuelType={priceReporting.currentFuelType || undefined}
          fuelTypes={FUEL_TYPES}
          isLoading={priceReporting.isLoading}
        />
      )}
    </ScrollView>
  );
}
