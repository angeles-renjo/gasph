// components/station/ActionButtons.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ActionButtonsProps {
  onGetDirections?: () => void;
  onSaveStation?: () => void;
}

/**
 * Component for station action buttons (directions, save)
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGetDirections,
  onSaveStation,
}) => {
  return (
    <View style={styles.actionButtons}>
      <Pressable style={styles.actionButton} onPress={onGetDirections}>
        <MaterialIcons name='directions' size={24} color='#fff' />
        <Text style={styles.actionButtonText}>Directions</Text>
      </Pressable>

      <Pressable style={styles.actionButton} onPress={onSaveStation}>
        <MaterialIcons name='favorite-border' size={24} color='#fff' />
        <Text style={styles.actionButtonText}>Save</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 24,
    marginHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#2a9d8f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ActionButtons;
