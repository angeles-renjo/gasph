// styles/screens/StationDetailsScreen.ts
import { StyleSheet } from 'react-native';

export const stationDetailsStyles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#444',
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
  noPrice: {
    color: '#999',
    fontStyle: 'italic',
  },
  officialNoteText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'right',
  },
  noDataContainer: {
    borderLeftColor: '#9e9e9e',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
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
    flex: 1,
  },
  noDataSubText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 26,
    marginBottom: 12,
  },
});
