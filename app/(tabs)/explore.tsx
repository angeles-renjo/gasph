// app/(tabs)/explore.tsx - Explore Tab
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNearbyStations } from '@/hooks/useStationService';
import { StationCard } from '@/components/station/StationCard';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { stations, loading, error } = useNearbyStations(5); // 5 km radius

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Wait a bit and then stop refreshing
    // In a real app, you'd re-fetch the data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderContent = () => {
    if (loading) {
      return <LoadingIndicator message='Finding nearby gas stations...' />;
    }

    if (error) {
      return (
        <ErrorDisplay
          message='Failed to load nearby stations. Please check your location permissions and try again.'
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

    const filteredStations = searchQuery
      ? stations.filter(
          (station) =>
            station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            station.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            station.brand.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : stations;

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
          placeholder='Search by name, brand, or address'
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  clearIcon: {
    marginHorizontal: 8,
  },
  listContainer: {
    paddingBottom: 16,
  },
});
