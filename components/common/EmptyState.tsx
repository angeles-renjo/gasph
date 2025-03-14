// src/components/common/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  imageSource?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  imageSource,
}) => {
  return (
    <View style={styles.container}>
      {imageSource && (
        <Image source={imageSource} style={styles.image} resizeMode='contain' />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
