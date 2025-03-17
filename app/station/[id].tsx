// app/station/[id].tsx - Enhanced with DOE prices
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
import { FUEL_TYPES } from '@/utils/constants';
import PriceCard from '@/components/price/PriceCard';
import PriceReportingModal from '@/components/price/PriceReportingModal';
import { supabase } from '@/utils/supabase';
import { FuelPrice } from '@/core/models/FuelPrice';

// Mock user for demonstration
const DEMO_USER = {
  id: '12345',
  email: 'demo@example.com',
  display_name: 'Demo User',
};

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: station, loading, error } = useStationById(id);
  const [doePrices, setDoePrices] = useState<FuelPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

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

  // Load DOE prices when station data is available
  useEffect(() => {
    const fetchDoePrices = async () => {
      if (!station) return;

      try {
        setLoadingPrices(true);

        // Get latest week
        const { data: latestWeek } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (!latestWeek) {
          setLoadingPrices(false);
          return;
        }

        // Get matching prices for this station's brand and city
        const { data } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand)
          .order('fuel_type');

        if (data && data.length > 0) {
          setDoePrices(data);
        }
      } catch (error) {
        console.error('Error fetching DOE prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchDoePrices();
  }, [station]);

  // Load station prices when station data is available
  useEffect(() => {
    const loadStationPrices = async () => {
      if (station) {
        await getStationPrices(station.id);
      }
    };

    loadStationPrices();
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

  // Render the DOE prices section
  const renderDoePrices = () => {
    if (loadingPrices) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color='#2a9d8f' />
          <Text style={styles.loadingText}>Loading official prices...</Text>
        </View>
      );
    }

    if (doePrices.length === 0) {
      return (
        <Text style={styles.noData}>
          No official DOE price data available for this station.
        </Text>
      );
    }

    return (
      <View style={styles.doePricesContainer}>
        <View style={styles.doeBadge}>
          <Text style={styles.doeBadgeText}>DOE Official Prices</Text>
        </View>

        {doePrices.map((price) => (
          <View key={price.id} style={styles.doePriceItem}>
            <Text style={styles.doeFuelType}>{price.fuel_type}</Text>
            <Text style={styles.doePrice}>
              {formatCurrency(price.common_price)}
            </Text>
          </View>
        ))}

        <Text style={styles.doeNoteText}>
          Source: Department of Energy Price Monitoring (
          {formatDate(doePrices[0]?.week_of)})
        </Text>
      </View>
    );
  };

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

      {/* Official DOE Prices Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Official Prices</Text>
        {renderDoePrices()}
      </View>

      {/* Community Reported Prices Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Prices</Text>
          <Pressable
            style={styles.addPriceButton}
            onPress={() => openReportModal(station)}
          >
            <MaterialIcons name='add' size={16} color='#fff' />
            <Text style={styles.addPriceText}>Add Price</Text>
          </Pressable>
        </View>

        {isPriceLoading ? (
          <ActivityIndicator size='small' color='#2a9d8f' />
        ) : stationPrices.length > 0 ? (
          stationPrices.map((priceData) => (
            <PriceCard
              key={priceData.fuelType}
              fuelType={priceData.fuelType}
              communityPrice={priceData.communityPrice}
              doeData={priceData.doeData}
              verificationData={priceData.verificationData}
              onConfirm={() => handleConfirmPrice(priceData.reportId)}
              onDispute={() => handleDisputePrice(priceData.reportId)}
              onUpdate={() =>
                handleUpdatePrice(priceData.fuelType, priceData.communityPrice)
              }
            />
          ))
        ) : (
          <View style={styles.noPricesContainer}>
            <Text style={styles.noData}>
              No community price reports yet for this station.
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

      {/* Price Reporting Modal */}
      {currentStation && (
        <PriceReportingModal
          visible={isReportModalVisible}
          onClose={closeReportModal}
          onSubmit={submitPriceReport}
          stationName={currentStation.name}
          stationId={currentStation.id}
          initialPrice={initialPrice}
          selectedFuelType={currentFuelType || undefined}
          fuelTypes={FUEL_TYPES}
          isLoading={isPriceLoading}
        />
      )}
    </ScrollView>
  );
}

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
  // DOE Prices section
  doePricesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  doeBadge: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  doeBadgeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  doePriceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  doeFuelType: {
    fontSize: 15,
    color: '#424242',
  },
  doePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  doeNoteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
