// app/station/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useStationById } from '@/hooks/useStationService';
import { usePriceReporting } from '@/hooks/usePriceService';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { MaterialIcons } from '@expo/vector-icons';
import {
  formatOperatingHours,
  formatCurrency,
  formatDate,
} from '@/utils/formatters';
import { FUEL_TYPES } from '@/utils/constants';
import PriceCard from '@/components/price/PriceCard';
import PriceReportingModal from '@/components/price/PriceReportingModal';
import { supabase } from '@/utils/supabase';
import { FuelPrice } from '@/core/models/FuelPrice';
import { usePriceCycle } from '@/hooks/usePriceCycle';
import { PriceStationConnector } from '@/utils/priceStationConnector';
import { normalizeCityName } from '@/utils/areaMapping';

// Extended FuelPrice type to include display type
interface ExtendedFuelPrice extends FuelPrice {
  display_type?: string;
}

// Define NCR cities for reference
const NCR_CITIES = [
  'Quezon City',
  'Manila City',
  'Makati City',
  'Pasig City',
  'Taguig City',
  'Pasay City',
  'Caloocan City',
  'Parañaque City',
  'Mandaluyong City',
  'Las Piñas City',
  'Marikina City',
  'Muntinlupa City',
  'San Juan City',
  'Valenzuela City',
  'Navotas City',
  'Malabon City',
  'Pateros',
];

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: station, loading, error } = useStationById(id);
  const [doePrices, setDoePrices] = useState<ExtendedFuelPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const { currentCycle, daysRemaining } = usePriceCycle();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get the authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    };

    getUser();
  }, []);

  // Use the price reporting hook with the real user
  const {
    isLoading: isPriceLoading,
    isReportModalVisible,
    currentStation,
    currentFuelType,
    initialPrice,
    stationPrices,
    openReportModal,
    closeReportModal,
    submitPriceReport,
    voteOnPrice,
    getStationPrices,
  } = usePriceReporting(currentUser);

  // Load DOE prices with enhanced matching when station data is available
  useEffect(() => {
    const fetchDoePrices = async () => {
      if (!station) return;

      try {
        setLoadingPrices(true);

        // Get latest week
        const { data: latestWeek } = await supabase
          .from('fuel_prices')
          .select('week_of')
          .order('week_of', { ascending: false })
          .limit(1)
          .single();

        if (!latestWeek) {
          setLoadingPrices(false);
          return;
        }

        // Get all prices from latest week
        const { data: allPrices } = await supabase
          .from('fuel_prices')
          .select('*')
          .eq('week_of', latestWeek.week_of);

        if (!allPrices || allPrices.length === 0) {
          setLoadingPrices(false);
          return;
        }

        // Use PriceStationConnector to get enhanced matches
        const matchedPrices = await PriceStationConnector.getPricesForStation(
          station
        );

        if (matchedPrices.length > 0) {
          console.log(
            `Found ${matchedPrices.length} matched prices using enhanced connector`
          );

          // Convert to ExtendedFuelPrice format without confidence
          const enhancedPrices: ExtendedFuelPrice[] = matchedPrices.map(
            (match) => ({
              ...match.price,
              display_type: getShortFuelTypeName(match.price.fuel_type),
            })
          );

          // Sort by fuel type for consistent display
          enhancedPrices.sort((a, b) => a.fuel_type.localeCompare(b.fuel_type));

          setDoePrices(enhancedPrices);
        } else {
          console.log(
            'No matched prices found using enhanced connector, trying fallback'
          );

          // Fallback to simpler brand+city matching
          const { data } = await supabase
            .from('fuel_prices')
            .select('*')
            .eq('week_of', latestWeek.week_of)
            .eq('area', station.city)
            .ilike('brand', station.brand)
            .order('fuel_type');

          // If we find matches with simple matching, use those
          if (data && data.length > 0) {
            console.log(`Found ${data.length} prices using simple matching`);

            // Process diesel types like before
            const processFuelTypes = (prices: FuelPrice[]) => {
              const dieselOccurrences = prices.filter((p) =>
                p.fuel_type.toLowerCase().includes('diesel')
              ).length;

              let dieselCount = 0;

              return prices.map((price) => {
                const processedPrice = { ...price } as ExtendedFuelPrice;

                if (
                  price.fuel_type.toLowerCase().includes('diesel') &&
                  dieselOccurrences > 1
                ) {
                  dieselCount++;

                  if (dieselCount === 1) {
                    processedPrice.display_type = 'Diesel';
                  } else {
                    processedPrice.display_type = 'Diesel Plus';
                  }
                } else {
                  processedPrice.display_type = getShortFuelTypeName(
                    price.fuel_type
                  );
                }

                return processedPrice;
              });
            };

            setDoePrices(processFuelTypes(data));
          } else {
            // If no match at all, try an even more relaxed approach with NCR area
            const { data: ncrData } = await supabase
              .from('fuel_prices')
              .select('*')
              .eq('week_of', latestWeek.week_of)
              .eq('area', 'NCR')
              .ilike('brand', station.brand)
              .order('fuel_type');

            if (ncrData && ncrData.length > 0) {
              console.log(
                `Found ${ncrData.length} prices using NCR area matching`
              );

              // Process with simpler display
              const processedPrices = ncrData.map((price) => {
                const processedPrice = { ...price } as ExtendedFuelPrice;
                processedPrice.display_type = getShortFuelTypeName(
                  price.fuel_type
                );
                return processedPrice;
              });

              setDoePrices(processedPrices);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching DOE prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchDoePrices();
  }, [station]);

  // Load station prices when station data is available
  useEffect(() => {
    const loadStationPrices = async () => {
      if (station) {
        await getStationPrices(station.id);
      }
    };

    loadStationPrices();
  }, [station, getStationPrices]);

  if (loading) {
    return <LoadingIndicator message='Loading station details...' />;
  }

  if (error || !station) {
    return (
      <ErrorDisplay
        message='Failed to load station details. Please try again.'
        onRetry={() => router.replace(`/station/${id}`)}
      />
    );
  }

  const handleConfirmPrice = (reportId: string | null) => {
    if (reportId) {
      voteOnPrice(reportId, true);
    }
  };

  const handleDisputePrice = (reportId: string | null) => {
    if (reportId) {
      voteOnPrice(reportId, false);
    }
  };

  const handleUpdatePrice = (fuelType: string, currentPrice: number | null) => {
    openReportModal(station, fuelType, currentPrice || '');
  };

  const getStatusColor = () => {
    switch (station.status) {
      case 'active':
        return '#4caf50';
      case 'temporary_closed':
        return '#ff9800';
      case 'permanently_closed':
        return '#f44336';
      default:
        return '#666';
    }
  };

  // Render price cycle info
  const renderCycleInfo = () => {
    if (!currentCycle) {
      // Return null or a default message when no cycle exists
      return null;
    }

    return (
      <View style={styles.cycleInfoContainer}>
        <MaterialIcons name='update' size={16} color='#666' />
        <Text style={styles.cycleInfoText}>
          Price reports reset in {daysRemaining} days
        </Text>
      </View>
    );
  };

  const renderAmenities = () => {
    if (!station.amenities || station.amenities.length === 0) {
      return <Text style={styles.noData}>No amenities listed</Text>;
    }

    return (
      <View style={styles.amenitiesContainer}>
        {station.amenities.map((amenity, index) => (
          <View key={index} style={styles.amenityTag}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Simplified function to get display name for fuel type
  const getShortFuelTypeName = (fuelType: string): string => {
    if (fuelType.includes('Diesel')) return 'Diesel';
    if (fuelType.includes('RON 95')) return 'RON 95';
    if (fuelType.includes('RON 91')) return 'RON 91';
    if (fuelType.includes('RON 97')) return 'RON 97';
    if (fuelType.includes('RON 100')) return 'RON 100';
    return fuelType;
  };

  // Render the official prices section with the column format - simplified without confidence
  const renderOfficialPrices = () => {
    if (loadingPrices) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='small' color='#2a9d8f' />
          <Text style={styles.loadingText}>Loading reference data...</Text>
        </View>
      );
    }

    if (doePrices.length === 0) {
      return (
        <Text style={styles.noData}>
          No reference price data available for this station.
        </Text>
      );
    }

    return (
      <View style={styles.officialPricesContainer}>
        {/* Header row for the columns - simplified without confidence */}
        <View style={styles.priceHeaderRow}>
          <Text style={styles.fuelTypeHeader}></Text>
          <Text style={styles.priceHeader}>Min</Text>
          <Text style={styles.priceHeader}>Common</Text>
          <Text style={styles.priceHeader}>Max</Text>
        </View>

        {/* One row per fuel type - simplified without confidence */}
        {doePrices.map((price) => (
          <View key={price.id} style={styles.priceRow}>
            <Text style={styles.fuelType}>{price.display_type}:</Text>
            <Text style={styles.price}>
              {price.min_price ? formatCurrency(price.min_price) : '--'}
            </Text>
            <Text style={styles.price}>
              {price.common_price ? formatCurrency(price.common_price) : '--'}
            </Text>
            <Text style={styles.price}>
              {price.max_price ? formatCurrency(price.max_price) : '--'}
            </Text>
          </View>
        ))}

        <Text style={styles.officialNoteText}>
          As of {formatDate(doePrices[0]?.week_of)}
        </Text>
      </View>
    );
  };

  const checkIfUserLoggedIn = () => {
    // For testing without authentication, always return true
    return true;

    // When you implement auth, replace with this:
    /*
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to report prices.',
        [
          { text: 'OK', onPress: () => {} }
        ]
      );
      return false;
    }
    return true;
    */
  };

  return (
    <ScrollView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name='arrow-back' size={24} color='#333' />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.brand}>{station.brand}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
        >
          <Text style={styles.statusText}>
            {station.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.name}>{station.name}</Text>
      <Text style={styles.address}>{station.address}</Text>

      {/* DOE Reference Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DOE Reference Data</Text>
        {renderOfficialPrices()}
      </View>

      {/* Community Reported Prices Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Community Prices</Text>
        </View>

        <View style={styles.sectionHeaderControls}>
          {renderCycleInfo()}
          <Pressable
            style={styles.addPriceButton}
            onPress={() => {
              if (checkIfUserLoggedIn()) {
                openReportModal(station);
              }
            }}
          >
            <MaterialIcons name='add' size={16} color='#fff' />
            <Text style={styles.addPriceText}>Add Price</Text>
          </Pressable>
        </View>

        {/* Rest of section content remains the same */}
        {isPriceLoading ? (
          <ActivityIndicator size='small' color='#2a9d8f' />
        ) : stationPrices.length > 0 ? (
          stationPrices.map((priceData) => (
            <PriceCard
              key={priceData.fuelType}
              fuelType={priceData.fuelType}
              communityPrice={priceData.communityPrice}
              doeData={
                priceData.doeData
                  ? {
                      minPrice: priceData.doeData.minPrice,
                      maxPrice: priceData.doeData.maxPrice,
                      commonPrice: priceData.doeData.commonPrice,
                    }
                  : null
              }
              verificationData={priceData.verificationData}
              onConfirm={() => {
                if (checkIfUserLoggedIn()) {
                  handleConfirmPrice(priceData.reportId);
                }
              }}
              onDispute={() => {
                if (checkIfUserLoggedIn()) {
                  handleDisputePrice(priceData.reportId);
                }
              }}
              onUpdate={() => {
                if (checkIfUserLoggedIn()) {
                  handleUpdatePrice(
                    priceData.fuelType,
                    priceData.communityPrice
                  );
                }
              }}
            />
          ))
        ) : (
          <View style={styles.noPricesContainer}>
            <Text style={styles.noData}>
              No community price reports yet for this station.
            </Text>
            <Pressable
              style={styles.reportFirstButton}
              onPress={() => {
                if (checkIfUserLoggedIn()) {
                  openReportModal(station);
                }
              }}
            >
              <Text style={styles.reportFirstText}>Report First Price</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton}>
          <MaterialIcons name='directions' size={24} color='#fff' />
          <Text style={styles.actionButtonText}>Directions</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <MaterialIcons name='favorite-border' size={24} color='#fff' />
          <Text style={styles.actionButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hours</Text>
        <Text style={styles.sectionContent}>
          {formatOperatingHours(station.operating_hours)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        {renderAmenities()}
      </View>

      {/* Price Reporting Modal */}
      {currentStation && (
        <PriceReportingModal
          visible={isReportModalVisible}
          onClose={closeReportModal}
          onSubmit={submitPriceReport}
          stationName={currentStation.name}
          stationId={currentStation.id}
          initialPrice={initialPrice}
          selectedFuelType={currentFuelType || undefined}
          fuelTypes={FUEL_TYPES}
          isLoading={isPriceLoading}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  noData: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  noPricesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
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
  // Column price format styles - simplified without confidence
  officialPricesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fuelTypeHeader: {
    flex: 1.5,
    fontSize: 12,
    color: '#666',
  },
  priceHeader: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fuelType: {
    flex: 1.5,
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  price: {
    flex: 1,
    fontSize: 14,
    color: '#2a9d8f',
    textAlign: 'center',
    fontWeight: '500',
  },
  officialNoteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  cycleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
    marginRight: 8,
  },
  cycleInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  sectionTitleContainer: {
    marginBottom: 4,
  },
  sectionHeaderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
