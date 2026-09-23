import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
// src/components/Calendar.tsx
import Text from '@/components/app-text';
import { colors,radius,spacing,typography } from '@/theme/theme';
import React,{ useState } from 'react';
import { StyleSheet,TouchableOpacity,View } from 'react-native';

interface Props {
  selectedDate: string | null; // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  // Dates to render with a dot/marker (e.g. booked days).
  markedDates?: string[];
  // Dates rendered as blocked/unavailable (not selectable).
  blockedDates?: string[];
  // Recurring weekly days off (0=Sun … 6=Sat), rendered as unavailable.
  weeklyOffDays?: number[];
  // If true, past dates are disabled (customer booking). If false, all
  // selectable (provider marking availability).
  disablePast?: boolean;
  // If true, blocked dates remain tappable (provider block mode, to un-block).
  // If false (default), blocked dates are non-tappable (customer booking).
  allowBlockedPress?: boolean;
  // Accent used for markers.
  markerColor?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayISO(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function Calendar({
  selectedDate,
  onSelectDate,
  markedDates = [],
  blockedDates = [],
  weeklyOffDays = [],
  disablePast = true,
  allowBlockedPress = false,
  markerColor = colors.primary,
}: Props) {
  const { t } = useLanguage();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = todayISO();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {t(MONTHS[viewMonth])} {fmtNumber(viewYear, false)}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={10}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday row */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {t(w)}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const dateStr = iso(viewYear, viewMonth, day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          // A cell is "off" if explicitly blocked OR its weekday is a recurring day off.
          const cellWeekday = new Date(viewYear, viewMonth, day).getDay();
          const isWeeklyOff = weeklyOffDays.includes(cellWeekday);
          const isBlocked = blockedDates.includes(dateStr) || isWeeklyOff;
          const isMarked = markedDates.includes(dateStr);
          const isPast = disablePast && dateStr < today;
          // Blocked dates are non-tappable for customers. Provider block-mode
          // can toggle one-off holidays, but weekly off-days are managed via
          // their own control, so those stay non-tappable here.
          const disabled = isPast || isWeeklyOff || (isBlocked && !allowBlockedPress);

          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              activeOpacity={disabled ? 1 : 0.7}
              onPress={() => !disabled && onSelectDate(dateStr)}
              disabled={disabled}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                  isBlocked && styles.dayBlocked,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isPast && styles.dayTextPast,
                    isBlocked && styles.dayTextBlocked,
                  ]}
                >
                  {fmtNumber(day)}
                </Text>
              </View>
              {isMarked && !isSelected ? (
                <View style={[styles.dot, { backgroundColor: markerColor }]} />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 22, color: colors.primary, fontWeight: '700', marginTop: -2 },
  monthLabel: { ...typography.h3 },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    width: CELL as any,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayBlocked: { backgroundColor: '#FEE2E2' },
  dayText: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  dayTextPast: { color: colors.border },
  dayTextBlocked: { color: '#DC2626', textDecorationLine: 'line-through' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotPlaceholder: { width: 5, height: 5, marginTop: 2 },
});
