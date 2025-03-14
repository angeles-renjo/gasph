// app/admin.tsx
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

// Function to generate UUIDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Authentication check component
const AuthCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      const isAuthenticated = !!data.session;
      setAuthenticated(isAuthenticated);
      setLoading(false);

      if (!isAuthenticated) {
        // For development, let's provide a login flow
        Alert.alert(
          'Authentication Required',
          "You need to be logged in to access the admin panel. For development, we'll create a test user.",
          [
            {
              text: 'Sign In with Test Account',
              onPress: () => signInWithTestAccount(),
            },
            {
              text: 'Cancel',
              onPress: () => router.back(),
              style: 'cancel',
            },
          ]
        );
      }
    }

    checkAuth();
  }, []);

  // Development-only function to sign in with a test account
  const signInWithTestAccount = async () => {
    try {
      setLoading(true);

      // You'd want to replace this with your actual auth flow in production
      // This is ONLY for development purposes and should not be used in production
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123', // This would be a real password in production
      });

      if (error) throw error;

      setAuthenticated(true);
    } catch (error) {
      Alert.alert(
        'Authentication Error',
        'Could not sign in with test account. Please check your Supabase setup.'
      );
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#0000ff' />
        <ThemedText style={styles.loadingText}>
          Checking authentication...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!authenticated) {
    return (
      <ThemedView style={styles.unauthContainer}>
        <ThemedText style={styles.unauthText}>
          You need to be authenticated to access the admin panel.
        </ThemedText>
        <TouchableOpacity
          style={styles.authButton}
          onPress={signInWithTestAccount}
        >
          <ThemedText style={styles.authButtonText}>
            Sign In with Test Account
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return <>{children}</>;
};

// We're including a simple version directly in this file to avoid import issues
const SimpleDemoImporter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    success: boolean;
    message: string;
    count?: number;
  }>(null);

  const generateDemoData = async () => {
    setLoading(true);
    try {
      // Generate a simple dataset
      const fuelTypes = ['DIESEL', 'RON 91', 'RON 95', 'RON 97'];
      const areas = ['Quezon City', 'Manila City', 'Makati City'];
      const brands = ['PETRON', 'SHELL', 'CALTEX', 'PHOENIX'];

      const today = new Date().toISOString().split('T')[0];
      const records = [];

      // Generate records
      for (const area of areas) {
        for (const fuelType of fuelTypes) {
          for (const brand of brands) {
            const basePrice =
              fuelType === 'DIESEL'
                ? 55
                : fuelType === 'RON 91'
                ? 58
                : fuelType === 'RON 95'
                ? 61
                : 65;

            const variance = Math.random() * 3;
            const minPrice = basePrice - variance;
            const maxPrice = basePrice + variance;

            records.push({
              id: generateUUID(), // Generate a proper UUID
              area,
              brand,
              fuel_type: fuelType,
              min_price: parseFloat(minPrice.toFixed(2)),
              max_price: parseFloat(maxPrice.toFixed(2)),
              common_price: parseFloat(((minPrice + maxPrice) / 2).toFixed(2)),
              week_of: today,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      console.log('Attempting to insert records with authenticated user...');

      // Insert into database
      const { data, error } = await supabase
        .from('fuel_prices')
        .upsert(records);

      if (error) throw error;

      setResult({
        success: true,
        message: `Successfully generated ${records.length} demo records for ${today}`,
        count: records.length,
      });

      console.log('Demo data inserted successfully!');
    } catch (error) {
      console.error('Error generating demo data:', error);
      setResult({
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.demoContainer}>
      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateDemoData}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? 'Generating...' : 'Generate Demo Data'}
        </ThemedText>
      </TouchableOpacity>

      {result && (
        <ThemedView
          style={[
            styles.resultContainer,
            result.success ? styles.successResult : styles.errorResult,
          ]}
        >
          <ThemedText>{result.message}</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
};

export default function AdminScreen() {
  return (
    <AuthCheck>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Admin Dashboard' }} />

        <ScrollView style={styles.scrollView}>
          <ThemedText style={styles.title}>Fuel Price App Admin</ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage data and application settings
          </ThemedText>

          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Demo Fuel Price Data
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Generate sample fuel price data for testing the app.
            </ThemedText>
            <SimpleDemoImporter />
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Database Statistics
            </ThemedText>
            <DataStatistics />
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </AuthCheck>
  );
}

const DataStatistics: React.FC = () => {
  const [stats, setStats] = useState({
    totalPriceRecords: 0,
    totalStations: 0,
    latestWeek: '',
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get count of fuel price records
        const { count: priceCount, error: priceError } = await supabase
          .from('fuel_prices')
          .select('*', { count: 'exact', head: true });

        if (priceError)
          throw new Error(`Price count error: ${priceError.message}`);

        // Get count of gas stations
        const { count: stationCount, error: stationError } = await supabase
          .from('gas_stations')
          .select('*', { count: 'exact', head: true });

        if (stationError)
          throw new Error(`Station count error: ${stationError.message}`);

        // Get latest week
        const { data: latestData, error: latestError } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (latestError && latestError.code !== 'PGRST116') {
          throw new Error(`Latest week error: ${latestError.message}`);
        }

        setStats({
          totalPriceRecords: priceCount || 0,
          totalStations: stationCount || 0,
          latestWeek: latestData?.week_of || 'No data',
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    fetchStats();
  }, []);

  if (stats.loading) {
    return (
      <ThemedView style={styles.statsContainer}>
        <ActivityIndicator size='small' />
        <ThemedText>Loading statistics...</ThemedText>
      </ThemedView>
    );
  }

  if (stats.error) {
    return (
      <ThemedView style={styles.statsContainer}>
        <ThemedText style={styles.errorText}>Error: {stats.error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.statsContainer}>
      <ThemedView style={styles.statRow}>
        <ThemedText style={styles.statLabel}>
          Total Fuel Price Records:
        </ThemedText>
        <ThemedText style={styles.statValue}>
          {stats.totalPriceRecords}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.statRow}>
        <ThemedText style={styles.statLabel}>Total Gas Stations:</ThemedText>
        <ThemedText style={styles.statValue}>{stats.totalStations}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.statRow}>
        <ThemedText style={styles.statLabel}>Latest Price Week:</ThemedText>
        <ThemedText style={styles.statValue}>{stats.latestWeek}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    opacity: 0.7,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.7,
  },
  demoContainer: {
    marginTop: 8,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
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
  statsContainer: {
    padding: 16,
    borderRadius: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unauthText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
