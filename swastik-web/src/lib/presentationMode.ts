/**
 * Presentation Mode Configuration (Multi-Tab Demo)
 * 
 * When NEXT_PUBLIC_PRESENTATION_MODE=true:
 * - Uses sessionStorage instead of localStorage for authentication tokens and user state.
 *   This allows multiple accounts/portals (e.g. Hospital A, Hospital B, Doctor, Provider)
 *   to remain independently logged in across different tabs in the same Chrome browser.
 * - Disables cross-tab BroadcastChannel auth sync so logging in/out in one tab never impacts other tabs.
 * - Avoids cross-tab cookie contention in the API proxy.
 * - Displays a small, non-intrusive demo indicator.
 * 
 * In production (default = false):
 * - Standard single-session enforcement with localStorage and cross-tab synchronization.
 */

export const IS_PRESENTATION_MODE =
    typeof process !== 'undefined' &&
    (process.env.PRESENTATION_MODE === 'true' ||
     process.env.NEXT_PUBLIC_PRESENTATION_MODE === 'true');
