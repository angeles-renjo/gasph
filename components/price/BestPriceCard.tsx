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
        <View style={[styles.sourceBadge, styles.doeBadge]}>
          <MaterialIcons name='verified' size={12} color='#fff' />
          <Text style={styles.sourceBadgeText}>Official</Text>
        </View>
      );
    }
  };

  // Function to render confidence indicator
  const renderConfidenceIndicator = () => {
    if (price.source === 'community') {
      const confidenceLevel =
        price.confidence >= 0.8
          ? 'High'
          : price.confidence >= 0.5
          ? 'Medium'
          : 'Low';

      const confidenceColor =
        price.confidence >= 0.8
          ? '#4caf50'
          : price.confidence >= 0.5
          ? '#ff9800'
          : '#f44336';

      return (
        <View
          style={[styles.confidenceIndicator, { borderColor: confidenceColor }]}
        >
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {confidenceLevel}
          </Text>
        </View>
      );
    }
    return null;
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
          {renderSourceBadge()}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.area}>{price.area}</Text>

          <View style={styles.rightDetails}>
            {renderConfidenceIndicator()}

            <View style={styles.distanceContainer}>
              <MaterialIcons name='directions-car' size={14} color='#666' />
              <Text style={styles.distance}>{formatDistance()}</Text>
            </View>
          </View>
        </View>

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rightDetails: {
    flexDirection: 'row',
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
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  doeBadge: {
    backgroundColor: '#4CAF50',
  },
  sourceBadgeText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
    fontWeight: '500',
  },
  confidenceIndicator: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default BestPriceCard;
