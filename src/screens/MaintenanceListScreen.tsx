// src/screens/MaintenanceListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import MaintenanceCard from '@/components/MaintenanceCard';
import EmptyState from '@/components/EmptyState';
import ChipSelector from '@/components/ChipSelector';
import SearchBar from '@/components/SearchBar';
import { colors, spacing, radius } from '@/theme/theme';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { MaintenanceStatus } from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainStackParamList, 'MaintenanceList'>,
  NativeStackScreenProps<MainStackParamList>
>;

type FilterValue = 'all' | MaintenanceStatus | 'on_track';

// Backgrounds and text are taken from the dashboard summary tiles, so a status
// looks the same wherever it appears. A selected chip fills with the tile's
// pale background and keeps its darker text, rather than inverting to white.
const FILTERS: {
  value: FilterValue;
  label: string;
  color?: string;
  textColor?: string;
}[] = [
  { value: 'all', label: 'All', color: '#FAF5EA', textColor: '#7A4100' },
  { value: 'overdue', label: 'Overdue', color: '#FEE4E2', textColor: '#D92D20' },
  { value: 'due_soon', label: 'Due Soon', color: '#FEF0C7', textColor: '#B54708' },
  { value: 'upcoming', label: 'Upcoming', color: '#E0F2FE', textColor: '#026AA2' },
  { value: 'on_track', label: 'On Track', color: '#D1FADF', textColor: '#079455' },
];

export default function MaintenanceListScreen({ navigation, route }: Props) {
  const { items, loading } = useMaintenanceItems();
  const [filter, setFilter] = useState<FilterValue>(route.params?.filter ?? 'all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (route.params?.filter) setFilter(route.params.filter);
  }, [route.params?.filter]);

  const query = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    // A booking still awaiting the provider isn't scheduled yet, so it
    // shouldn't surface under the date-based filters.
    const unconfirmed =
      item.bookingStatus === 'pending' || item.bookingStatus === 'declined';

    // Status/category filter
    if (filter === 'on_track') {
      if (!(Boolean(item.lastServiceDate) && item.status === 'upcoming')) return false;
      if (unconfirmed) return false;
    } else if (filter !== 'all') {
      if (unconfirmed) return false;
      if (item.status !== filter) return false;
    }
    // Text search on name and notes
    if (query) {
      const haystack = `${item.name} ${item.notes ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search maintenance…" />
      </View>
      {/* Registering appliances is the point of this screen, so the action to
          add one sits with the list rather than hidden in a header icon. */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your Appliances</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddEditMaintenance', undefined)}
        >
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <ChipSelector options={FILTERS} selectedValue={filter} onSelect={(v) => setFilter(v as any)} />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <MaintenanceCard
            item={item}
            onPress={() => navigation.navigate('MaintenanceDetail', { itemId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="🧰"
              title={query ? 'No matches' : 'No maintenance items here'}
              subtitle={
                query
                  ? `Nothing matches "${search.trim()}".`
                  : filter === 'all'
                  ? 'Your maintenance items will appear here.'
                  : 'Nothing in this category right now.'
              }
            />
          ) : null
        }
      />

      {/* Floating button — books a service (same destination as the old
          "Book a Service" button that used to sit at the top of the page). */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Booking', undefined)}
        accessibilityLabel="Book a service"
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.fabLabel}>Book a Service</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  filterRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  // Extra bottom padding so the last card isn't hidden behind the FAB.
  listContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 96 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#3D2E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  fabLabel: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
