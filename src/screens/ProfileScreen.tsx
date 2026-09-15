// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/Button';
import AreaSelector from '@/components/AreaSelector';
import {
  getHomeownerAreas,
  saveHomeownerAreas,
  getSavedLocations,
} from '@/services/roleService';
import { MAX_SAVED_LOCATIONS } from '@/types';
import { areaLabel } from '@/utils/areas';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainStackParamList, 'Profile'>,
  NativeStackScreenProps<MainStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [editingAreas, setEditingAreas] = useState(false);
  const [savingAreas, setSavingAreas] = useState(false);
  const [locationCount, setLocationCount] = useState(0);

  // Load the homeowner's registered areas.
  useEffect(() => {
    if (!user) return;
    getHomeownerAreas(user.uid).then(setAreas).catch(() => {});
    getSavedLocations(user.uid).then((l) => setLocationCount(l.length)).catch(() => {});
  }, [user]);

  async function handleSaveAreas() {
    if (!user) return;
    if (areas.length === 0) {
      if (Platform.OS === 'web') window.alert('Please select at least one area.');
      else Alert.alert('Areas', 'Please select at least one area.');
      return;
    }
    setSavingAreas(true);
    try {
      await saveHomeownerAreas(user.uid, areas);
      setEditingAreas(false);
      if (Platform.OS === 'web') window.alert('Your areas were updated.');
      else Alert.alert('Areas', 'Your areas were updated.');
    } catch (e) {
      console.log('saveHomeownerAreas failed:', e);
    } finally {
      setSavingAreas(false);
    }
  }

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      console.log('Logout failed:', e);
      if (Platform.OS === 'web') {
        window.alert('Could not log out. Please try again.');
      } else {
        Alert.alert('Error', 'Could not log out. Please try again.');
      }
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    // react-native-web doesn't render Alert.alert buttons, so use the browser's
    // native confirm() on web and the RN Alert on native.
    if (Platform.OS === 'web') {
      const ok = window.confirm('Log out? You can always log back in anytime.');
      if (ok) doLogout();
      return;
    }
    Alert.alert('Log out?', 'You can always log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={typography.h3}>{user?.displayName || 'Deem User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* My areas — drives which providers this homeowner can see */}
      <View style={styles.areaCard}>
        <View style={styles.areaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.areaTitle}>My Areas</Text>
            <Text style={styles.areaSub}>
              You'll only see providers who work in these areas.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setEditingAreas((v) => !v)} hitSlop={8}>
            <Text style={styles.editLink}>{editingAreas ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editingAreas ? (
          <View style={{ marginTop: spacing.md }}>
            <AreaSelector selected={areas} onChange={setAreas} />
            <Button
              label="Save Areas"
              onPress={handleSaveAreas}
              loading={savingAreas}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : areas.length === 0 ? (
          <Text style={styles.noAreas}>No areas set yet — tap Edit to add one.</Text>
        ) : (
          <View style={styles.areaChips}>
            {areas.map((a) => (
              <View key={a} style={styles.areaChip}>
                <Text style={styles.areaChipText}>{areaLabel(a)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Menu — Serviced history now lives here instead of its own tab */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('MyLocations')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>My Locations</Text>
            <Text style={styles.menuSub}>
              {locationCount > 0
                ? `${locationCount} of ${MAX_SAVED_LOCATIONS} saved`
                : 'Set where technicians should come'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Serviced')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Serviced</Text>
            <Text style={styles.menuSub}>Items you've already had serviced</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Button label="Log Out" variant="danger" onPress={confirmLogout} loading={loggingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  email: { ...typography.bodySecondary, marginTop: 2 },

  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  menuLabel: { ...typography.body, fontWeight: '600' },
  areaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  areaHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  areaTitle: { ...typography.body, fontWeight: '700' },
  areaSub: { ...typography.caption, marginTop: 2 },
  editLink: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  noAreas: { ...typography.bodySecondary, marginTop: spacing.md },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  areaChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  areaChipText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  menuSub: { ...typography.caption, marginTop: 2 },
});
