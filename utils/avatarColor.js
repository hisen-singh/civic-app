/**
 * Deterministic avatar color from a display name.
 * Single source of truth — import this instead of defining local copies.
 * Blue tonal ramp: identity comes from lightness, not extra hues (60-30-10 palette).
 */
const AVATAR_COLORS = [
  "#172554",
  "#1E3A8A",
  "#1E40AF",
  "#1D4ED8",
  "#2563EB",
  "#3B82F6",
];

export function getAvatarColor(name) {
  let hash = 0;
  const n = name || "";
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
