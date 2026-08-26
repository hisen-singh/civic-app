import { isValidYouTubeUrl, sanitizeYouTubeUrl } from '../utils/timeAgo';

describe('YouTube URL Validation', () => {
    describe('isValidYouTubeUrl', () => {
        it('accepts valid watch URLs', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
            expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(true);
        });

        it('accepts valid youtu.be URLs', () => {
            expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
            expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe(true);
        });

        it('accepts valid embed URLs', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
        });

        it('accepts valid shorts URLs', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
        });

        it('rejects invalid IDs', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXc')).toBe(false); // 10 chars
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ1')).toBe(false); // 12 chars
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgX!!')).toBe(false); // bad chars
        });

        it('rejects spoofed hosts', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBe(false);
            expect(isValidYouTubeUrl('https://youtube.evil.com/watch?v=dQw4w9WgXcQ')).toBe(false);
        });

        it('rejects non-https protocols', () => {
            expect(isValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
            expect(isValidYouTubeUrl('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
        });

        it('rejects extra tracking params', () => {
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=123456')).toBe(false);
            expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=123456')).toBe(false);
        });

        it('rejects null, undefined, empty, whitespace', () => {
            expect(isValidYouTubeUrl(null)).toBe(false);
            expect(isValidYouTubeUrl(undefined)).toBe(false);
            expect(isValidYouTubeUrl('')).toBe(false);
            expect(isValidYouTubeUrl(' https://www.youtube.com/watch?v=dQw4w9WgXcQ ')).toBe(false);
            expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ ')).toBe(false);
        });
    });

    describe('sanitizeYouTubeUrl', () => {
        it('returns canonical embed URL for valid inputs', () => {
            expect(sanitizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(sanitizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(sanitizeYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(sanitizeYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('returns null for invalid inputs', () => {
            expect(sanitizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&evil=true')).toBeNull();
            expect(sanitizeYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
            expect(sanitizeYouTubeUrl('https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
        });
    });
});
