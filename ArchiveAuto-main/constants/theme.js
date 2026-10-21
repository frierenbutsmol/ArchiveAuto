// AutoCare Design System Tokens
// Centralized theme for consistent visual language across all screens

export const COLORS = {
  // Base backgrounds
  background: '#0F0E11',
  surface: '#151921',
  surfaceElevated: '#1D232D',
  surfaceSubtle: '#262E3B',

  // Primary Accent (AutoCare Electric Cyan)
  primary: '#37C2DF',
  primaryDark: '#2298B0',
  primaryMuted: 'rgba(55, 194, 223, 0.15)',
  primaryGlow: 'rgba(55, 194, 223, 0.35)',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.70)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textInverse: '#0F0E11',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderFocus: '#37C2DF',

  // Semantic
  danger: '#FF5C5C',
  dangerMuted: 'rgba(255, 92, 92, 0.15)',
  success: '#2ED573',
  successMuted: 'rgba(46, 213, 115, 0.15)',
  warning: '#FFA502',
  warningMuted: 'rgba(255, 165, 2, 0.15)',
  info: '#37C2DF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 20,
};

export const RADII = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  card: 16,
  button: 12,
  input: 12,
  full: 999,
};

export const TYPOGRAPHY = {
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodySm: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  titleSm: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hero: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
};

const theme = {
  colors: COLORS,
  spacing: SPACING,
  radii: RADII,
  typography: TYPOGRAPHY,
};

export default theme;
