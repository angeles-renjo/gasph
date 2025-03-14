// components/admin/DemoDataImporter.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DemoDataGenerator } from '@/utils/demo-data-generator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: number;
  weekOf?: string;
}

export const DemoDataImporter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleImportData = async () => {
    setLoading(true);
    try {
      const importResult = await DemoDataGenerator.importDemoData(
        formatDate(selectedDate)
      );
      setResult(importResult);

      if (!importResult.success && importResult.weekOf) {
        // Data for this week already exists, ask for confirmation
        Alert.alert(
          'Confirm Replace',
          `Data for week of ${importResult.weekOf} already exists. Do you want to replace it?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Replace',
              onPress: async () => {
                setLoading(true);
                try {
                  const replaceResult = await DemoDataGenerator.replaceDemoData(
                    importResult.weekOf!
                  );
                  setResult(replaceResult);
                } catch (error) {
                  console.error('Error replacing data:', error);
                  Alert.alert('Error', 'Failed to replace data');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error importing demo data:', error);
      setResult({
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        imported: 0,
        errors: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        Generate Demo Fuel Price Data
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        This will create sample fuel price data for testing purposes.
      </ThemedText>

      <ThemedView style={styles.dateContainer}>
        <ThemedText style={styles.dateLabel}>Select Week Date:</ThemedText>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <ThemedText style={styles.dateText}>
            {formatDate(selectedDate)}
          </ThemedText>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode='date'
            display='default'
            onChange={handleDateChange}
          />
        )}
      </ThemedView>

      <TouchableOpacity
        style={[styles.importButton, loading && styles.disabledButton]}
        onPress={handleImportData}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? 'Generating...' : 'Generate & Import Data'}
        </ThemedText>
        {loading && <ActivityIndicator color='#fff' style={styles.loader} />}
      </TouchableOpacity>

      {result && (
        <ThemedView
          style={[
            styles.resultContainer,
            result.success ? styles.successResult : styles.errorResult,
          ]}
        >
          <ThemedText style={styles.resultTitle}>
            {result.success ? 'Success' : 'Error'}
          </ThemedText>
          <ThemedText style={styles.resultMessage}>{result.message}</ThemedText>

          {result.success && (
            <ThemedView style={styles.statsContainer}>
              <ThemedText>Imported records: {result.imported}</ThemedText>
              <ThemedText>Errors: {result.errors}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.7,
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    marginBottom: 8,
    fontSize: 16,
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  dateText: {
    fontSize: 16,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginLeft: 8,
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  successResult: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  errorResult: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  resultMessage: {
    marginBottom: 12,
  },
  statsContainer: {
    marginTop: 8,
  },
});
