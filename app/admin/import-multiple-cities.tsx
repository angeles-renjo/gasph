// app/admin/import-multiple-cities.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useServiceContext } from '@/context/ServiceContext';

// Define NCR cities
const NCR_CITIES = [
  { name: 'Caloocan City', enabled: true },
  { name: 'Quezon City', enabled: false }, // Already imported
  { name: 'Makati City', enabled: false }, // Already imported
  { name: 'Manila City', enabled: true },
  { name: 'Pasig City', enabled: true },
  { name: 'Taguig City', enabled: true },
  { name: 'Parañaque City', enabled: true },
  { name: 'Muntinlupa City', enabled: true },
  { name: 'Pasay City', enabled: true },
  // Add other NCR cities as needed
  { name: 'Las Piñas City', enabled: true },
  { name: 'Mandaluyong City', enabled: true },
  { name: 'Marikina City', enabled: true },
  { name: 'Valenzuela City', enabled: true },
  { name: 'Navotas City', enabled: true },
  { name: 'Malabon City', enabled: true },
  { name: 'San Juan City', enabled: true },
  { name: 'Pateros', enabled: true },
];

export default function ImportMultipleCitiesScreen() {
  const { gasStationImportService } = useServiceContext();
  const [cities, setCities] = useState(NCR_CITIES);
  const [importing, setImporting] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [results, setResults] = useState<
    { city: string; count: number; time: number }[]
  >([]);
  const [logs, setLogs] = useState<string[]>([]);

  const toggleCity = (index: number) => {
    const updatedCities = [...cities];
    updatedCities[index].enabled = !updatedCities[index].enabled;
    setCities(updatedCities);
  };

  const addLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 100));
  };

  const importCities = async () => {
    const enabledCities = cities.filter((city) => city.enabled);

    if (enabledCities.length === 0) {
      addLog('No cities selected for import.');
      return;
    }

    setImporting(true);
    addLog(`Starting import for ${enabledCities.length} cities...`);

    for (let i = 0; i < enabledCities.length; i++) {
      const city = enabledCities[i];
      setCurrentCity(city.name);

      try {
        addLog(
          `Starting import for ${city.name} (${i + 1}/${enabledCities.length})`
        );
        const startTime = Date.now();

        // Import stations for this city
        const importedCount =
          await gasStationImportService.importGasStationsFromCity(city.name);

        const endTime = Date.now();
        const timeInSeconds = Math.round((endTime - startTime) / 1000);

        const newResult = {
          city: city.name,
          count: importedCount,
          time: timeInSeconds,
        };

        setResults((prev) => [newResult, ...prev]);
        addLog(
          `Completed ${city.name}: Imported ${importedCount} stations in ${timeInSeconds} seconds`
        );

        // Wait between cities to avoid API rate limits
        if (i < enabledCities.length - 1) {
          addLog('Waiting 30 seconds before importing next city...');
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      } catch (error) {
        addLog(
          `Error importing ${city.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    setCurrentCity(null);
    setImporting(false);
    addLog('All cities import completed!');
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

        <Text style={styles.title}>Import Multiple Cities</Text>
        <Text style={styles.subtitle}>
          Import gas stations from multiple NCR cities at once. This process
          will take time and API quota.
        </Text>

        <View style={styles.citySelectionContainer}>
          <Text style={styles.sectionTitle}>Select Cities to Import</Text>

          {cities.map((city, index) => (
            <View key={index} style={styles.cityToggleRow}>
              <Text style={styles.cityName}>{city.name}</Text>
              <Switch
                value={city.enabled}
                onValueChange={() => toggleCity(index)}
                disabled={importing}
                trackColor={{ false: '#d3d3d3', true: '#a8dab5' }}
                thumbColor={city.enabled ? '#2a9d8f' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.importButton,
            importing && styles.importButtonDisabled,
          ]}
          onPress={importCities}
          disabled={importing}
        >
          {importing ? (
            <View style={styles.importingContainer}>
              <ActivityIndicator color='#fff' size='small' />
              <Text style={styles.importButtonText}>
                Importing {currentCity ? currentCity : '...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.importButtonText}>
              Start Importing {cities.filter((c) => c.enabled).length} Cities
            </Text>
          )}
        </TouchableOpacity>

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Import Results</Text>
            {results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultCity}>{result.city}</Text>
                <Text style={styles.resultDetails}>
                  Imported {result.count} stations in {result.time} seconds
                </Text>
              </View>
            ))}
          </View>
        )}

        {logs.length > 0 && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>Import Logs</Text>
            <ScrollView style={styles.logsList}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logItem}>
                  {log}
                </Text>
              ))}
            </ScrollView>
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
  citySelectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  cityToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityName: {
    fontSize: 16,
    color: '#333',
  },
  importButton: {
    backgroundColor: '#2a9d8f',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  importButtonDisabled: {
    backgroundColor: '#aaa',
  },
  importingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultCity: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logsContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logsList: {
    maxHeight: 300,
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    color: '#333',
    lineHeight: 18,
    paddingVertical: 2,
  },
});
