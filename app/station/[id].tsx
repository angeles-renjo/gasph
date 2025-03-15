// app/station/[id].tsx - Station Details Screen
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
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { MaterialIcons } from '@expo/vector-icons';
import {
  formatOperatingHours,
  formatCurrency,
  formatDate,
} from '@/utils/formatters';
import { supabase } from '@/utils/supabase';

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { station, loading, error } = useStationById(id);

  // State for fuel prices
  const [fuelPrices, setFuelPrices] = useState<any[]>([]);
  const [priceDate, setPriceDate] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Load all fuel prices for this station
  useEffect(() => {
    const loadPrices = async () => {
      if (!station) return;

      setLoadingPrices(true);
      try {
        // Get latest week_of date
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

        setPriceDate(formatDate(latestWeek.week_of));

        // Get prices for this station's brand and city
        const { data } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand)
          .order('fuel_type');

        setFuelPrices(data || []);
      } catch (error) {
        console.error('Error loading fuel prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };

    loadPrices();
  }, [station]);

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
          {formatOperatingHours(station.operatingHours)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        {renderAmenities()}
      </View>

      {/* Fuel Price Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fuel Prices</Text>
        {loadingPrices ? (
          <ActivityIndicator size='small' color='#2a9d8f' />
        ) : fuelPrices.length > 0 ? (
          <>
            <Text style={styles.priceDate}>
              As of {priceDate || 'latest data'}
            </Text>
            <View style={styles.priceList}>
              {fuelPrices.map((price) => (
                <View key={price.id} style={styles.priceRow}>
                  <Text style={styles.fuelType}>{price.fuel_type}</Text>
                  <View style={styles.priceDetails}>
                    <Text style={styles.commonPrice}>
                      {formatCurrency(price.common_price)}
                    </Text>
                    <Text style={styles.priceRange}>
                      Range: {formatCurrency(price.min_price)} -{' '}
                      {formatCurrency(price.max_price)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.noData}>
            No price information available for this station.
          </Text>
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
  // Fuel price styles
  priceDate: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  priceList: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fuelType: {
    fontSize: 16,
    flex: 1,
  },
  priceDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  commonPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  priceRange: {
    fontSize: 12,
    color: '#666',
  },
});
