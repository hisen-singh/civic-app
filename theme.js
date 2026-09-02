/**
 * Civic — Centralized Design System
 * Three-color palette principle (60-30-10):
 *   60% Dominant  — Ink: #08090F and its tints (backgrounds, surfaces)
 *   30% Secondary — White/Slate: text, borders, inactive UI
 *   10% Accent    — Electric Blue #3B82F6 family: CTAs, active states, "Solved"
 *   Reserved semantic — Red #EF4444: critical urgency / failed ONLY
 * Import this everywhere instead of hardcoding values.
 */

import { MD3DarkTheme } from "react-native-paper";

export const Colors = {
  // ─── Core Backgrounds ─────────────────────────────────────────────────────
  background: "#090A10", // Primary app background
  surface: "#101218", // Cards, containers
  surfaceElevated: "#151824", // Elevated surfaces (modals, menus)
  surfaceHover: "#1A1E2A", // Hover / active states

  // ─── Text ──────────────────────────────────────────────────────────────────
  textPrimary: "#F1F5F9", // Headings, primary content
  textSecondary: "#94A3B8", // Subtitles, metadata
  textTertiary: "#64748B", // Disabled, placeholder
  textInverse: "#0A0E1A", // Text on light backgrounds

  // ─── Brand Accent (10%) ────────────────────────────────────────────────────
  accent: "#3B82F6", // Primary accent (Electric Blue)
  accentLight: "#60A5FA", // Lighter accent
  accentDark: "#1D4ED8", // Darker accent
  accentSurface: "rgba(59, 130, 246, 0.12)", // Accent tinted surface

  // ─── Status (folded into palette; red reserved for critical) ──────────────
  success: "#3B82F6", // Solved, positive → accent blue
  successSurface: "rgba(59, 130, 246, 0.12)",
  warning: "#94A3B8", // Caution → slate
  warningSurface: "rgba(148, 163, 184, 0.12)",
  error: "#EF4444", // Failed, destructive
  errorSurface: "rgba(239, 68, 68, 0.20)",
  info: "#60A5FA", // Informational → accent light
  infoSurface: "rgba(96, 165, 250, 0.12)",

  // ─── Urgency (slate ramp; red only for critical) ───────────────────────────
  critical: "#EF4444",
  criticalBg: "rgba(239, 68, 68, 0.15)",
  high: "#F5F5F7",
  highBg: "rgba(245, 245, 247, 0.12)",
  medium: "#94A3B8",
  mediumBg: "rgba(148, 163, 184, 0.12)",
  low: "#64748B",
  lowBg: "rgba(100, 116, 139, 0.12)",

  // ─── Borders ───────────────────────────────────────────────────────────────
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  borderFocus: "rgba(59, 130, 246, 0.5)",

  // ─── Overlay ───────────────────────────────────────────────────────────────
  overlay: "rgba(0, 0, 0, 0.6)",
  glass: "rgba(19, 25, 37, 0.85)",

  // ─── Tab Bar ───────────────────────────────────────────────────────────────
  tabBarBg: "#0A0E1A",
  tabActive: "#F1F5F9",
  tabInactive: "#475569",

  // ─── Notification Dot ──────────────────────────────────────────────────────
  notifDot: "#EF4444",
};

export const Gradients = {
  header: ["#0A0E1A", "#131925"],
  heroCard: ["#131925", "#1A2133"],
  accentHeader: ["#1D4ED8", "#3B82F6"],
  reportHeader: ["#1D4ED8", "#2563EB"],
  mapOverlay: ["rgba(10, 14, 26, 0.95)", "rgba(10, 14, 26, 0)"],
  authBg: ["#0A0E1A", "#131925"],
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
  displayLarge: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  displayMedium: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  headline: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  overline: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  buttonLabel: { fontSize: 15, fontWeight: "700" },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#3B82F6",
    onPrimary: "#FFFFFF",
    background: "#090A10",
    onBackground: "#F5F5F7",
    surface: "#101218",
    onSurface: "#F5F5F7",
    surfaceVariant: "#151824",
    onSurfaceVariant: "#8F95A3",
    surfaceElevated: "#151824",
    surfaceHover: "#1A1E2A",
    surfaceCard: "rgba(255, 255, 255, 0.05)",
    textPrimary: "#F5F5F7",
    textMuted: "#8F95A3",
    actionDefault: "#F5F5F7",
    actionHover: "#3B82F6",
    accentBrand: "#3B82F6",
    accentBrandLight: "#60A5FA",
    accentBrandSubtle: "rgba(59, 130, 246, 0.14)",
    border: "rgba(255, 255, 255, 0.08)",
    borderSubtle: "rgba(255, 255, 255, 0.05)",
    statusLow: "#64748B",
    statusMedium: "#94A3B8",
    statusCritical: "#EF4444",
    statusLowBg: "rgba(100, 116, 139, 0.20)",
    statusMediumBg: "rgba(148, 163, 184, 0.20)",
    statusCriticalBg: "rgba(239, 68, 68, 0.20)",
    error: "#EF4444",
  },
  gradients: {
    cta: ["#60A5FA", "#2563EB"],
    glowButton: ["#60A5FA", "#1D4ED8"],
    headerFade: ["rgba(8,9,15,0.96)", "rgba(8,9,15,0)"],
    hero: ["#181A25", "#08090F"],
    success: ["#3B82F6", "#1D4ED8"],
  },
  radius: {
    outer: 24,
    inner: 18,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  font: {
    display: "SpaceGrotesk_700Bold",
    displayMedium: "SpaceGrotesk_500Medium",
    body: "Inter_400Regular",
    bodyMedium: "Inter_500Medium",
    bodyBold: "Inter_700Bold",
  },
  type: {
    display: { fontFamily: "SpaceGrotesk_700Bold", fontWeight: "600", letterSpacing: -0.2 },
    title: { fontFamily: "SpaceGrotesk_700Bold", fontWeight: "600", letterSpacing: -0.2 },
    body: { fontFamily: "Inter_400Regular", fontWeight: "400" },
    meta: { fontFamily: "Inter_500Medium", fontWeight: "500" },
    micro: { fontFamily: "Inter_500Medium", fontWeight: "500", letterSpacing: 0.5, fontSize: 11, textTransform: "uppercase" },
  },
  shadows: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    soft: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    ambient: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 4,
    }
  },
};
