// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { router, Link } from 'expo-router';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.comingSoon}>
        The profile feature is coming soon. You'll be able to save your favorite
        stations and set price alerts.
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title='Login'
          onPress={() => {
            // This would navigate to a login screen in a real app
            alert('Login functionality coming soon.');
          }}
        />
      </View>

      {/* Admin Dashboard Access */}
      <View style={styles.adminSection}>
        <Text style={styles.adminTitle}>Admin Access</Text>
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.adminButtonText}>Open Admin Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.adminNote}>*For demonstration purposes only</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 200,
    marginBottom: 40,
  },
  adminSection: {
    width: '100%',
    maxWidth: 300,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  adminButton: {
    backgroundColor: '#673AB7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  adminButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  adminNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
