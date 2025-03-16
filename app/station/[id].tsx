// app/station/[id].tsx - Enhanced Station Details Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useStationById } from '@/hooks/useStationService';
import { usePriceReporting } from '@/hooks/usePriceService';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { MaterialIcons } from '@expo/vector-icons';
import {
  formatOperatingHours,
  formatCurrency,
  formatDate,
} from '@/utils/formatters';
import { supabase } from '@/utils/supabase';
import PriceCard from '@/components/price/PriceCard';
import PriceReportingModal from '@/components/price/PriceReportingModal';
import { FUEL_TYPES } from '@/utils/constants';

// Mock user for demonstration
const DEMO_USER = {
  id: '12345',
  email: 'demo@example.com',
  display_name: 'Demo User',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#444',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: '#e0f2f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    margin: 4,
  },
  amenityText: {
    fontSize: 14,
    color: '#00796b',
  },
  noData: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  noPricesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  reportFirstButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  reportFirstText: {
    color: '#fff',
    fontWeight: '500',
  },
  addPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addPriceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 24,
    marginHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#2a9d8f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: station, loading, error } = useStationById(id);

  // State for DOE fuel prices
  const [doePrices, setDoePrices] = useState<any[]>([]);
  const [priceDate, setPriceDate] = useState<string | null>(null);
  const [loadingDoePrices, setLoadingDoePrices] = useState(false);

  // Use the price reporting hook
  const {
    isLoading: isPriceLoading,
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
  } = usePriceReporting(DEMO_USER);

  // Load all DOE fuel prices for this station
  useEffect(() => {
    const loadDoePrices = async () => {
      if (!station) return;

      setLoadingDoePrices(true);
      try {
        // Get latest week_of date
        const { data: latestWeek } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (!latestWeek) {
          setLoadingDoePrices(false);
          return;
        }

        setPriceDate(formatDate(latestWeek.week_of));

        // Get prices for this station's brand and city
        const { data } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand)
          .order('fuel_type');

        setDoePrices(data || []);
      } catch (error) {
        console.error('Error loading fuel prices:', error);
      } finally {
        setLoadingDoePrices(false);
      }
    };

    loadDoePrices();
  }, [station]);

  // Load community prices
  useEffect(() => {
    const loadCommunityPrices = async () => {
      if (!station) return;
      await getStationPrices(station.id);
    };

    loadCommunityPrices();
  }, [station, getStationPrices]);

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

  // Prepare data for price cards by combining DOE data with community prices
  const preparePriceCardData = () => {
    // First get all unique fuel types
    const fuelTypesSet = new Set<string>();
    doePrices.forEach((price) => fuelTypesSet.add(price.fuel_type));
    stationPrices.forEach((price) => fuelTypesSet.add(price.fuelType));

    // Create price card data
    const priceCardData = Array.from(fuelTypesSet).map((fuelType) => {
      // Find DOE price for this fuel type
      const doePrice = doePrices.find((price) => price.fuel_type === fuelType);

      // Find community price for this fuel type
      const communityPrice = stationPrices.find(
        (price) => price.fuelType === fuelType
      );

      // Create DOE data object if available
      const doeData = doePrice
        ? {
            minPrice: doePrice.min_price,
            maxPrice: doePrice.max_price,
            commonPrice: doePrice.common_price,
          }
        : null;

      return {
        fuelType,
        stationName: station.name,
        brandLogo: `https://example.com/logos/${station.brand
          .toLowerCase()
          .replace(' ', '_')}.png`, // Replace with actual logo URL
        communityPrice: communityPrice?.communityPrice || null,
        doeData,
        verificationData: communityPrice?.verificationData || null,
        distance: station.distance || 0,
        reportId: communityPrice?.reportId || null,
      };
    });

    return priceCardData;
  };

  const renderAmenities = () => {
    if (!station.amenities || station.amenities.length === 0) {
      return <Text style={styles.noData}>No amenities listed</Text>;
    }

    return (
      <View style={styles.amenitiesContainer}>
        {station.amenities.map((amenity, index) => (
          <View key={index} style={styles.amenityTag}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>
    );
  };

  const getStatusColor = () => {
    switch (station.status) {
      case 'active':
        return '#4caf50';
      case 'temporary_closed':
        return '#ff9800';
      case 'permanently_closed':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const handleConfirmPrice = (reportId: string | null) => {
    if (reportId) {
      voteOnPrice(reportId, true);
    }
  };

  const handleDisputePrice = (reportId: string | null) => {
    if (reportId) {
      voteOnPrice(reportId, false);
    }
  };

  const handleUpdatePrice = (fuelType: string, currentPrice: number | null) => {
    openReportModal(station, fuelType, currentPrice || '');
  };

  const priceCardData = preparePriceCardData();

  return (
    <ScrollView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name='arrow-back' size={24} color='#333' />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
        >
          <Text style={styles.statusText}>
            {station.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hours</Text>
        <Text style={styles.sectionContent}>
          {formatOperatingHours(station.operating_hours)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        {renderAmenities()}
      </View>

      {/* Fuel Price Section with Enhanced Price Cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fuel Prices</Text>
          <Pressable
            style={styles.addPriceButton}
            onPress={() => openReportModal(station)}
          >
            <MaterialIcons name='add' size={16} color='#fff' />
            <Text style={styles.addPriceText}>Add Price</Text>
          </Pressable>
        </View>

        {isPriceLoading || loadingDoePrices ? (
          <ActivityIndicator size='small' color='#2a9d8f' />
        ) : priceCardData.length > 0 ? (
          <FlatList
            data={priceCardData}
            keyExtractor={(item) => item.fuelType}
            renderItem={({ item }) => (
              <PriceCard
                stationName={item.stationName}
                brandLogo={item.brandLogo}
                fuelType={item.fuelType}
                communityPrice={item.communityPrice}
                doeData={item.doeData}
                verificationData={item.verificationData}
                distance={item.distance}
                onConfirm={() => handleConfirmPrice(item.reportId)}
                onDispute={() => handleDisputePrice(item.reportId)}
                onUpdate={() =>
                  handleUpdatePrice(item.fuelType, item.communityPrice)
                }
              />
            )}
            scrollEnabled={false} // Prevent nested scrolling
          />
        ) : (
          <View style={styles.noPricesContainer}>
            <Text style={styles.noData}>
              No price information available for this station.
            </Text>
            <Pressable
              style={styles.reportFirstButton}
              onPress={() => openReportModal(station)}
            >
              <Text style={styles.reportFirstText}>Report First Price</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton}>
          <MaterialIcons name='directions' size={24} color='#fff' />
          <Text style={styles.actionButtonText}>Directions</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <MaterialIcons name='favorite-border' size={24} color='#fff' />
          <Text style={styles.actionButtonText}>Save</Text>
        </Pressable>
      </View>

      {/* Price Reporting Modal */}
      {currentStation && (
        <PriceReportingModal
          visible={isReportModalVisible}
          onClose={closeReportModal}
          onSubmit={submitPriceReport}
          stationName={currentStation.name}
          stationId={currentStation.id}
          initialPrice={initialPrice}
          fuelTypes={FUEL_TYPES}
          isLoading={isPriceLoading}
        />
      )}
    </ScrollView>
  );
}
