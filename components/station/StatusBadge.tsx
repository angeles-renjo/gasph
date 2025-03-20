// components/station/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'temporary_closed' | 'permanently_closed';
}

/**
 * Component to display the station's status as a color-coded badge
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#4caf50'; // Green
      case 'temporary_closed':
        return '#ff9800'; // Orange
      case 'permanently_closed':
        return '#f44336'; // Red
      case 'inactive':
      default:
        return '#666'; // Gray
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default StatusBadge;
