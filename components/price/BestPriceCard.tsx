// components/price/BestPriceCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/formatters';
import { BestPriceItem } from '@/hooks/useBestPrices';

interface BestPriceCardProps {
  price: BestPriceItem;
  rank: number;
  onPress: () => void;
}

const BestPriceCard: React.FC<BestPriceCardProps> = ({
  price,
  rank,
  onPress,
}) => {
  const getBackgroundColor = () => {
    // Different background colors based on rank
    switch (rank) {
      case 1:
        return '#e3f2fd'; // Light blue for the best price
      case 2:
        return '#e8f5e9'; // Light green for second best
      case 3:
        return '#fff8e1'; // Light yellow for third
      default:
        return '#ffffff'; // White for others
    }
  };

  const getRankEmoji = () => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  // For demonstration - we'll hardcode some distances
  // In a real implementation, this would come from price.distance
  const getDistance = () => {
    // This is just for demonstration
    // We would normally use price.distance here
    // Using a simple pattern based on rank for the demo
    switch (rank) {
      case 1:
        return '2.5km';
      case 2:
        return '3.1km';
      case 3:
        return '3.7km';
      case 4:
        return '4.2km';
      case 5:
        return '5.0km';
      default:
        return '3.5km';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: getBackgroundColor() }]}
      onPress={onPress}
      disabled={!price.stationId} // Disable if no station ID
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>
          {getRankEmoji()} #{rank}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(price.price)}</Text>
          <Text style={styles.stationName}>{price.stationName}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.area}>{price.area}</Text>

          {/* Show hardcoded distance */}
          <View style={styles.distanceContainer}>
            <MaterialIcons name='directions-car' size={14} color='#666' />
            <Text style={styles.distance}>{getDistance()}</Text>
          </View>
        </View>

        {!price.stationId && (
          <Text style={styles.noStationText}>No station details available</Text>
        )}
      </View>

      {price.stationId ? (
        <MaterialIcons
          name='chevron-right'
          size={24}
          color='#666'
          style={styles.chevron}
        />
      ) : (
        <MaterialIcons
          name='info-outline'
          size={20}
          color='#999'
          style={styles.chevron}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  rankContainer: {
    marginRight: 12,
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a9d8f',
    marginRight: 8,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  area: {
    fontSize: 14,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distance: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  noStationText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default BestPriceCard;
