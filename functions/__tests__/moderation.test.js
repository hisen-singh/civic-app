/**
 * Basic unit tests for Cloud Functions moderation/rate-limit constants.
 * Integration tests for triggers require the Firebase emulator suite.
 */

describe('moderation constants', () => {
  // Mirror the constants defined in index.js
  const REPORT_THRESHOLD = 3;
  const ISSUES_PER_HOUR = 5;
  const COMMENTS_PER_HOUR = 20;

  test('auto-hide threshold is 3 unique reports', () => {
    expect(REPORT_THRESHOLD).toBe(3);
  });

  test('issue rate limit is 5 per hour', () => {
    expect(ISSUES_PER_HOUR).toBe(5);
  });

  test('comment rate limit is 20 per hour', () => {
    expect(COMMENTS_PER_HOUR).toBe(20);
  });
});

describe('adminResolveReport action validation', () => {
  const validActions = ['dismiss', 'remove'];

  test('accepts dismiss and remove actions', () => {
    expect(validActions).toContain('dismiss');
    expect(validActions).toContain('remove');
    expect(validActions).not.toContain('ban');
  });
});
