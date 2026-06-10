/**
 * Feature flags — simple compile-time toggles for features that are
 * implemented but temporarily disabled in the UI.
 */

/**
 * Phone-number sign-in / sign-up (Supabase OTP via SMS).
 *
 * Disabled because the underlying Twilio account is on a trial plan,
 * which can only send SMS to phone numbers manually verified in the
 * Twilio console — every other user hits "Error sending confirmation
 * OTP to provider: ... is unverified".
 *
 * Re-enable once the Twilio account is upgraded to a paid plan (or a
 * production-ready SMS provider is configured in Supabase Auth →
 * Providers → Phone).
 */
export const PHONE_AUTH_ENABLED = false
