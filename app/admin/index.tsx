// app/admin/index.tsx - Admin Dashboard Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/profile')}
        >
          <MaterialIcons name='arrow-back' size={24} color='#333' />
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Manage app data and settings</Text>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/import-stations')}
          >
            <MaterialIcons name='add-location' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Import Gas Stations</Text>
              <Text style={styles.menuItemDescription}>
                Import gas station data from Google Places API
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/test-api')}
          >
            <MaterialIcons name='api' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Test API Connections</Text>
              <Text style={styles.menuItemDescription}>
                Test connections to Google Places API and Supabase
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>
        </View>

        {/* Fuel Price Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuel Price Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // This would navigate to a price import screen in a real app
              alert('Price import functionality coming soon.');
            }}
          >
            <MaterialIcons name='attach-money' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Import Price Data</Text>
              <Text style={styles.menuItemDescription}>
                Import price data from DOE reports
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              // This would navigate to a price review screen in a real app
              alert('Price review functionality coming soon.');
            }}
          >
            <MaterialIcons name='assignment' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Review User Submissions</Text>
              <Text style={styles.menuItemDescription}>
                Review and approve user-submitted prices
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/admin/import-multiple-cities')}
        >
          <MaterialIcons name='location-city' size={24} color='#2a9d8f' />
          <View style={styles.menuItemTextContainer}>
            <Text style={styles.menuItemTitle}>Import Multiple Cities</Text>
            <Text style={styles.menuItemDescription}>
              Import gas stations from multiple NCR cities at once
            </Text>
          </View>
          <MaterialIcons name='chevron-right' size={24} color='#999' />
        </TouchableOpacity>

        {/* System Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              alert('Debug mode is not yet implemented.');
            }}
          >
            <MaterialIcons name='bug-report' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Database Diagnostics</Text>
              <Text style={styles.menuItemDescription}>
                Run diagnostics on database connections and schema
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              alert('Cache cleared (simulated).');
            }}
          >
            <MaterialIcons name='cached' size={24} color='#2a9d8f' />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemTitle}>Clear App Cache</Text>
              <Text style={styles.menuItemDescription}>
                Reset app data cache and temporary files
              </Text>
            </View>
            <MaterialIcons name='chevron-right' size={24} color='#999' />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text>go to manage cycle</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/manage-cycle')}
          ></TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a restricted admin area. All actions are logged.
          </Text>
        </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
