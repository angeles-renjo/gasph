// components/station/StationCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GasStation } from '@/core/models/GasStation';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency, isValidPrice } from '@/utils/formatters';
import { supabase } from '@/utils/supabase';
import { ActivityIndicator } from 'react-native';

interface StationCardProps {
  station: GasStation;
  distance?: number;
  onPress?: () => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  distance,
  onPress,
}) => {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch prices for this station using brand + city matching
  useEffect(() => {
    const fetchPrices = async () => {
      if (!station) return;

      setLoading(true);
      try {
        // Get latest week_of date
        const { data: latestWeek } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (!latestWeek) {
          setLoading(false);
          return;
        }

        // Get prices for this station's brand and city - exact match
        const { data } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand) // Case-insensitive match for brand
          .order('fuel_type');

        // Check if any non-zero prices exist
        const validPrices = (data || []).filter((price) =>
          isValidPrice(price.common_price)
        );

        // Get only the main fuel types - prioritize non-zero prices
        const fuelTypesToShow = [
          'Gasoline (RON 95)',
          'Gasoline (RON 91)',
          'Diesel',
        ];

        // If we have valid prices, prioritize them
        let mainFuels: any[] = [];

        if (validPrices.length > 0) {
          // Only show valid prices - filter by main fuel types
          mainFuels = validPrices.filter((price) =>
            fuelTypesToShow.includes(price.fuel_type)
          );
        } else if (data && data.length > 0) {
          // No valid prices, but show the available main fuel types anyway
          mainFuels = data.filter((price) =>
            fuelTypesToShow.includes(price.fuel_type)
          );
        }

        setPrices(mainFuels);
      } catch (error) {
        console.error('Error fetching prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [station]);

  const formatDistance = (km?: number) => {
    if (km === undefined || km === null) return 'Unknown';

    if (km < 0.1) {
      return `${Math.round(km * 1000)} m`;
    } else if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const renderAmenities = () => {
    if (!station.amenities || station.amenities.length === 0) {
      return null;
    }

    return (
      <View style={styles.amenitiesContainer}>
        {station.amenities.slice(0, 3).map((amenity, index) => (
          <View key={index} style={styles.amenityTag}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
        {station.amenities.length > 3 && (
          <View style={styles.amenityTag}>
            <Text style={styles.amenityText}>
              +{station.amenities.length - 3}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getStatusIcon = () => {
    switch (station.status) {
      case 'active':
        return <MaterialIcons name='check-circle' size={16} color='#4caf50' />;
      case 'temporary_closed':
        return <MaterialIcons name='warning' size={16} color='#ff9800' />;
      case 'permanently_closed':
        return <MaterialIcons name='cancel' size={16} color='#f44336' />;
      case 'inactive':
        return <MaterialIcons name='cancel' size={16} color='#9e9e9e' />;
      default:
        return null;
    }
  };

  // Simplified function to get display name for fuel type
  const getShortFuelTypeName = (fuelType: string): string => {
    if (fuelType.includes('Diesel')) return 'Diesel';
    if (fuelType.includes('RON 95')) return 'RON 95';
    if (fuelType.includes('RON 91')) return 'RON 91';
    if (fuelType.includes('RON 97')) return 'RON 97';
    if (fuelType.includes('RON 100')) return 'RON 100';
    return fuelType;
  };

  // Check if we have any valid prices
  const hasValidPrices = prices.some((price) =>
    isValidPrice(price.common_price)
  );

  // Render the prices in a columnar format
  const renderColumnPrices = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color='#2a9d8f' />
          <Text style={styles.loadingText}>Loading prices...</Text>
        </View>
      );
    }

    if (prices.length === 0) {
      return null;
    }

    return (
      <View
        style={[
          styles.priceContainer,
          !hasValidPrices && styles.noDataContainer,
        ]}
      >
        <Text style={styles.priceTitle}>
          {hasValidPrices ? 'Official Prices' : 'No Price Data Available'}
        </Text>

        {hasValidPrices ? (
          <>
            {/* Header row for the columns */}
            <View style={styles.priceHeaderRow}>
              <Text style={styles.fuelTypeHeader}></Text>
              <Text style={styles.priceHeader}>Min</Text>
              <Text style={styles.priceHeader}>Common</Text>
              <Text style={styles.priceHeader}>Max</Text>
            </View>

            {/* One row per fuel type */}
            {prices.map((price) => (
              <View key={price.id} style={styles.priceRow}>
                <Text style={styles.fuelType}>
                  {getShortFuelTypeName(price.fuel_type)}:
                </Text>
                <Text
                  style={[
                    styles.price,
                    !isValidPrice(price.min_price) && styles.noPrice,
                  ]}
                >
                  {formatCurrency(price.min_price)}
                </Text>
                <Text
                  style={[
                    styles.price,
                    !isValidPrice(price.common_price) && styles.noPrice,
                  ]}
                >
                  {formatCurrency(price.common_price)}
                </Text>
                <Text
                  style={[
                    styles.price,
                    !isValidPrice(price.max_price) && styles.noPrice,
                  ]}
                >
                  {formatCurrency(price.max_price)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.noPriceMessage}>
            <MaterialIcons name='info-outline' size={16} color='#999' />
            <Text style={styles.noPriceMessageText}>
              Visit station for current prices
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        <Text style={styles.distance}>{formatDistance(distance)}</Text>
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>

      {/* Price information section */}
      {renderColumnPrices()}

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={styles.status}>{station.status.replace('_', ' ')}</Text>
        </View>

        {renderAmenities()}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  distance: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: '#e0f2f1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  amenityText: {
    fontSize: 12,
    color: '#00796b',
  },
  // Loading styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // New columnar price styles
  priceContainer: {
    marginTop: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f5f7fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2a9d8f',
  },
  noDataContainer: {
    borderLeftColor: '#9e9e9e',
    backgroundColor: '#f5f5f5',
  },
  priceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2a9d8f',
    marginBottom: 8,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fuelTypeHeader: {
    flex: 1.5,
    fontSize: 12,
    color: '#666',
  },
  priceHeader: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fuelType: {
    flex: 1.5,
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  price: {
    flex: 1,
    fontSize: 14,
    color: '#2a9d8f',
    textAlign: 'center',
    fontWeight: '500',
  },
  noPrice: {
    color: '#999',
    fontStyle: 'italic',
  },
  noPriceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  noPriceMessageText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
  },
});
