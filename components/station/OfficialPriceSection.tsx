// components/station/OfficialPricesSection.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExtendedFuelPrice } from '@/utils/priceUtils';
import { formatCurrency, formatDate, isValidPrice } from '@/utils/formatters';
import { countValidPrices } from '@/utils/priceUtils';

interface OfficialPricesSectionProps {
  prices: ExtendedFuelPrice[];
  loading: boolean;
  weekOf?: string | null;
}

/**
 * Component to display the official DOE price data in a table format
 */
export const OfficialPricesSection: React.FC<OfficialPricesSectionProps> = ({
  prices,
  loading,
  weekOf,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='small' color='#2a9d8f' />
        <Text style={styles.loadingText}>Loading reference data...</Text>
      </View>
    );
  }

  if (prices.length === 0) {
    return (
      <Text style={styles.noData}>
        No reference price data available for this station.
      </Text>
    );
  }

  // Count how many prices have valid data (non-zero)
  const validPriceCount = countValidPrices(prices);

  // If none have valid prices, show a more helpful message
  if (validPriceCount === 0) {
    return (
      <View style={styles.noDataContainer}>
        <View style={styles.noDataRow}>
          <MaterialIcons name='info-outline' size={18} color='#999' />
          <Text style={styles.noDataText}>
            Official price data is available for this station, but current
            prices are not listed.
          </Text>
        </View>
        <Text style={styles.noDataSubText}>
          Visit this station for the latest prices, or report them if you have
          recent information.
        </Text>
        <Text style={styles.officialNoteText}>
          Data as of {formatDate(weekOf || prices[0]?.week_of)}
        </Text>
      </View>
    );
  }

  // Otherwise show the price table with "--" for zero prices
  return (
    <View style={styles.officialPricesContainer}>
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
          <Text style={styles.fuelType}>{price.display_type}:</Text>
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

      <Text style={styles.officialNoteText}>
        As of {formatDate(weekOf || prices[0]?.week_of)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
  noData: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  noDataContainer: {
    borderLeftColor: '#9e9e9e',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
  noDataSubText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 26,
    marginBottom: 12,
  },
  officialPricesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  officialNoteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'right',
  },
});

export default OfficialPricesSection;
