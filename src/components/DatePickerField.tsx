// src/components/DatePickerField.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, radius, spacing, typography } from '@/theme/theme';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  // Latest selectable date (defaults to today — you can't service in the future).
  maximumDate?: Date;
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toInputValue(d: Date): string {
  // yyyy-mm-dd for the HTML date input
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function DatePickerField({ label, value, onChange, maximumDate }: Props) {
  const max = maximumDate ?? new Date();

  // ---- WEB: use the browser's native date input ----
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        {/* @ts-ignore - react-native-web passes through DOM props */}
        <input
          type="date"
          value={toInputValue(value)}
          max={toInputValue(max)}
          onChange={(e: any) => {
            const v = e.target.value;
            if (v) {
              const [y, m, d] = v.split('-').map(Number);
              onChange(new Date(y, m - 1, d));
            }
          }}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: 12,
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </View>
    );
  }

  // ---- NATIVE (iOS/Android): tappable field that opens wheel pickers ----
  return <NativeDatePicker label={label} value={value} onChange={onChange} max={max} />;
}

function NativeDatePicker({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  max: Date;
}) {
  const [open, setOpen] = useState(false);
  const [tempDay, setTempDay] = useState(value.getDate());
  const [tempMonth, setTempMonth] = useState(value.getMonth());
  const [tempYear, setTempYear] = useState(value.getFullYear());

  const currentYear = max.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i); // last 10 yrs
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function confirm() {
    let chosen = new Date(tempYear, tempMonth, Math.min(tempDay, daysInMonth));
    if (chosen > max) chosen = max; // never allow a future service date
    onChange(chosen);
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.fieldText}>{formatDisplay(value)}</Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <Picker
                selectedValue={tempDay}
                style={styles.picker}
                onValueChange={(v) => setTempDay(Number(v))}
              >
                {days.map((d) => (
                  <Picker.Item key={d} label={`${d}`} value={d} />
                ))}
              </Picker>
              <Picker
                selectedValue={tempMonth}
                style={styles.picker}
                onValueChange={(v) => setTempMonth(Number(v))}
              >
                {months.map((m, i) => (
                  <Picker.Item key={m} label={m} value={i} />
                ))}
              </Picker>
              <Picker
                selectedValue={tempYear}
                style={styles.picker}
                onValueChange={(v) => setTempYear(Number(v))}
              >
                {years.map((y) => (
                  <Picker.Item key={y} label={`${y}`} value={y} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.bodySecondary, fontWeight: '600', marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  fieldText: { ...typography.body },
  calendarIcon: { fontSize: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3 },
  modalCancel: { color: colors.textSecondary, fontSize: 16 },
  modalDone: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  pickerRow: { flexDirection: 'row' },
  picker: { flex: 1 },
});