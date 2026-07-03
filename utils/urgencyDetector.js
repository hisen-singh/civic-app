/**
 * Smart Urgency Detection
 * Analyzes issue title + description to auto-detect urgency level.
 */

const URGENCY_KEYWORDS = {
  critical: [
    'collapse', 'collapsed', 'collapsing',
    'fire', 'burning', 'flames',
    'flood', 'flooding', 'flooded',
    'accident', 'crash', 'injured', 'injury',
    'electrocution', 'electric shock', 'live wire',
    'gas leak', 'explosion',
    'sinkhole', 'cave-in',
    'emergency', 'life threatening', 'life-threatening',
    'death', 'fatal', 'killed',
    'child stuck', 'trapped',
  ],
  high: [
    'dangerous', 'hazardous', 'hazard',
    'broken', 'shattered',
    'urgent', 'immediately', 'asap',
    'blocked road', 'road blocked', 'road closure',
    'deep pothole', 'massive pothole',
    'sewage overflow', 'sewage leak', 'sewage spill',
    'no water', 'water cut', 'water supply',
    'power outage', 'no electricity', 'blackout',
    'unsafe', 'risk', 'threat',
    'structural damage', 'crack in wall', 'cracking',
    'fallen tree', 'tree fell',
    'exposed wiring', 'open manhole',
    'harassment', 'assault', 'stalking',
  ],
  medium: [
    'pothole', 'crack', 'damage',
    'graffiti', 'vandalism',
    'litter', 'garbage', 'trash', 'dumping',
    'broken light', 'streetlight', 'lamp',
    'drainage', 'clogged', 'blocked drain',
    'noise', 'pollution',
    'stray', 'animals',
    'parking', 'illegal parking',
    'overflowing', 'overflow',
  ],
};

export function detectUrgency(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();

  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (text.includes(keyword)) {
      return { urgency: 'critical', matchedKeyword: keyword, confidence: 'high' };
    }
  }

  for (const keyword of URGENCY_KEYWORDS.high) {
    if (text.includes(keyword)) {
      return { urgency: 'high', matchedKeyword: keyword, confidence: 'high' };
    }
  }

  for (const keyword of URGENCY_KEYWORDS.medium) {
    if (text.includes(keyword)) {
      return { urgency: 'medium', matchedKeyword: keyword, confidence: 'medium' };
    }
  }

  return { urgency: 'low', matchedKeyword: null, confidence: 'low' };
}

export const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', icon: 'alert-octagon', desc: 'Immediate danger to life or property', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { id: 'high', label: 'High', icon: 'alert', desc: 'Serious, needs fast response', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
  { id: 'medium', label: 'Medium', icon: 'alert-circle-outline', desc: 'Standard community issue', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' },
  { id: 'low', label: 'Low', icon: 'information-outline', desc: 'Minor, non-urgent concern', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
];
