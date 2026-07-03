/**
 * Formats a date string or Date object into a human-readable relative time string.
 * e.g. "just now", "5m ago", "3h ago", "2d ago", or a formatted date for older items.
 * 
 * @param {string|Date|null} dateInput - ISO date string, Date object, or null
 * @returns {string} Human-readable relative time
 */
export function timeAgo(dateInput) {
    if (!dateInput) return '';
    const now = new Date();
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    // Guard against invalid dates
    if (isNaN(date.getTime())) return '';

    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

/**
 * Validates that a URL is a safe, valid YouTube link.
 * Returns true only for https:// youtube.com or youtu.be URLs.
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is a valid YouTube link
 */
export function isValidYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        const host = parsed.hostname.replace(/^www\./, '');
        return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    } catch {
        return false;
    }
}
