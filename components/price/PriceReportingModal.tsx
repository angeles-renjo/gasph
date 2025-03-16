// components/price/PriceReportingModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PriceReportData {
  stationId: string;
  fuelType: string;
  price: number;
}

interface PriceReportingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PriceReportData) => void;
  stationName: string;
  stationId: string;
  initialPrice?: string;
  selectedFuelType?: string;
  fuelTypes?: string[];
  isLoading?: boolean;
}

/**
 * Modal for users to report fuel prices
 * Follows Single Responsibility Principle - only handles price submission UI
 */
const PriceReportingModal: React.FC<PriceReportingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  stationName,
  stationId,
  initialPrice = '',
  selectedFuelType = '',
  fuelTypes = [
    'Diesel',
    'Gasoline (RON 91)',
    'Gasoline (RON 95)',
    'Gasoline (RON 97)',
  ],
  isLoading = false,
}) => {
  const [price, setPrice] = useState<string>('');
  const [fuelType, setFuelType] = useState<string>(fuelTypes[0]);
  const [error, setError] = useState<string>('');

  // Reset form when modal opens or props change
  useEffect(() => {
    if (visible) {
      setPrice(initialPrice);
      setFuelType(selectedFuelType || fuelTypes[0]);
      setError('');
    }
  }, [visible, initialPrice, selectedFuelType, fuelTypes]);

  const handlePriceChange = (text: string) => {
    // Allow only numbers and one decimal point with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(text)) {
      setPrice(text);
      setError('');
    }
  };

  const validateForm = (): boolean => {
    if (!price || parseFloat(price) <= 0) {
      setError('Please enter a valid price');
      return false;
    }

    if (parseFloat(price) < 20 || parseFloat(price) > 100) {
      setError('Price seems unrealistic. Please check your input.');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      stationId,
      fuelType,
      price: parseFloat(price),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Report Fuel Price</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name='close' size={24} color='#666' />
            </TouchableOpacity>
          </View>

          <Text style={styles.stationName}>{stationName}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fuel Type</Text>
            <View style={styles.fuelTypeContainer}>
              {fuelTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.fuelTypeButton,
                    fuelType === type && styles.selectedFuelType,
                  ]}
                  onPress={() => setFuelType(type)}
                >
                  <Text
                    style={[
                      styles.fuelTypeText,
                      fuelType === type && styles.selectedFuelTypeText,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Price (₱)</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={handlePriceChange}
              placeholder='0.00'
              keyboardType='decimal-pad'
              returnKeyType='done'
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.disclaimerContainer}>
            <Ionicons
              name='information-circle-outline'
              size={16}
              color='#666'
            />
            <Text style={styles.disclaimerText}>
              By submitting, you confirm this is the current price you observed
              at this station.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Text style={styles.submitButtonText}>Submit Price</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  stationName: {
    fontSize: 16,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  fuelTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  fuelTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 4,
  },
  selectedFuelType: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  fuelTypeText: {
    fontSize: 14,
    color: '#333',
  },
  selectedFuelTypeText: {
    color: '#fff',
    fontWeight: '500',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PriceReportingModal;
