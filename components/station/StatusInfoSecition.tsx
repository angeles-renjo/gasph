// components/station/StationInfoSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatOperatingHours } from '@/utils/formatters';

interface StationInfoSectionProps {
  hours: {
    open: string;
    close: string;
    is24_hours: boolean;
    days_open: string[];
  };
  amenities: string[];
}

/**
 * Component to display station hours and amenities
 */
export const StationInfoSection: React.FC<StationInfoSectionProps> = ({
  hours,
  amenities,
}) => {
  const renderAmenities = () => {
    if (!amenities || amenities.length === 0) {
      return <Text style={styles.noData}>No amenities listed</Text>;
    }

    return (
      <View style={styles.amenitiesContainer}>
        {amenities.map((amenity, index) => (
          <View key={index} style={styles.amenityTag}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hours</Text>
        <Text style={styles.sectionContent}>{formatOperatingHours(hours)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        {renderAmenities()}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#444',
  },
  noData: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: '#e0f2f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    margin: 4,
  },
  amenityText: {
    fontSize: 14,
    color: '#00796b',
  },
});

export default StationInfoSection;
