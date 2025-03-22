// app/(tabs)/explore.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useLocationStations } from '@/hooks/useLocationStations';
import { StationCard } from '@/components/station/StationCard';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { exploreScreen as styles } from '@/styles';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { stations, location, loading, error, refreshStations } =
    useLocationStations(5); // 5 km radius

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStations();
    } catch (refreshError) {
      console.error('Refresh error:', refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [refreshStations]);

  // Improved search function that checks multiple fields
  const getFilteredStations = () => {
    if (!searchQuery.trim()) return stations;

    const query = searchQuery.toLowerCase().trim();

    return stations.filter((station) => {
      // Search by name (most specific)
      if (station.name.toLowerCase().includes(query)) return true;

      // Search by brand (helps match what users see in Prices tab)
      if (station.brand.toLowerCase().includes(query)) return true;

      // Search by address
      if (station.address.toLowerCase().includes(query)) return true;

      // Search by city
      if (station.city.toLowerCase().includes(query)) return true;

      // Search by brand + city combination (helps match DOE price entries)
      const brandCityCombo = `${station.brand} ${station.city}`.toLowerCase();
      if (brandCityCombo.includes(query)) return true;

      return false;
    });
  };

  const filteredStations = getFilteredStations();

  const renderContent = () => {
    if (loading && !refreshing) {
      return <LoadingIndicator message='Finding nearby gas stations...' />;
    }

    if (error) {
      return (
        <ErrorDisplay
          message={`Failed to load nearby stations: ${error.message}`}
          onRetry={onRefresh}
        />
      );
    }

    if (stations.length === 0) {
      return (
        <EmptyState
          title='No Stations Found'
          message="We couldn't find any gas stations nearby. Try increasing the search radius or try again later."
        />
      );
    }

    if (filteredStations.length === 0) {
      return (
        <EmptyState
          title='No Matches'
          message={`No stations match your search for "${searchQuery}". Try a different search term.`}
        />
      );
    }

    return (
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StationCard
            station={item}
            distance={item.distance}
            onPress={() => router.push(`/station/${item.id}`)}
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
      <Text style={styles.title}>Nearby Gas Stations</Text>

      <View style={styles.searchContainer}>
        <MaterialIcons
          name='search'
          size={24}
          color='#999'
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search by name, brand, or location'
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <MaterialIcons
            name='clear'
            size={24}
            color='#999'
            style={styles.clearIcon}
            onPress={() => setSearchQuery('')}
          />
        ) : null}
      </View>

      {renderContent()}
    </View>
  );
}
