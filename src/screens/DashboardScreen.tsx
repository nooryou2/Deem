// src/screens/DashboardScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import SummaryTile from '@/components/SummaryTile';
import MaintenanceCard from '@/components/MaintenanceCard';
import EmptyState from '@/components/EmptyState';
import { colors, spacing } from '@/theme/theme';
import { useAuth } from '@/context/AuthContext';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainStackParamList, 'Dashboard'>,
  NativeStackScreenProps<MainStackParamList>
>;

export default function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { items, summary, loading } = useMaintenanceItems();
  const [refreshing, setRefreshing] = React.useState(false);

  const priorityItems = items
    .filter((i) => i.status === 'overdue' || i.status === 'due_soon')
    .slice(0, 5);

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#7A4100"
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 600);
          }}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.headerBlock}>
        <View style={styles.greetingWrapper}>
          <Text style={styles.greeting}>Hi, {firstName}</Text>
          <Text style={styles.wave}>👋</Text>
        </View>
        <Text style={styles.mainTitle}>Your home at a glance</Text>
      </View>

      {/* Primary call to action — book a service with a provider */}
      <TouchableOpacity
        style={styles.bookBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Booking', undefined)}
      >
        <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        <Text style={styles.bookBtnText}>Book a Service</Text>
      </TouchableOpacity>

      {/* Summary Tiles Grid */}
      <View style={styles.tilesContainer}>
        <View style={styles.tilesRow}>
          <SummaryTile
            label="Overdue"
            value={summary.overdue}
            color="#D92D20"
            backgroundColor="#FEE4E2"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'overdue' })}
          />
          <SummaryTile
            label="Due Soon"
            value={summary.dueSoon}
            color="#B54708"
            backgroundColor="#FEF0C7"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'due_soon' })}
          />
        </View>

        <View style={styles.tilesRow}>
          <SummaryTile
            label="Upcoming"
            value={summary.upcoming}
            color="#026AA2"
            backgroundColor="#E0F2FE"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'upcoming' })}
          />
          <SummaryTile
            label="On Track"
            value={summary.onTrack}
            color="#079455"
            backgroundColor="#D1FADF"
            onPress={() => navigation.navigate('Serviced')}
          />
        </View>

        <View style={styles.tilesRow}>
          <SummaryTile
            label="Total Items"
            value={summary.total}
            color="#7A4100"
            backgroundColor="#FAF5EA"
            onPress={() => navigation.navigate('MaintenanceList', { filter: 'all' })}
          />
        </View>
      </View>

      {/* Priority Needs Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Needs Attention</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{priorityItems.length}</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {!loading && priorityItems.length === 0 ? (
          <EmptyState
            icon="✨"
            title="You're all caught up!"
            subtitle="Nothing overdue or due soon right now. Enjoy your day."
          />
        ) : (
          priorityItems.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('MaintenanceDetail', { itemId: item.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  headerBlock: {
    marginBottom: 20,
    marginTop: 10,
  },
  greetingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  wave: {
    fontSize: 16,
    marginLeft: 6,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },

  // Book a Service CTA
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D9A15C',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 22,
    shadowColor: '#7A4100',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Tiles Layout
  tilesContainer: {
    marginBottom: 20,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4100',
  },

  listContainer: {
    gap: 12,
  },
});
