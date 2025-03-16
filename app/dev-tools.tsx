// app/dev-tools.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTestPriceData } from '@/hooks/useTestPriceData';

export default function DevToolsScreen() {
  const { runTests, isRunningTests, testResults } = useTestPriceData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Format a test result for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'number') return value.toFixed(2);
    return String(value);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name='arrow-back' size={24} color='#333' />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Developer Tools</Text>
        <Text style={styles.subtitle}>
          Testing tools for development use only
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Data Tests</Text>
          <Text style={styles.cardDescription}>
            Test the matching between price data and stations, and verify
            distance calculations
          </Text>

          <TouchableOpacity
            style={[styles.button, isRunningTests && styles.buttonDisabled]}
            onPress={runTests}
            disabled={isRunningTests}
          >
            {isRunningTests ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Run Tests</Text>
            )}
          </TouchableOpacity>

          {testResults.success && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results</Text>

              {/* Price-Station Matching Results */}
              <TouchableOpacity
                style={styles.resultSection}
                onPress={() => toggleSection('matching')}
              >
                <View style={styles.resultSectionHeader}>
                  <Text style={styles.resultSectionTitle}>
                    Price-Station Matching
                  </Text>
                  <MaterialIcons
                    name={expanded.matching ? 'expand-less' : 'expand-more'}
                    size={24}
                    color='#666'
                  />
                </View>

                <View style={styles.resultSummary}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Match Rate:</Text>
                    <Text style={styles.resultValue}>
                      {testResults.matchingResults.matchRate.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Matched:</Text>
                    <Text style={styles.resultValue}>
                      {testResults.matchingResults.matchedCount}
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Unmatched:</Text>
                    <Text style={styles.resultValue}>
                      {testResults.matchingResults.unmatchedCount}
                    </Text>
                  </View>
                </View>

                {expanded.matching && (
                  <View style={styles.resultDetails}>
                    <Text style={styles.resultDetailTitle}>Fuel Types:</Text>
                    {Object.entries(testResults.matchingResults.bestPrices).map(
                      ([fuelType, prices]) => (
                        <Text key={fuelType} style={styles.resultDetailItem}>
                          {fuelType}:{' '}
                          {Array.isArray(prices) ? prices.length : 0} prices
                        </Text>
                      )
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Distance Sorting Results */}
              <TouchableOpacity
                style={styles.resultSection}
                onPress={() => toggleSection('distance')}
              >
                <View style={styles.resultSectionHeader}>
                  <Text style={styles.resultSectionTitle}>
                    Distance Sorting
                  </Text>
                  <MaterialIcons
                    name={expanded.distance ? 'expand-less' : 'expand-more'}
                    size={24}
                    color='#666'
                  />
                </View>

                <View style={styles.resultSummary}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Closest City:</Text>
                    <Text style={styles.resultValue}>
                      {testResults.distanceResults.closestCity}
                    </Text>
                  </View>
                </View>

                {expanded.distance && (
                  <View style={styles.resultDetails}>
                    <Text style={styles.resultDetailTitle}>
                      Closest Stations:
                    </Text>
                    {testResults.distanceResults.stationsByDistance.map(
                      (item: any, index: any) => (
                        <Text key={index} style={styles.resultDetailItem}>
                          {index + 1}. {item.station.name} ({item.station.city}
                          ): {item.distance.toFixed(1)} km
                        </Text>
                      )
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.timestamp}>
                Last run: {new Date(testResults.timestamp).toLocaleString()}
              </Text>
            </View>
          )}

          {testResults.success === false && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error: {testResults.error || 'Unknown error'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          These tools are for development use only and will be removed in
          production.
        </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2a9d8f',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultSection: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  resultSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultSummary: {
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultDetails: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  resultDetailTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultDetailItem: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
});
