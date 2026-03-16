import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../convex/_generated/api';

/**
 * Calls the Convex `ensureProfile` mutation exactly once when the user first
 * becomes fully authenticated. Uses `useMutation` (not the raw convex client)
 * so that the Clerk JWT is already attached before the call is made, and guards
 * on `isLoaded && isSignedIn` to eliminate the unauthenticated-call race.
 */
export function useEnsureProfile(
    userId: string | null | undefined,
    email?: string | null,
    fullName?: string | null,
    username?: string | null,
    timezone?: string | null,
) {
    const { isLoaded, isSignedIn } = useAuth();
    const ensureProfile = useMutation(api.users.ensureProfile);
    const lastEnsuredRef = useRef<string>('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !userId) return;

        // Create a signature of the data we're ensuring.
        // If the signature changes, we re-fire; background handles the patch.
        const dataSignature = `${userId}|${email || ''}|${fullName || ''}|${username || ''}|${timezone || ''}`;

        // Skip if already ensured this specific data, UNLESS we are explicitly retrying.
        if (lastEnsuredRef.current === dataSignature && retryCount === 0) return;

        const attemptEnsure = async () => {
            console.log(`[useEnsureProfile] Attempting (retry: ${retryCount}) for:`, userId);
            try {
                const result = await ensureProfile({
                    userId: userId ?? undefined,
                    email: email ?? undefined,
                    full_name: fullName ?? undefined,
                    username: username ?? undefined,
                    timezone: timezone ?? undefined,
                });

                lastEnsuredRef.current = dataSignature;
                setRetryCount(0); // Reset on success
                console.log('[useEnsureProfile] SUCCESS: Profile ensured.', result);
            } catch (err: any) {
                console.warn('[useEnsureProfile] FAILED to ensure profile:', err.message);
                
                // If it's an unauthenticated error, it's likely a race condition with Clerk token.
                // We'll retry with an exponential-ish backoff or just a steady delay.
                if (retryCount < 5) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                    console.log(`[useEnsureProfile] Will retry in ${delay}ms...`);
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, delay);
                } else {
                    console.error('[useEnsureProfile] Max retries reached.');
                    // Don't reset lastEnsuredRef so we don't loop infinitely on a real error,
                    // but allow signature changes to trigger a fresh attempt.
                }
            }
        };

        attemptEnsure();
    }, [isLoaded, isSignedIn, userId, email, fullName, username, timezone, ensureProfile, retryCount]);
}
