// src/components/station/StationCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GasStation } from '@/core/models/GasStation';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/formatters';
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

  // Fetch prices for this station
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

        // Get prices for this station's brand and city
        const { data } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of)
          .eq('area', station.city)
          .ilike('brand', station.brand)
          .order('fuel_type');

        // Get only the main fuel types
        const mainFuels = (data || []).filter(
          (price) =>
            price.fuel_type === 'Gasoline (RON 95)' ||
            price.fuel_type === 'Gasoline (RON 91)' ||
            price.fuel_type === 'Diesel'
        );

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

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        <Text style={styles.distance}>{formatDistance(station.distance)}</Text>
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>

      {/* Price information section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color='#2a9d8f' />
          <Text style={styles.loadingText}>Loading prices...</Text>
        </View>
      ) : (
        prices.length > 0 && (
          <View style={styles.priceContainer}>
            {prices.map((price) => (
              <View key={price.id} style={styles.priceItem}>
                <Text style={styles.fuelType}>
                  {price.fuel_type.replace('Gasoline ', '')}
                </Text>
                <Text style={styles.price}>
                  {formatCurrency(price.common_price)}
                </Text>
              </View>
            ))}
          </View>
        )
      )}

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
  // Price section styles
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
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f5f7fa',
    borderRadius: 4,
  },
  priceItem: {
    alignItems: 'center',
  },
  fuelType: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
});
