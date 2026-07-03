/**
 * Civic Hero — Centralized Category Taxonomy
 * Single source of truth for all issue categories.
 * Grouped by parent for hierarchical filtering.
 */

export const CATEGORY_GROUPS = [
    { id: 'infrastructure', label: 'Infrastructure', icon: 'road-variant', color: '#F97316' },
    { id: 'utilities', label: 'Utilities', icon: 'flash', color: '#EAB308' },
    { id: 'sanitation', label: 'Sanitation', icon: 'broom', color: '#22C55E' },
    { id: 'safety', label: 'Safety', icon: 'shield-alert-outline', color: '#EF4444' },
    { id: 'environment', label: 'Environment', icon: 'tree-outline', color: '#10B981' },
    { id: 'public_services', label: 'Public Services', icon: 'bus', color: '#6366F1' },
];

export const CATEGORIES = [
    // Infrastructure
    { name: 'Pothole', icon: 'road-variant', group: 'infrastructure' },
    { name: 'Road Damage', icon: 'alert-octagon-outline', group: 'infrastructure' },
    { name: 'Bridge Issue', icon: 'bridge', group: 'infrastructure' },
    { name: 'Footpath', icon: 'walk', group: 'infrastructure' },

    // Utilities
    { name: 'Water Supply', icon: 'water-outline', group: 'utilities' },
    { name: 'Electricity', icon: 'flash-outline', group: 'utilities' },
    { name: 'Gas Leak', icon: 'fire', group: 'utilities' },
    { name: 'Sewage', icon: 'pipe-leak', group: 'utilities' },

    // Sanitation
    { name: 'Litter', icon: 'trash-can-outline', group: 'utilities' },
    { name: 'Garbage', icon: 'delete-outline', group: 'sanitation' },
    { name: 'Illegal Dumping', icon: 'dump-truck', group: 'sanitation' },
    { name: 'Drain Blockage', icon: 'pipe-disconnected', group: 'sanitation' },

    // Safety
    { name: 'Lighting', icon: 'lightbulb-outline', group: 'safety' },
    { name: 'Women Safety', icon: 'shield-alert-outline', group: 'safety' },
    { name: 'Traffic', icon: 'traffic-light', group: 'safety' },
    { name: 'Stray Animals', icon: 'dog', group: 'safety' },

    // Environment
    { name: 'Graffiti', icon: 'spray', group: 'environment' },
    { name: 'Tree Damage', icon: 'tree', group: 'environment' },
    { name: 'Noise Pollution', icon: 'volume-high', group: 'environment' },
    { name: 'Water Pollution', icon: 'water-off', group: 'environment' },

    // Public Services
    { name: 'Public Transport', icon: 'bus', group: 'public_services' },
    { name: 'Public Toilet', icon: 'human-male-female', group: 'public_services' },
    { name: 'Parks', icon: 'nature', group: 'public_services' },
    { name: 'Other', icon: 'dots-horizontal-circle-outline', group: 'public_services' },
];

/** Get all categories for a specific group */
export const getCategoriesByGroup = (groupId) =>
    CATEGORIES.filter(c => c.group === groupId);

/** Get the group object for a category name */
export const getGroupForCategory = (categoryName) => {
    const cat = CATEGORIES.find(c => c.name === categoryName);
    if (!cat) return null;
    return CATEGORY_GROUPS.find(g => g.id === cat.group) || null;
};

/** Get category icon by name */
export const getCategoryIcon = (categoryName) => {
    const cat = CATEGORIES.find(c => c.name === categoryName);
    return cat?.icon || 'help-circle-outline';
};

/** Legacy compatibility — flat list of category names */
export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);
