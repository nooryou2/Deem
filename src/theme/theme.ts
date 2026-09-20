// src/theme/theme.ts
//
// A single source of truth for color, spacing, and type so every screen
// looks consistent. Palette is warm cream with a gold/amber accent, matching
// the Deem brand mockup — applied across Homeowner, Provider, and Employee
// interfaces alike.

export const colors = {
  // Brand — warm muted gold, lighter than before per feedback
  primary: '#D9A15C',
  primaryDark: '#C08A45',
  primaryLight: '#F6E9D8',

  // Status language (used consistently for badges, dots, icons)
  upcoming: '#2563EB',
  upcomingBg: '#DBEAFE',
  // A distinctly yellow amber — the old value sat too close to the brand gold
  // to read as its own status.
  dueSoon: '#D19A00',
  dueSoonBg: '#FEF3C7',
  overdue: '#C0392B',
  overdueBg: '#FBE6E3',
  completed: '#1E8E5A',
  completedBg: '#DCFCE7',

  // Neutrals — soft warm cream, close to white
  background: '#FBF9F6',
  surface: '#FFFFFF',
  border: '#EFE7DB',
  textPrimary: '#2E2A25',
  textSecondary: '#7A6F63',
  textMuted: '#B0A697',
  white: '#FFFFFF',
  danger: '#C0392B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  bodySecondary: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
  button: { fontSize: 16, fontWeight: '600' as const, color: colors.white },
};

export const shadow = {
  card: {
    shadowColor: '#3D2E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
