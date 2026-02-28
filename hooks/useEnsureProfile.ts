import { useEffect, useRef } from 'react';
import { useConvex } from 'convex/react';
import { api } from '../convex/_generated/api';

/**
 * Calls the Convex `ensureProfile` mutation exactly once when the user first
 * becomes authenticated. This guarantees that every auth pathway (email/password,
 * Google OAuth, etc.) results in a `profiles` row in Convex.
 *
 * @param userId   - The Clerk user ID (or null/undefined if not signed in)
 * @param email    - Optional email to store on profile creation
 * @param fullName - Optional display name to store on profile creation
 * @param username - Optional username to store on profile creation
 */
export function useEnsureProfile(
    userId: string | null | undefined,
    email?: string | null,
    fullName?: string | null,
    username?: string | null,
) {
    const convex = useConvex();
    const ensuredRef = useRef<string | null>(null);

    useEffect(() => {
        // Only run once per userId (guards against double-firing)
        if (!userId || ensuredRef.current === userId) return;

        ensuredRef.current = userId;

        convex.mutation(api.users.ensureProfile, {
            userId,
            email: email ?? undefined,
            full_name: fullName ?? undefined,
            username: username ?? undefined,
        }).catch((err) => {
            console.error('[useEnsureProfile] Failed to ensure profile:', err);
            // Reset so it retries on next render
            ensuredRef.current = null;
        });
    }, [userId, email, fullName, username, convex]);
}
