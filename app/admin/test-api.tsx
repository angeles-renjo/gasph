// app/admin/test-api.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useServiceContext } from '@/context/ServiceContext';

export default function TestApiScreen() {
  const { googlePlacesService, gasStationRepository } = useServiceContext();
  const [loading, setLoading] = useState(false);
  const [googleResults, setGoogleResults] = useState<any>(null);
  const [supabaseResults, setSupabaseResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGooglePlacesApi = async () => {
    setLoading(true);
    setError(null);
    setGoogleResults(null);

    try {
      // Test a simple search for gas stations in Quezon City
      const result = await googlePlacesService.searchGasStationsInCity(
        'Quezon City'
      );

      // Show only the first station details for brevity
      setGoogleResults({
        status: 'Success',
        stationsFound: result.stations.length,
        hasNextPage: !!result.nextPageToken,
        firstStation: result.stations[0]
          ? {
              name: result.stations[0].name,
              vicinity: result.stations[0].vicinity,
              place_id: result.stations[0].place_id,
              types: result.stations[0].types,
            }
          : null,
      });

      if (result.stations.length > 0) {
        // Also test the place details API
        const details = await googlePlacesService.getPlaceDetails(
          result.stations[0].place_id
        );
        console.log('Place details test succeeded:', details.name);
      }
    } catch (err) {
      console.error('Google API test error:', err);
      setError(
        `Google API test failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    setError(null);
    setSupabaseResults(null);

    try {
      // Test database connection by getting the count of gas stations
      const stations = await gasStationRepository.findAll();

      // Get count by brand
      const brandCounts: Record<string, number> = {};
      stations.forEach((station) => {
        brandCounts[station.brand] = (brandCounts[station.brand] || 0) + 1;
      });

      // Get station count by city
      const cityCounts: Record<string, number> = {};
      stations.forEach((station) => {
        if (station.city) {
          cityCounts[station.city] = (cityCounts[station.city] || 0) + 1;
        }
      });

      setSupabaseResults({
        status: 'Success',
        totalStations: stations.length,
        brandCounts: Object.entries(brandCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5), // Top 5 brands
        cityCounts: Object.entries(cityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5), // Top 5 cities
      });
    } catch (err) {
      console.error('Supabase test error:', err);
      setError(
        `Supabase test failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name='arrow-back' size={24} color='#333' />
          <Text style={styles.backButtonText}>Back to Admin</Text>
        </TouchableOpacity>

        <Text style={styles.title}>API Test Tools</Text>
        <Text style={styles.subtitle}>
          Test the connections to external APIs and the database.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <MaterialIcons
              name='map'
              size={20}
              color='#2a9d8f'
              style={styles.cardIcon}
            />
            Google Places API Test
          </Text>
          <Text style={styles.cardDescription}>
            Test the connection to Google Places API by searching for gas
            stations in Quezon City.
          </Text>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testGooglePlacesApi}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#fff' size='small' />
            ) : (
              <Text style={styles.testButtonText}>Test Google Places API</Text>
            )}
          </TouchableOpacity>

          {googleResults && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results:</Text>
              <Text style={styles.resultItem}>
                Status: {googleResults.status}
              </Text>
              <Text style={styles.resultItem}>
                Stations Found: {googleResults.stationsFound}
              </Text>
              <Text style={styles.resultItem}>
                Has Next Page: {googleResults.hasNextPage ? 'Yes' : 'No'}
              </Text>

              {googleResults.firstStation && (
                <>
                  <Text style={styles.resultSubtitle}>First Station:</Text>
                  <Text style={styles.resultItem}>
                    Name: {googleResults.firstStation.name}
                  </Text>
                  <Text style={styles.resultItem}>
                    Address: {googleResults.firstStation.vicinity}
                  </Text>
                  <Text style={styles.resultItem}>
                    Place ID: {googleResults.firstStation.place_id}
                  </Text>
                  <Text style={styles.resultItem}>
                    Types:{' '}
                    {googleResults.firstStation.types.slice(0, 3).join(', ')}
                    {googleResults.firstStation.types.length > 3 ? '...' : ''}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <MaterialIcons
              name='storage'
              size={20}
              color='#2a9d8f'
              style={styles.cardIcon}
            />
            Supabase Database Test
          </Text>
          <Text style={styles.cardDescription}>
            Test the connection to Supabase by querying the gas stations table.
          </Text>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testSupabaseConnection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#fff' size='small' />
            ) : (
              <Text style={styles.testButtonText}>
                Test Supabase Connection
              </Text>
            )}
          </TouchableOpacity>

          {supabaseResults && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results:</Text>
              <Text style={styles.resultItem}>
                Status: {supabaseResults.status}
              </Text>
              <Text style={styles.resultItem}>
                Total Stations: {supabaseResults.totalStations}
              </Text>

              <Text style={styles.resultSubtitle}>Top Brands:</Text>
              {supabaseResults.brandCounts.map(
                ([brand, count]: [string, number], index: number) => (
                  <Text key={index} style={styles.resultItem}>
                    {brand}: {count} stations
                  </Text>
                )
              )}

              <Text style={styles.resultSubtitle}>Top Cities:</Text>
              {supabaseResults.cityCounts.map(
                ([city, count]: [string, number], index: number) => (
                  <Text key={index} style={styles.resultItem}>
                    {city}: {count} stations
                  </Text>
                )
              )}
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#2a9d8f',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#aaa',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
  },
  resultsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
  },
  resultItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
});
