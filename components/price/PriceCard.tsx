// components/price/PriceCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatCurrency, isValidPrice } from '@/utils/formatters';

interface PriceCardProps {
  fuelType: string;
  communityPrice: number | null;
  doeData: {
    minPrice: number | null;
    maxPrice: number | null;
    commonPrice: number | null;
  } | null;
  verificationData?: {
    confirmedCount: number;
    disputedCount: number;
    lastUpdated: string;
    reporterName?: string;
  } | null;
  onConfirm?: () => void;
  onDispute?: () => void;
  onUpdate?: () => void;
}

const PriceCard: React.FC<PriceCardProps> = ({
  fuelType,
  communityPrice,
  doeData,
  verificationData,
  onConfirm,
  onDispute,
  onUpdate,
}) => {
  // Format fuel type to handle different diesel types
  const formatFuelType = (fuelType: string) => {
    // For diesel types, preserve the specific type
    if (fuelType.toLowerCase().includes('diesel')) {
      if (fuelType.toLowerCase().includes('plus')) {
        return 'Diesel Plus';
      }
      return 'Diesel';
    }
    return fuelType;
  };

  // Check if DOE data has any valid prices
  const hasDoeData =
    doeData &&
    (isValidPrice(doeData.minPrice) ||
      isValidPrice(doeData.commonPrice) ||
      isValidPrice(doeData.maxPrice));

  return (
    <View style={styles.card}>
      <Text style={styles.fuelType}>{formatFuelType(fuelType)}</Text>

      {/* Community Price Section */}
      <View style={styles.communityPriceContainer}>
        <Text style={styles.sectionTitle}>COMMUNITY REPORTED PRICE:</Text>

        <View style={styles.mainPriceRow}>
          <Text
            style={[
              styles.communityPrice,
              !isValidPrice(communityPrice) && styles.noPrice,
            ]}
          >
            {formatCurrency(communityPrice)}
          </Text>

          {isValidPrice(communityPrice) && verificationData && (
            <View style={styles.voteContainer}>
              <TouchableOpacity style={styles.voteButton} onPress={onConfirm}>
                <Ionicons name='thumbs-up' size={16} color='#4CAF50' />
                <Text style={styles.voteCount}>
                  {verificationData.confirmedCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.voteButton} onPress={onDispute}>
                <Ionicons name='thumbs-down' size={16} color='#F44336' />
                <Text style={styles.voteCount}>
                  {verificationData.disputedCount}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isValidPrice(communityPrice) && verificationData && (
          <View style={styles.reportInfoContainer}>
            <Text style={styles.reportInfoText}>
              {verificationData.reporterName
                ? `Reported by ${verificationData.reporterName}, ${verificationData.lastUpdated}`
                : `Reported ${verificationData.lastUpdated}`}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
          <MaterialIcons name='edit' size={14} color='#2196F3' />
          <Text style={styles.updateButtonText}>
            {isValidPrice(communityPrice) ? 'Update Price' : 'Report Price'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DOE Price Section */}
      {doeData && (
        <View
          style={[
            styles.doePriceContainer,
            !hasDoeData && styles.noDataContainer,
          ]}
        >
          <Text style={styles.sectionTitle}>DOE REFERENCE DATA:</Text>

          {hasDoeData ? (
            <View style={styles.doePriceRow}>
              <View style={styles.doePriceItem}>
                <Text style={styles.doePriceLabel}>Min:</Text>
                <Text
                  style={[
                    styles.doePrice,
                    !isValidPrice(doeData.minPrice) && styles.noDoePrice,
                  ]}
                >
                  {formatCurrency(doeData.minPrice)}
                </Text>
              </View>

              <View style={styles.doePriceItem}>
                <Text style={styles.doePriceLabel}>Common:</Text>
                <Text
                  style={[
                    styles.doePrice,
                    !isValidPrice(doeData.commonPrice) && styles.noDoePrice,
                  ]}
                >
                  {formatCurrency(doeData.commonPrice)}
                </Text>
              </View>

              <View style={styles.doePriceItem}>
                <Text style={styles.doePriceLabel}>Max:</Text>
                <Text
                  style={[
                    styles.doePrice,
                    !isValidPrice(doeData.maxPrice) && styles.noDoePrice,
                  ]}
                >
                  {formatCurrency(doeData.maxPrice)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataRow}>
              <MaterialIcons name='info-outline' size={16} color='#999' />
              <Text style={styles.noDataText}>
                No official price data available for this station.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fuelType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  communityPriceContainer: {
    marginBottom: 16,
  },
  mainPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  communityPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  noPrice: {
    color: '#999',
    fontStyle: 'italic',
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  voteCount: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  reportInfoContainer: {
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 4,
  },
  reportInfoText: {
    fontSize: 12,
    color: '#444',
    fontStyle: 'italic',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  updateButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  doePriceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  noDataContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  doePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doePriceItem: {
    flex: 1,
    alignItems: 'center',
  },
  doePriceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  doePrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2a9d8f',
  },
  noDoePrice: {
    color: '#999',
    fontStyle: 'italic',
  },
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
  },
});

export default PriceCard;
