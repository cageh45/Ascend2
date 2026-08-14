export const colors = {
  background: '#0B0D14',
  surface: '#151827',
  surfaceSecondary: '#202334',
  border: '#272B3A',
  primary: '#635BFF',
  primaryLight: '#8B7CFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F96A8',
  success: '#54D68A',
  danger: '#FF6B6B',
  warning: '#FF9D66',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  eyebrow: { fontSize: 9, fontWeight: '900' as const, letterSpacing: 1.6 },
  label: { fontSize: 11, fontWeight: '800' as const },
  title: { fontSize: 28, fontWeight: '900' as const },
  body: { fontSize: 13, lineHeight: 19 },
} as const;

export const shadows = {
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
} as const;

export const theme = { colors, spacing, radii, typography, shadows } as const;
