import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/formatters';
import { FuelPrice } from '@/core/models/FuelPrice';

// Price status indicator component
interface PriceStatusIndicatorProps {
  communityPrice: number | null;
  doePrice: number | null;
}

const PriceStatusIndicator: React.FC<PriceStatusIndicatorProps> = ({
  communityPrice,
  doePrice,
}) => {
  if (!communityPrice || !doePrice) return null;

  const difference = communityPrice - doePrice;
  const isLower = difference < 0;
  const isHigher = difference > 0;

  let color = '#666'; // default/same
  let icon: keyof typeof Ionicons.glyphMap = 'remove'; // Using a type assertion to ensure it's a valid icon
  let text = 'Same as DOE';

  if (isLower) {
    color = '#4CAF50'; // green
    icon = 'chevron-down';
    text = `${Math.abs(difference).toFixed(2)} lower`;
  } else if (isHigher) {
    color = '#F44336'; // red
    icon = 'chevron-up';
    text = `${difference.toFixed(2)} higher`;
  }

  return (
    <View style={[styles.statusContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
};

// Verification stats component
interface VerificationStatsProps {
  confirmedCount: number;
  disputedCount: number;
  lastUpdated: string;
}

const VerificationStats: React.FC<VerificationStatsProps> = ({
  confirmedCount,
  disputedCount,
  lastUpdated,
}) => {
  const total = confirmedCount + disputedCount;

  return (
    <View style={styles.verificationContainer}>
      <Text style={styles.verificationText}>
        Updated {lastUpdated} • Verified by {total} users
      </Text>
    </View>
  );
};

// Price history item component
interface PriceHistoryItemProps {
  label: string;
  priceRange: string;
}

const PriceHistoryItem: React.FC<PriceHistoryItemProps> = ({
  label,
  priceRange,
}) => {
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyBullet} />
      <Text style={styles.historyLabel}>{label}: </Text>
      <Text style={styles.historyPrice}>{priceRange}</Text>
    </View>
  );
};

interface DoeData {
  minPrice: number;
  maxPrice: number;
  commonPrice: number;
  date?: string;
}

interface VerificationData {
  confirmedCount: number;
  disputedCount: number;
  lastUpdated: string;
  confirmedBy?: string[];
}

interface PriceHistory {
  today?: string;
  yesterday?: string;
  lastWeek?: string;
  todayReports?: number;
  yesterdayReports?: number;
}

export interface PriceCardProps {
  // Either pass a complete fuel price object (legacy format)
  price?: FuelPrice;

  // Or pass individual properties (new format)
  stationName?: string;
  stationAddress?: string;
  brandLogo?: string;
  fuelType?: string;
  communityPrice?: number | null;
  doeData?: DoeData | null;
  verificationData?: VerificationData | null;
  priceHistory?: PriceHistory | null;
  distance?: number;
  onConfirm?: () => void;
  onDispute?: () => void;
  onUpdate?: () => void;
}

// Main component
const PriceCard: React.FC<PriceCardProps> = (props) => {
  // Determine whether we're using the legacy or new format
  const isLegacyFormat = !!props.price;

  // Extract values from props based on the format
  const {
    stationName,
    stationAddress,
    brandLogo,
    fuelType,
    communityPrice,
    doeData,
    verificationData,
    priceHistory,
    distance,
    onConfirm,
    onDispute,
    onUpdate,
  } = isLegacyFormat
    ? // Legacy format: extract from price object
      {
        stationName: `${props.price!.brand} - ${props.price!.area}`,
        stationAddress: `${props.price!.area}`,
        brandLogo: `https://via.placeholder.com/40/CCCCCC/666666?text=${encodeURIComponent(
          props.price!.brand[0]
        )}`,
        fuelType: props.price!.fuel_type,
        communityPrice: props.price!.common_price,
        doeData: {
          minPrice: props.price!.min_price,
          maxPrice: props.price!.max_price,
          commonPrice: props.price!.common_price,
          date: new Date(props.price!.week_of).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
        verificationData: {
          confirmedCount: 0,
          disputedCount: 0,
          lastUpdated: 'Official DOE Data',
          confirmedBy: [],
        },
        priceHistory: null,
        distance: 0,
        onConfirm: () => {},
        onDispute: () => {},
        onUpdate: () => {},
      }
    : // New format: use direct props with defaults
      {
        stationName: props.stationName || '',
        stationAddress: props.stationAddress || '',
        brandLogo: props.brandLogo || '',
        fuelType: props.fuelType || '',
        communityPrice: props.communityPrice || null,
        doeData: props.doeData || null,
        verificationData: props.verificationData || null,
        priceHistory: props.priceHistory || null,
        distance: props.distance || 0,
        onConfirm: props.onConfirm || (() => {}),
        onDispute: props.onDispute || (() => {}),
        onUpdate: props.onUpdate || (() => {}),
      };

  return (
    <View style={styles.card}>
      {/* Station header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: brandLogo }}
            style={styles.logo}
            resizeMode='contain'
          />
          <View style={styles.headerInfo}>
            <Text style={styles.stationName} numberOfLines={1}>
              {stationName}
            </Text>
            <View style={styles.addressRow}>
              <MaterialIcons name='location-on' size={12} color='#666' />
              <Text style={styles.address} numberOfLines={1}>
                {stationAddress}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialIcons name='more-vert' size={20} color='#666' />
        </TouchableOpacity>
      </View>

      {/* Fuel type and price */}
      <View style={styles.priceHeader}>
        <Text style={styles.fuelType}>{fuelType}</Text>
      </View>

      {/* Main price display */}
      <View style={styles.mainPriceContainer}>
        {doeData && communityPrice && (
          <PriceStatusIndicator
            communityPrice={communityPrice}
            doePrice={doeData.commonPrice}
          />
        )}
        <Text style={styles.price}>
          {communityPrice ? formatCurrency(communityPrice) : 'N/A'}
        </Text>
        {verificationData && (
          <VerificationStats
            confirmedCount={verificationData.confirmedCount}
            disputedCount={verificationData.disputedCount}
            lastUpdated={verificationData.lastUpdated}
          />
        )}
      </View>

      {/* Price history section - only if we have history data */}
      {priceHistory && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>PRICE HISTORY:</Text>
          {priceHistory.today && (
            <PriceHistoryItem
              label={`Today (${priceHistory.todayReports || 0} reports)`}
              priceRange={priceHistory.today}
            />
          )}
          {priceHistory.yesterday && (
            <PriceHistoryItem
              label={`Yesterday (${
                priceHistory.yesterdayReports || 0
              } reports)`}
              priceRange={priceHistory.yesterday}
            />
          )}
          {priceHistory.lastWeek && (
            <PriceHistoryItem
              label='Last Week'
              priceRange={priceHistory.lastWeek}
            />
          )}
        </View>
      )}

      {/* DOE data section */}
      {doeData && (
        <View style={styles.doeSection}>
          <Text style={styles.sectionTitle}>
            DOE OFFICIAL DATA{doeData.date ? ` (${doeData.date})` : ''}:
          </Text>
          <View style={styles.doeRow}>
            <View style={styles.doeItem}>
              <View style={styles.doeBullet} />
              <Text style={styles.doeLabel}>Common: </Text>
              <Text style={styles.doeValue}>
                {formatCurrency(doeData.commonPrice)}
              </Text>
            </View>
          </View>
          <View style={styles.doeRow}>
            <View style={styles.doeItem}>
              <View style={styles.doeBullet} />
              <Text style={styles.doeLabel}>Min: </Text>
              <Text style={styles.doeValue}>
                {formatCurrency(doeData.minPrice)}
              </Text>
            </View>
            <View style={styles.doeItem}>
              <View style={styles.doeBullet} />
              <Text style={styles.doeLabel}>Max: </Text>
              <Text style={styles.doeValue}>
                {formatCurrency(doeData.maxPrice)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action buttons - only show for the new format or if we're showing a custom version of the legacy format */}
      {(!isLegacyFormat || true) && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={onConfirm}
          >
            <Text style={styles.actionButtonText}>CONFIRM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.disputeButton]}
            onPress={onDispute}
          >
            <Text style={styles.actionButtonText}>DISPUTE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={onUpdate}
          >
            <Text style={styles.actionButtonText}>UPDATE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmed by section - only show if we have data */}
      {verificationData &&
        verificationData.confirmedBy &&
        verificationData.confirmedBy.length > 0 && (
          <Text style={styles.confirmedBy}>
            Last confirmed by: {verificationData.confirmedBy.join(', ')}
          </Text>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  menuButton: {
    padding: 4,
  },
  priceHeader: {
    marginBottom: 8,
  },
  fuelType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  mainPriceContainer: {
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  verificationContainer: {
    marginTop: 4,
  },
  verificationText: {
    fontSize: 12,
    color: '#666',
  },
  historySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  historyBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginRight: 6,
  },
  historyLabel: {
    fontSize: 12,
    color: '#666',
  },
  historyPrice: {
    fontSize: 12,
  },
  doeSection: {
    marginBottom: 16,
  },
  doeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 2,
  },
  doeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  doeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginRight: 6,
  },
  doeLabel: {
    fontSize: 12,
    color: '#666',
  },
  doeValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  disputeButton: {
    backgroundColor: '#F44336',
  },
  updateButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmedBy: {
    fontSize: 10,
    color: '#888',
  },
});

export default PriceCard;
