import { createClient } from '@supabase/supabase-js';

// These values come from your Supabase project settings
// Go to: Project Settings > API > Project URL and anon/public key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// ============================================
// SECURITY: Email Validation
// ============================================

/**
 * Strict email validation regex
 * - Allows letters, numbers, dots, hyphens, underscores, plus signs
 * - Requires @ symbol
 * - Requires valid domain with at least 2 character TLD
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * List of common disposable email domains to block
 */
const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
    'fakeinbox.com', 'temp-mail.org', 'tempail.com', 'dispostable.com',
    '10minutemail.com', 'yopmail.com', 'trashmail.com', 'getnada.com',
    'maildrop.cc', 'sharklasers.com', 'mailnesia.com', 'mintemail.com'
];

/**
 * Validate email format and domain
 * @param {string} email - The email to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Please enter an email address.' };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check basic format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
        return { valid: false, error: 'Please enter a valid email address.' };
    }

    // Check minimum length
    if (trimmedEmail.length < 5) {
        return { valid: false, error: 'Email address is too short.' };
    }

    // Check maximum length
    if (trimmedEmail.length > 254) {
        return { valid: false, error: 'Email address is too long.' };
    }

    // Extract domain
    const domain = trimmedEmail.split('@')[1];

    // Check for disposable email domains
    if (DISPOSABLE_DOMAINS.includes(domain)) {
        return { valid: false, error: 'Please use a permanent email address.' };
    }

    return { valid: true };
}

// ============================================
// SECURITY: Rate Limiting (Client-Side)
// ============================================

const RATE_LIMIT_KEY = 'eiger_waitlist_submissions';
const MAX_SUBMISSIONS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if user has exceeded rate limit
 * @returns {{allowed: boolean, remainingAttempts: number, resetTime?: Date}}
 */
export function checkRateLimit() {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const now = Date.now();

        if (!stored) {
            return { allowed: true, remainingAttempts: MAX_SUBMISSIONS_PER_HOUR };
        }

        const data = JSON.parse(stored);

        // Filter out old submissions (older than 1 hour)
        const recentSubmissions = data.submissions.filter(
            (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
        );

        // Update storage with only recent submissions
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ submissions: recentSubmissions }));

        const remainingAttempts = MAX_SUBMISSIONS_PER_HOUR - recentSubmissions.length;

        if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
            // Find when the oldest submission will expire
            const oldestSubmission = Math.min(...recentSubmissions);
            const resetTime = new Date(oldestSubmission + RATE_LIMIT_WINDOW_MS);

            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime
            };
        }

        return { allowed: true, remainingAttempts };
    } catch {
        // If localStorage fails, allow the request
        return { allowed: true, remainingAttempts: MAX_SUBMISSIONS_PER_HOUR };
    }
}

/**
 * Record a submission attempt
 */
export function recordSubmission() {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const now = Date.now();

        let data = { submissions: [] };

        if (stored) {
            data = JSON.parse(stored);
            // Filter out old submissions
            data.submissions = data.submissions.filter(
                (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
            );
        }

        data.submissions.push(now);
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch {
        // Silently fail if localStorage is unavailable
    }
}

// ============================================
// SECURITY: Honeypot Check
// ============================================

/**
 * Check if honeypot field was filled (indicates bot)
 * @param {string} honeypotValue - Value of the hidden honeypot field
 * @returns {boolean} - True if it's a bot (honeypot was filled)
 */
export function isBot(honeypotValue) {
    return honeypotValue && honeypotValue.trim().length > 0;
}

// ============================================
// Main Waitlist Function
// ============================================

/**
 * Add an email to the waitlist with security checks
 * @param {string} email - The email to add
 * @param {string} honeypot - The honeypot field value
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addToWaitlist(email, honeypot = '') {
    try {
        // SECURITY CHECK 1: Honeypot (bot detection)
        if (isBot(honeypot)) {
            // Silently reject bots - don't give them feedback
            console.warn('Bot detected via honeypot');
            return { success: true }; // Fake success to confuse bots
        }

        // SECURITY CHECK 2: Rate limiting
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            const resetTimeStr = rateCheck.resetTime
                ? `Please try again after ${rateCheck.resetTime.toLocaleTimeString()}.`
                : 'Please try again later.';
            return { success: false, error: `Too many attempts. ${resetTimeStr}` };
        }

        // SECURITY CHECK 3: Email validation
        const validation = validateEmail(email);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Insert new email. The anon role has INSERT only (no SELECT), so a
        // pre-check would always come back empty; rely on the UNIQUE constraint
        // and translate the duplicate error instead.
        const { error } = await supabase
            .from('waitlist')
            .insert([
                {
                    email: email.toLowerCase(),
                    created_at: new Date().toISOString(),
                }
            ]);

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'This email is already on the list!' };
            }
            console.error('Supabase error:', error);
            return { success: false, error: 'Something went wrong. Please try again.' };
        }

        // Record successful submission for rate limiting
        recordSubmission();

        return { success: true };
    } catch (err) {
        console.error('Waitlist error:', err);
        return { success: false, error: 'Connection error. Please try again.' };
    }
}
