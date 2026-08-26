# TASK-003
- **Task ID:** TASK-003
- **Title:** Harden YouTube URL validation (sanitize params)
- **Priority:** MEDIUM
- **Status:** COMPLETED

## Objective
Extend `isValidYouTubeUrl` in `utils/timeAgo.js` so only genuine video URLs pass and tracking/injection params are neutralized.

## Context
- Current implementation allowlists youtube.com/youtu.be domains only.
- Consumers: `components/IssueCard.js`, `screens/IssueDetailScreen.js`, `screens/ReportIssueScreen.js` (verify with grep before editing).
- Audit finding #13: `youtube.com/embed/...` and crafted query strings bypass intent; URL params unsanitized.

## Detailed requirements
1. `isValidYouTubeUrl(url)` must return true ONLY for:
   - `https://www.youtube.com/watch?v=<11-char id>` (+ optional `&t=...` start time)
   - `https://youtu.be/<11-char id>` (+ optional `?t=`)
   - `https://www.youtube.com/embed/<11-char id>`
   - `https://www.youtube.com/shorts/<11-char id>`
2. Video ID pattern: `^[A-Za-z0-9_-]{11}$`.
3. Reject: extra unexpected query params (anything besides `v`, `t`, `list` for watch URLs), non-https protocols, host spoofing (e.g., `youtube.com.evil.com`), whitespace.
4. If consumers build embed/player URLs themselves, add an exported `sanitizeYouTubeUrl(url)` that returns a canonical `https://www.youtube.com/embed/<id>` form or `null`. Update consumers ONLY if they currently render raw user input as a URL (check first; do not refactor beyond need).

## Acceptance criteria
- New unit test file `__tests__/youtubeUrl.test.js` covering: valid watch/youtu.be/embed/shorts, invalid IDs (10/12 chars, bad chars), spoofed hosts, http://, extra tracking params, null/undefined/empty.
- All existing suites still pass.

## Allowed files
- `utils/timeAgo.js`
- `__tests__/youtubeUrl.test.js` (new)
- Consumer files ONLY if raw URL is rendered unsanitized (justify in result file)

## Forbidden actions
- Changing timeAgo logic itself.
- Installing packages (use `URL`/regex only).

## Required tests
- `npx jest --ci __tests__/youtubeUrl.test.js`
- `npx jest --ci` full run green.

## Completion requirements
- Result file `.agents/results/TASK-003.md` per protocol README.
