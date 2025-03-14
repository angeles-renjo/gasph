// app/(tabs)/index.tsx - Prices Tab with direct Supabase query
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { PriceCard } from '@/components/price/PriceCard';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { FUEL_TYPES } from '@/utils/constants';
import { FuelPrice } from '@/core/models/FuelPrice';
import { sortPricesByPrice } from '@/utils/sorting';
import { filterPricesByFuelType } from '@/utils/filtering';
import { supabase } from '@/utils/supabase';

export default function PricesScreen() {
  const [selectedFuelType, setSelectedFuelType] = useState<string>(
    FUEL_TYPES[0]
  );
  const [allPrices, setAllPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch prices directly from Supabase
  const fetchPrices = useCallback(async () => {
    console.log('Fetching prices directly from Supabase...');
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .order('week_of', { ascending: false });

      if (error) {
        console.error('Error fetching prices:', error);
        setError(error.message);
        return;
      }

      // Map the data to your model
      const mappedData: FuelPrice[] = (data || []).map((item) => ({
        id: item.id,
        area: item.area,
        brand: item.brand,
        fuelType: item.fuel_type,
        minPrice: item.min_price,
        maxPrice: item.max_price,
        commonPrice: item.common_price,
        weekOf: new Date(item.week_of),
        updatedAt: new Date(item.updated_at),
      }));

      console.log(`Fetched ${mappedData.length} prices from Supabase`);
      setAllPrices(mappedData);
      setError(null);
    } catch (err) {
      console.error('Exception during fetch:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load prices on component mount
  // Add this to your PricesScreen component
  useEffect(() => {
    const checkFuelTypes = async () => {
      try {
        console.log('Checking database fuel types...');
        const { data } = await supabase.from('fuel_prices').select('fuel_type');

        if (data && data.length > 0) {
          // Get unique fuel types from the database
          const dbFuelTypes = [...new Set(data.map((item) => item.fuel_type))];
          console.log('Fuel types in database:', dbFuelTypes);
          console.log('Fuel types in constants:', FUEL_TYPES);
        }
      } catch (err) {
        console.error('Error checking fuel types:', err);
      }
    };

    checkFuelTypes();
  }, []);

  // Filter prices by the selected fuel type
  const filteredPrices = filterPricesByFuelType(allPrices, selectedFuelType);

  // Sort prices by price (ascending)
  const sortedPrices = sortPricesByPrice(filteredPrices, true);

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPrices();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPrices]);

  const renderFuelTypeFilter = () => {
    return (
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Fuel Type:</Text>
        <FlatList
          horizontal
          data={FUEL_TYPES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterItem,
                selectedFuelType === item && styles.filterItemSelected,
              ]}
              onPress={() => setSelectedFuelType(item)}
            >
              <Text
                style={[
                  styles.filterItemText,
                  selectedFuelType === item && styles.filterItemTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingIndicator message='Loading fuel prices...' />;
    }

    if (error) {
      return (
        <ErrorDisplay
          message={`Failed to load fuel prices: ${error}`}
          onRetry={onRefresh}
        />
      );
    }

    if (sortedPrices.length === 0) {
      return (
        <EmptyState
          title='No Prices Found'
          message={`We couldn't find any ${selectedFuelType} prices. Try selecting a different fuel type.`}
        />
      );
    }

    return (
      <FlatList
        data={sortedPrices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PriceCard price={item} />}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Latest Fuel Prices</Text>
      <Text style={styles.debug}>
        Found {allPrices.length} total prices, {sortedPrices.length} matching{' '}
        {selectedFuelType}
      </Text>
      {renderFuelTypeFilter()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
    marginBottom: 8,
  },
  debug: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterContainer: {
    margin: 16,
    marginTop: 0,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
  },
  filterItemSelected: {
    backgroundColor: '#2a9d8f',
  },
  filterItemText: {
    fontSize: 14,
    color: '#333',
  },
  filterItemTextSelected: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 16,
  },
});
