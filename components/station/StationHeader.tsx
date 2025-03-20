// components/station/StationHeader.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GasStation } from '@/core/models/GasStation';
import { StatusBadge } from './StatusBadge';

interface StationHeaderProps {
  station: GasStation;
  onBack: () => void;
}

/**
 * Station header component displaying brand, name, address and status
 */
export const StationHeader: React.FC<StationHeaderProps> = ({
  station,
  onBack,
}) => {
  return (
    <>
      <Pressable style={styles.backButton} onPress={onBack}>
        <MaterialIcons name='arrow-back' size={24} color='#333' />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        <StatusBadge status={station.status} />
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>
    </>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
});

export default StationHeader;
