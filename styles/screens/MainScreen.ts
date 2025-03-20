// styles/screens/MainScreen.ts
import { StyleSheet } from 'react-native';

export const mainScreenStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
  },
  filterItemSelected: {
    backgroundColor: '#2a9d8f',
  },
  filterItemText: {
    fontSize: 14,
    color: '#333',
  },
  filterItemTextSelected: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
});
