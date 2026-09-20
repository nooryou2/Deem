// src/screens/admin/AdminTemplatesScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/services/adminService';
import SearchBar from '@/components/SearchBar';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { AdminTemplate, MaintenanceCategory, ServiceFrequency } from '@/types';

const FREQUENCIES: ServiceFrequency[] = [
  'monthly',
  'every_3_months',
  'every_6_months',
  'yearly',
];

export default function AdminTemplatesScreen() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTemplate | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('ac');
  const [frequency, setFrequency] = useState<ServiceFrequency>('every_6_months');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Templates', msg);
  }

  function openEditor(t?: AdminTemplate) {
    setEditing(t ?? null);
    setName(t?.name ?? '');
    setCategory(t?.category ?? 'ac');
    setFrequency(t?.defaultFrequency ?? 'every_6_months');
    setEditorOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      notify('Please give the template a name.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, {
          name: name.trim(),
          category,
          defaultFrequency: frequency,
        });
      } else {
        await createTemplate({ name: name.trim(), category, defaultFrequency: frequency });
      }
      setEditorOpen(false);
      load();
    } catch {
      notify('Could not save the template.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: AdminTemplate) {
    try {
      await updateTemplate(t.id, { active: !t.active });
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x))
      );
    } catch {
      notify('Could not update the template.');
    }
  }

  function confirmDelete(t: AdminTemplate) {
    const run = async () => {
      try {
        await deleteTemplate(t.id);
        setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      } catch {
        notify('Could not delete the template.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${t.name}"?`)) run();
      return;
    }
    Alert.alert('Delete template?', t.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? templates.filter((t) => t.name.toLowerCase().includes(q)) : templates;
  }, [templates, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Maintenance Templates</Text>
        <Text style={styles.pageSub}>Manage default maintenance templates</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search templates…" />
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => openEditor()}>
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.addBtnText}>Add Template</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {CATEGORY_LABELS[item.category] ?? 'Service'} ·{' '}
                {FREQUENCY_LABELS[item.defaultFrequency] ?? item.defaultFrequency}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.statusPill, item.active ? styles.activePill : styles.inactivePill]}
              onPress={() => toggleActive(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusText, item.active ? styles.activeText : styles.inactiveText]}>
                {item.active ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openEditor(item)} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptySub}>
              Templates give users a starting point when adding an appliance.
            </Text>
          </View>
        }
      />

      {/* Editor */}
      <Modal visible={editorOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editing ? 'Edit Template' : 'Add Template'}
            </Text>

            <InputField
              label="Template name"
              placeholder="e.g. AC Filter Cleaning"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {Object.entries(CATEGORY_LABELS)
                .filter(([v]) => v !== 'custom')
                .map(([value, label]) => {
                  const on = category === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setCategory(value as MaintenanceCategory)}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            <Text style={styles.fieldLabel}>Default frequency</Text>
            <View style={styles.chipWrap}>
              {FREQUENCIES.map((f) => {
                const on = frequency === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {FREQUENCY_LABELS[f] ?? f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setEditorOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  name: { ...typography.body, fontWeight: '700' },
  sub: { ...typography.caption, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  activePill: { backgroundColor: '#D1FADF' },
  inactivePill: { backgroundColor: colors.border },
  statusText: { fontSize: 10, fontWeight: '700' },
  activeText: { color: '#079455' },
  inactiveText: { color: colors.textSecondary },
  iconBtn: { marginLeft: 4 },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptySub: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { ...typography.h2, marginBottom: spacing.md },
  fieldLabel: {
    ...typography.bodySecondary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.white },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
