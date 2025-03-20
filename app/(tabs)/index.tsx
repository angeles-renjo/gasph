// app/(tabs)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useBestPrices } from '@/hooks/useBestPrices';
import BestPriceCard from '@/components/price/BestPriceCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { FUEL_TYPES } from '@/utils/constants';

// Make sure the import path is correct
import { mainScreenStyle as styles } from '@/styles';

export default function BestPricesScreen() {
  const { bestPrices, loading, error, locationName, refreshPrices } =
    useBestPrices();
  const [selectedFuelType, setSelectedFuelType] = useState<string>(
    FUEL_TYPES[0]
  );
  const [refreshing, setRefreshing] = useState(false);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPrices();
    setRefreshing(false);
  };

  // Get prices for the selected fuel type
  const currentPrices = bestPrices[selectedFuelType] || [];

  // Handle navigation to station details
  const handlePricePress = (stationId: string) => {
    if (stationId) {
      router.push(`/station/${stationId}`);
    } else {
      // If no station ID, show a helpful message
      Alert.alert(
        'Station Not Available',
        "We don't have details for this station in our database yet. Try searching for this brand in the Explore tab.",
        [{ text: 'OK' }]
      );
    }
  };

  // Render the fuel type filter
  const renderFuelTypeFilter = () => {
    // Get available fuel types from the data, or use constants if no data yet
    const fuelTypes =
      Object.keys(bestPrices).length > 0 ? Object.keys(bestPrices) : FUEL_TYPES;

    // Make sure our selected fuel type is valid
    if (fuelTypes.length > 0 && !fuelTypes.includes(selectedFuelType)) {
      setSelectedFuelType(fuelTypes[0]);
    }

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={fuelTypes}
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

  // Main content renderer
  const renderContent = () => {
    if (loading && !refreshing) {
      return <LoadingIndicator message='Finding best fuel prices...' />;
    }

    if (error) {
      return (
        <ErrorDisplay
          message={`Failed to load fuel prices: ${error}`}
          onRetry={refreshPrices}
        />
      );
    }

    if (currentPrices.length === 0) {
      return (
        <EmptyState
          title='No Prices Found'
          message={`We couldn't find any ${selectedFuelType} prices in your area. Try selecting a different fuel type or updating your location.`}
        />
      );
    }

    return (
      <FlatList
        data={currentPrices}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <BestPriceCard
            price={item}
            rank={index + 1}
            onPress={() => handlePricePress(item.stationId)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Best Fuel Prices</Text>
        <View style={styles.locationContainer}>
          <MaterialIcons name='location-on' size={16} color='#666' />
          <Text style={styles.locationText}>Near {locationName}</Text>
        </View>
      </View>

      {renderFuelTypeFilter()}
      {renderContent()}
    </View>
  );
}
