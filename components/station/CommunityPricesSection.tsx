// components/station/CommunityPricesSection.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PriceCard from '@/components/price/PriceCard';

// Type for price data returned by usePriceReporting hook
interface StationPrice {
  fuelType: string;
  communityPrice: number | null;
  reportId: string | null;
  doeData: {
    minPrice: number | null;
    maxPrice: number | null;
    commonPrice: number | null;
  } | null;
  verificationData: {
    confirmedCount: number;
    disputedCount: number;
    lastUpdated: string;
    reporterName?: string;
  } | null;
}

// Type for price cycle data
interface CycleInfo {
  currentCycle: any | null;
  daysRemaining: number;
}

interface CommunityPricesSectionProps {
  prices: StationPrice[];
  loading: boolean;
  cycle: CycleInfo;
  onAddPrice: () => void;
  onConfirm: (reportId: string | null) => void;
  onDispute: (reportId: string | null) => void;
  onUpdate: (fuelType: string, price: number | null) => void;
}

/**
 * Component to display community-reported prices with voting and update options
 */
export const CommunityPricesSection: React.FC<CommunityPricesSectionProps> = ({
  prices,
  loading,
  cycle,
  onAddPrice,
  onConfirm,
  onDispute,
  onUpdate,
}) => {
  // Render price cycle info
  const renderCycleInfo = () => {
    if (!cycle.currentCycle) {
      // Return null when no cycle exists
      return null;
    }

    return (
      <View style={styles.cycleInfoContainer}>
        <MaterialIcons name='update' size={16} color='#666' />
        <Text style={styles.cycleInfoText}>
          Price reports reset in {cycle.daysRemaining} days
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>Community Prices</Text>
      </View>

      <View style={styles.sectionHeaderControls}>
        {renderCycleInfo()}
        <Pressable style={styles.addPriceButton} onPress={onAddPrice}>
          <MaterialIcons name='add' size={16} color='#fff' />
          <Text style={styles.addPriceText}>Add Price</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size='small' color='#2a9d8f' />
      ) : prices.length > 0 ? (
        prices.map((priceData) => (
          <PriceCard
            key={priceData.fuelType}
            fuelType={priceData.fuelType}
            communityPrice={priceData.communityPrice}
            doeData={priceData.doeData}
            verificationData={priceData.verificationData}
            onConfirm={() => onConfirm(priceData.reportId)}
            onDispute={() => onDispute(priceData.reportId)}
            onUpdate={() =>
              onUpdate(priceData.fuelType, priceData.communityPrice)
            }
          />
        ))
      ) : (
        <View style={styles.noPricesContainer}>
          <Text style={styles.noData}>
            No community price reports yet for this station.
          </Text>
          <Pressable style={styles.reportFirstButton} onPress={onAddPrice}>
            <Text style={styles.reportFirstText}>Report First Price</Text>
          </Pressable>
        </View>
      )}
    </View>
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
  sectionTitleContainer: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeaderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cycleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cycleInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  addPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addPriceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noPricesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noData: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  reportFirstButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  reportFirstText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default CommunityPricesSection;
