// src/components/station/StationCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GasStation } from '@/core/models/GasStation';
import { MaterialIcons } from '@expo/vector-icons';

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
  const formatDistance = (km: number) => {
    if (km < 1) {
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
      case 'operational':
        return <MaterialIcons name='check-circle' size={16} color='#4caf50' />;
      case 'temporarily_closed':
        return <MaterialIcons name='warning' size={16} color='#ff9800' />;
      case 'closed':
        return <MaterialIcons name='cancel' size={16} color='#f44336' />;
      default:
        return null;
    }
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        {distance !== undefined && (
          <Text style={styles.distance}>{formatDistance(distance)}</Text>
        )}
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>

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
});
