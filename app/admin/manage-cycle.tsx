// app/admin/manage-cycles.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { adminService } from '@/core/services/AdminService';
import { supabase } from '@/utils/supabase';
import { formatDate } from '@/utils/formatters';

export default function ManageCyclesScreen() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activePrices, setActivePrices] = useState<number>(0);

  // Fetch cycles
  const fetchCycles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('price_reporting_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);

      // Get count of active community prices for debugging
      const activePrices = await adminService.getActiveCommunityPrices();
      setActivePrices(activePrices.length);
    } catch (error) {
      console.error('Error fetching cycles:', error);
      Alert.alert('Error', 'Failed to load price cycles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  // Start a new cycle using our SQL function
  const startNewCycle = async () => {
    try {
      setCreating(true);

      // Call the adminService which now uses our stored procedure
      const success = await adminService.startNewPriceCycle();

      if (success) {
        Alert.alert('Success', 'New price cycle started successfully');
        // Refresh the data
        fetchCycles();
      } else {
        Alert.alert('Error', 'Failed to start new price cycle');
      }
    } catch (error) {
      console.error('Error creating cycle:', error);
      Alert.alert('Error', 'Failed to start new price cycle');
    } finally {
      setCreating(false);
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

        <Text style={styles.title}>Manage Price Cycles</Text>
        <Text style={styles.subtitle}>
          Price cycles determine when community prices are reset.
        </Text>

        <TouchableOpacity
          style={[styles.createButton, creating && styles.buttonDisabled]}
          onPress={startNewCycle}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size='small' color='#fff' />
          ) : (
            <>
              <MaterialIcons name='add' size={20} color='#fff' />
              <Text style={styles.createButtonText}>Start New Cycle</Text>
            </>
          )}
        </TouchableOpacity>

        {activePrices > 0 && (
          <View style={styles.warningBox}>
            <MaterialIcons name='warning' size={20} color='#f57c00' />
            <Text style={styles.warningText}>
              {activePrices} active community prices found. These should reset
              when starting a new cycle.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            style={styles.loader}
            size='large'
            color='#2a9d8f'
          />
        ) : (
          <View style={styles.cyclesContainer}>
            <Text style={styles.sectionTitle}>Price Cycles</Text>

            {cycles.length === 0 ? (
              <Text style={styles.noCycles}>No price cycles found.</Text>
            ) : (
              cycles.map((cycle) => (
                <View key={cycle.id} style={styles.cycleCard}>
                  <View style={styles.cycleHeader}>
                    <Text style={styles.cycleDates}>
                      {formatDate(cycle.start_date)} -{' '}
                      {formatDate(cycle.end_date)}
                    </Text>
                    {cycle.is_active && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cycleDetails}>
                    <Text style={styles.cycleDetail}>
                      Created: {new Date(cycle.created_at).toLocaleString()}
                    </Text>
                    {cycle.doe_import_date && (
                      <Text style={styles.cycleDetail}>
                        DOE Import:{' '}
                        {new Date(cycle.doe_import_date).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
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
  createButton: {
    backgroundColor: '#2a9d8f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f57c00',
    marginBottom: 16,
  },
  warningText: {
    color: '#333',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  loader: {
    marginTop: 32,
  },
  cyclesContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noCycles: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  cycleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleDates: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeIndicator: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cycleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  cycleDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
