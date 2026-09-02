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
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'object' && typeof dateInput.seconds === 'number') {
        date = new Date(dateInput.seconds * 1000);
    } else {
        date = new Date(dateInput);
    }

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
 * Sanitizes a YouTube URL.
 * Returns a canonical https://www.youtube.com/embed/<id> URL if valid, or null.
 * 
 * @param {string} url - The URL to validate and sanitize
 * @returns {string|null} The sanitized embed URL, or null if invalid
 */
export function sanitizeYouTubeUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() !== url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return null;
        const host = parsed.hostname.replace(/^www\./, '');
        if (!['youtube.com', 'youtu.be'].includes(host)) return null;

        let videoId = null;

        if (host === 'youtu.be') {
            videoId = parsed.pathname.slice(1);
        } else if (parsed.pathname === '/watch') {
            videoId = parsed.searchParams.get('v');
        } else if (parsed.pathname.startsWith('/embed/')) {
            videoId = parsed.pathname.split('/')[2];
        } else if (parsed.pathname.startsWith('/shorts/')) {
            videoId = parsed.pathname.split('/')[2];
        }

        if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

        // Check for disallowed query parameters (allow v, t, list)
        const allowedParams = ['v', 't', 'list'];
        for (const key of Array.from(parsed.searchParams.keys())) {
            if (!allowedParams.includes(key)) return null;
        }

        return `https://www.youtube.com/embed/${videoId}`;
    } catch {
        return null;
    }
}

/**
 * Validates that a URL is a safe, valid YouTube link.
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is a valid YouTube link
 */
export function isValidYouTubeUrl(url) {
    return sanitizeYouTubeUrl(url) !== null;
}
