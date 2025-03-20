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
  isValidPrice,
  normalizeFuelType,
  getShortFuelTypeName,
} from '@/utils/formatters';
import { FUEL_TYPES } from '@/utils/constants';
import PriceCard from '@/components/price/PriceCard';
import PriceReportingModal from '@/components/price/PriceReportingModal';
import { supabase } from '@/utils/supabase';
import { FuelPrice } from '@/core/models/FuelPrice';
import { usePriceCycle } from '@/hooks/usePriceCycle';
import { PriceStationConnector } from '@/utils/priceStationConnector';
import { normalizeCityName } from '@/utils/areaMapping';

import { stationDetailsStyles as styles } from '@/styles/screens/StationDetailsScreen';

// Extended FuelPrice type to include display type
interface ExtendedFuelPrice extends FuelPrice {
  display_type?: string;
  normalized_type?: string; // Added for deduplication
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
  // Updated to use normalizeFuelType and deduplicate
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

          // NEW: Create a map to deduplicate by normalized fuel type
          const fuelTypeMap = new Map<string, ExtendedFuelPrice>();

          // Process and deduplicate prices
          matchedPrices.forEach((match) => {
            // Normalize the fuel type
            const normalized = normalizeFuelType(match.price.fuel_type);

            // Create extended price with normalized type
            const extendedPrice: ExtendedFuelPrice = {
              ...match.price,
              display_type: getShortFuelTypeName(match.price.fuel_type),
              normalized_type: normalized,
            };

            // Check if we already have this normalized type
            if (
              !fuelTypeMap.has(normalized) ||
              // Prioritize prices with valid common price
              (!isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
                isValidPrice(extendedPrice.common_price)) ||
              // If both valid, use the one with higher confidence
              (isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
                isValidPrice(extendedPrice.common_price) &&
                match.matchConfidence > 0.8)
            ) {
              fuelTypeMap.set(normalized, extendedPrice);
            }
          });

          // Convert map back to array and sort
          const dedupedPrices = Array.from(fuelTypeMap.values());
          dedupedPrices.sort((a, b) => {
            // First sort by fuel category (Diesel, Gasoline, etc.)
            const aType = a.normalized_type?.split(' ')[0] || '';
            const bType = b.normalized_type?.split(' ')[0] || '';
            if (aType !== bType) return aType.localeCompare(bType);

            // Then by specific fuel type (RON 91, RON 95, etc.)
            return a.fuel_type.localeCompare(b.fuel_type);
          });

          console.log(
            `After deduplication: ${dedupedPrices.length} unique fuel types`
          );
          setDoePrices(dedupedPrices);
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

          // If we find matches with simple matching, use those but deduplicate
          if (data && data.length > 0) {
            console.log(`Found ${data.length} prices using simple matching`);

            // NEW: Deduplicate by normalized type
            const fuelTypeMap = new Map<string, ExtendedFuelPrice>();

            data.forEach((price) => {
              const normalized = normalizeFuelType(price.fuel_type);

              const extendedPrice: ExtendedFuelPrice = {
                ...price,
                display_type: getShortFuelTypeName(price.fuel_type),
                normalized_type: normalized,
              };

              // Add if not exist or replace if this has valid price and existing doesn't
              if (
                !fuelTypeMap.has(normalized) ||
                (!isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
                  isValidPrice(extendedPrice.common_price))
              ) {
                fuelTypeMap.set(normalized, extendedPrice);
              }
            });

            // Convert to array and sort
            const dedupedPrices = Array.from(fuelTypeMap.values());
            dedupedPrices.sort((a, b) => {
              const aType = a.normalized_type?.split(' ')[0] || '';
              const bType = b.normalized_type?.split(' ')[0] || '';
              if (aType !== bType) return aType.localeCompare(bType);
              return a.fuel_type.localeCompare(b.fuel_type);
            });

            console.log(
              `After deduplication: ${dedupedPrices.length} unique fuel types`
            );
            setDoePrices(dedupedPrices);
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

              // NEW: Deduplicate these as well
              const fuelTypeMap = new Map<string, ExtendedFuelPrice>();

              ncrData.forEach((price) => {
                const normalized = normalizeFuelType(price.fuel_type);

                const extendedPrice: ExtendedFuelPrice = {
                  ...price,
                  display_type: getShortFuelTypeName(price.fuel_type),
                  normalized_type: normalized,
                };

                if (
                  !fuelTypeMap.has(normalized) ||
                  (!isValidPrice(fuelTypeMap.get(normalized)?.common_price) &&
                    isValidPrice(extendedPrice.common_price))
                ) {
                  fuelTypeMap.set(normalized, extendedPrice);
                }
              });

              const dedupedPrices = Array.from(fuelTypeMap.values());
              dedupedPrices.sort((a, b) => {
                const aType = a.normalized_type?.split(' ')[0] || '';
                const bType = b.normalized_type?.split(' ')[0] || '';
                if (aType !== bType) return aType.localeCompare(bType);
                return a.fuel_type.localeCompare(b.fuel_type);
              });

              console.log(
                `After deduplication: ${dedupedPrices.length} unique fuel types`
              );
              setDoePrices(dedupedPrices);
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

    // Count how many prices have valid data (non-zero)
    const validPriceCount = doePrices.filter(
      (price) =>
        isValidPrice(price.min_price) ||
        isValidPrice(price.common_price) ||
        isValidPrice(price.max_price)
    ).length;

    // If none have valid prices, show a more helpful message
    if (validPriceCount === 0) {
      return (
        <View style={styles.noDataContainer}>
          <View style={styles.noDataRow}>
            <MaterialIcons name='info-outline' size={18} color='#999' />
            <Text style={styles.noDataText}>
              Official price data is available for this station, but current
              prices are not listed.
            </Text>
          </View>
          <Text style={styles.noDataSubText}>
            Visit this station for the latest prices, or report them if you have
            recent information.
          </Text>
          <Text style={styles.officialNoteText}>
            Data as of {formatDate(doePrices[0]?.week_of)}
          </Text>
        </View>
      );
    }

    // Otherwise show the price table with "--" for zero prices
    return (
      <View style={styles.officialPricesContainer}>
        {/* Header row for the columns */}
        <View style={styles.priceHeaderRow}>
          <Text style={styles.fuelTypeHeader}></Text>
          <Text style={styles.priceHeader}>Min</Text>
          <Text style={styles.priceHeader}>Common</Text>
          <Text style={styles.priceHeader}>Max</Text>
        </View>

        {/* One row per fuel type */}
        {doePrices.map((price) => (
          <View key={price.id} style={styles.priceRow}>
            <Text style={styles.fuelType}>{price.display_type}:</Text>
            <Text
              style={[
                styles.price,
                !isValidPrice(price.min_price) && styles.noPrice,
              ]}
            >
              {formatCurrency(price.min_price)}
            </Text>
            <Text
              style={[
                styles.price,
                !isValidPrice(price.common_price) && styles.noPrice,
              ]}
            >
              {formatCurrency(price.common_price)}
            </Text>
            <Text
              style={[
                styles.price,
                !isValidPrice(price.max_price) && styles.noPrice,
              ]}
            >
              {formatCurrency(price.max_price)}
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
