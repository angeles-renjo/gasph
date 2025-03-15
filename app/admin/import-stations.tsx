// app/admin/import-stations.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useServiceContext } from '@/context/ServiceContext';
import { PHILIPPINE_REGIONS } from '@/utils/constants';

export default function ImportStationsScreen() {
  const { gasStationImportService } = useServiceContext();
  const [city, setCity] = useState('Quezon City');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<
    { city: string; count: number; time: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((current) => [message, ...current].slice(0, 100)); // Keep only the last 100 logs
  };

  const handleImport = async () => {
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }

    setImporting(true);
    setError(null);
    setLogs([]);
    addLog(`Starting import for ${city}...`);

    try {
      // Override console.log during import to capture logs
      const originalConsoleLog = console.log;
      console.log = (message, ...optionalParams) => {
        originalConsoleLog(message, ...optionalParams);
        if (typeof message === 'string') {
          addLog(message);
        }
      };

      const startTime = Date.now();
      const importedCount =
        await gasStationImportService.importGasStationsFromCity(city);
      const endTime = Date.now();

      // Restore original console.log
      console.log = originalConsoleLog;

      const newResult = {
        city: city,
        count: importedCount,
        time: Math.round((endTime - startTime) / 1000),
      };

      setResults((prev) => [newResult, ...prev]);
      Alert.alert(
        'Success',
        `Successfully imported ${importedCount} gas stations from ${city}.`
      );
      addLog(
        `Import completed. Added ${importedCount} stations in ${Math.round(
          (endTime - startTime) / 1000
        )} seconds.`
      );
    } catch (err) {
      console.error('Import error:', err);
      setError(
        `Failed to import stations: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      Alert.alert(
        'Error',
        'Failed to import gas stations. Check logs for details.'
      );
      addLog(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
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

        <Text style={styles.title}>Import Gas Stations</Text>
        <Text style={styles.subtitle}>
          This tool imports gas station data from Google Places API based on
          city name.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>City Name:</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder='Enter city name (e.g., Quezon City)'
            editable={!importing}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.importButton,
            importing && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color='#fff' size='small' />
          ) : (
            <Text style={styles.importButtonText}>Import Stations</Text>
          )}
        </TouchableOpacity>

        {importing && (
          <Text style={styles.importingText}>
            Importing stations from {city}... This may take several minutes.
          </Text>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
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
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importingText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
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
