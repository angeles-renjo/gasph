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

  // Format the distance string or provide a default
  const formatDistance = () => {
    if (price.distance === undefined || price.distance === null) {
      return 'Distance unknown';
    }

    if (price.distance < 0.1) {
      return `${Math.round(price.distance * 1000)} m`;
    } else if (price.distance < 1) {
      return `${(price.distance * 1000).toFixed(0)} m`;
    }

    return `${price.distance.toFixed(1)} km`;
  };

  // Format fuel type to handle Diesel vs Diesel Plus
  const formatFuelType = (fuelType: string) => {
    // Check if it's a diesel type and add appropriate suffix
    if (fuelType.toLowerCase() === 'diesel') {
      // For regular diesel, no change needed
      return 'Diesel';
    } else if (
      fuelType.toLowerCase().includes('diesel') &&
      fuelType.toLowerCase().includes('plus')
    ) {
      return 'Diesel Plus';
    }
    return fuelType;
  };

  // Determine if we have enough station data to show the detail page
  const hasStationDetails = !!price.stationId;

  // Format name and brand
  const displayName = price.stationName || price.brand;
  const displayTitle =
    displayName.length > 20
      ? displayName.substring(0, 18) + '...'
      : displayName;

  // Function to render source badge
  const renderSourceBadge = () => {
    if (price.source === 'community') {
      return (
        <View style={styles.sourceBadge}>
          <MaterialIcons name='people' size={12} color='#fff' />
          <Text style={styles.sourceBadgeText}>Community</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.refDataBadge}>
          <MaterialIcons name='info-outline' size={12} color='#fff' />
          <Text style={styles.sourceBadgeText}>DOE Ref. Data</Text>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: getBackgroundColor() }]}
      onPress={onPress}
      disabled={!hasStationDetails} // Disable if no station ID
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>
          {getRankEmoji()} #{rank}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(price.price)}</Text>
            <Text style={styles.stationName}>{displayTitle}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.locationInfo}>
            <Text style={styles.area}>{price.area}</Text>
            <View style={styles.distanceContainer}>
              <MaterialIcons name='directions-car' size={14} color='#666' />
              <Text style={styles.distance}>{formatDistance()}</Text>
            </View>
          </View>

          <View style={styles.badgeContainer}>{renderSourceBadge()}</View>
        </View>

        {/* Show fuel type if it's needed to distinguish between multiple types */}
        {price.fuelType && price.fuelType.toLowerCase().includes('diesel') && (
          <Text style={styles.fuelTypeLabel}>
            {formatFuelType(price.fuelType)}
          </Text>
        )}

        {!hasStationDetails && (
          <Text style={styles.noStationText}>No station details available</Text>
        )}
      </View>

      {hasStationDetails ? (
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  rankContainer: {
    marginRight: 8,
    width: 30,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    flex: 1,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  area: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  fuelTypeLabel: {
    fontSize: 12,
    color: '#2a9d8f',
    fontWeight: '500',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#607D8B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
    fontWeight: '500',
  },
});

export default BestPriceCard;
