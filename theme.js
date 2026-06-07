/**
 * Civic — Centralized Design System
 * Single source of truth for all colors, spacing, typography, and design tokens.
 * Import this everywhere instead of hardcoding values.
 */

export const Colors = {
  // ─── Core Backgrounds ─────────────────────────────────────────────────────
  background: '#0A0E1A',       // Primary app background
  surface: '#131925',          // Cards, containers
  surfaceElevated: '#1A2133',  // Elevated surfaces (modals, menus)
  surfaceHover: '#1F2940',     // Hover / active states

  // ─── Text ──────────────────────────────────────────────────────────────────
  textPrimary: '#F1F5F9',      // Headings, primary content
  textSecondary: '#94A3B8',    // Subtitles, metadata
  textTertiary: '#64748B',     // Disabled, placeholder
  textInverse: '#0A0E1A',      // Text on light backgrounds

  // ─── Brand Accent ─────────────────────────────────────────────────────────
  accent: '#6366F1',           // Primary accent (Indigo-500)
  accentLight: '#818CF8',      // Lighter accent
  accentDark: '#4338CA',       // Darker accent
  accentSurface: 'rgba(99, 102, 241, 0.12)', // Accent tinted surface

  // ─── Status ────────────────────────────────────────────────────────────────
  success: '#10B981',          // Solved, positive
  successSurface: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',          // In progress, caution
  warningSurface: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',            // Failed, destructive
  errorSurface: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',             // Informational
  infoSurface: 'rgba(59, 130, 246, 0.12)',

  // ─── Urgency ───────────────────────────────────────────────────────────────
  critical: '#EF4444',
  criticalBg: 'rgba(239, 68, 68, 0.15)',
  high: '#F97316',
  highBg: 'rgba(249, 115, 22, 0.15)',
  medium: '#EAB308',
  mediumBg: 'rgba(234, 179, 8, 0.15)',
  low: '#22C55E',
  lowBg: 'rgba(34, 197, 94, 0.15)',

  // ─── Borders ───────────────────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.06)',
  borderSubtle: 'rgba(255, 255, 255, 0.03)',
  borderFocus: 'rgba(99, 102, 241, 0.5)',

  // ─── Overlay ───────────────────────────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.6)',
  glass: 'rgba(19, 25, 37, 0.85)',

  // ─── Tab Bar ───────────────────────────────────────────────────────────────
  tabBarBg: '#0A0E1A',
  tabActive: '#F1F5F9',
  tabInactive: '#475569',

  // ─── Notification Dot ──────────────────────────────────────────────────────
  notifDot: '#EF4444',
};

export const Gradients = {
  header: ['#0A0E1A', '#131925'],
  heroCard: ['#131925', '#1A2133'],
  accentHeader: ['#4338CA', '#6366F1'],
  reportHeader: ['#6366F1', '#8B5CF6'],
  mapOverlay: ['rgba(10, 14, 26, 0.95)', 'rgba(10, 14, 26, 0)'],
  authBg: ['#0A0E1A', '#131925'],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 16,
  headerTop: 56, // SafeArea top padding
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
  circle: 999,
};

export const Typography = {
  displayLarge: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  displayMedium: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  headline: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  overline: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
};
