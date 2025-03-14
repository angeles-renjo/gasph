// src/components/price/PriceCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FuelPrice } from '@/core/models/FuelPrice';
import { formatCurrency } from '@/utils/formatters';

interface PriceCardProps {
  price: FuelPrice;
  onPress?: () => void;
}

export const PriceCard: React.FC<PriceCardProps> = ({ price, onPress }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.brand}>{price.brand}</Text>
        <Text style={styles.fuelType}>{price.fuelType}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Common Price</Text>
        <Text style={styles.price}>{formatCurrency(price.commonPrice)}</Text>
      </View>

      <View style={styles.priceRange}>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>Min</Text>
          <Text style={styles.rangeValue}>
            {formatCurrency(price.minPrice)}
          </Text>
        </View>
        <View style={styles.rangeItem}>
          <Text style={styles.rangeLabel}>Max</Text>
          <Text style={styles.rangeValue}>
            {formatCurrency(price.maxPrice)}
          </Text>
        </View>
      </View>

      <Text style={styles.area}>{price.area}</Text>
      <Text style={styles.date}>
        Week of {new Date(price.weekOf).toLocaleDateString()}
      </Text>
    </View>
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
    marginBottom: 12,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fuelType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  priceContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  priceRange: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  rangeItem: {
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 12,
    color: '#888',
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  area: {
    fontSize: 14,
    color: '#444',
    marginTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
