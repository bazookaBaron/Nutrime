import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../convex/_generated/api';

/**
 * Calls the Convex `ensureProfile` mutation exactly once when the user first
 * becomes fully authenticated. Uses `useMutation` (not the raw convex client)
 * so that the Clerk JWT is already attached before the call is made, and guards
 * on `isLoaded && isSignedIn` to eliminate the unauthenticated-call race.
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
    const { isLoaded, isSignedIn } = useAuth();
    const ensureProfile = useMutation(api.users.ensureProfile);
    const ensuredRef = useRef<string | null>(null);

    useEffect(() => {
        // Wait until Clerk has fully loaded and confirmed the session is active.
        // This ensures ConvexProviderWithClerk has had a chance to attach the JWT
        // before we fire the mutation — preventing the "Unauthenticated" error.
        if (!isLoaded || !isSignedIn || !userId) return;

        // Only run once per userId (guards against double-firing)
        if (ensuredRef.current === userId) return;

        ensuredRef.current = userId;

        ensureProfile({
            userId,
            email: email ?? undefined,
            full_name: fullName ?? undefined,
            username: username ?? undefined,
        }).catch((err: unknown) => {
            console.error('[useEnsureProfile] Failed to ensure profile:', err);
            // Reset so it retries on next render
            ensuredRef.current = null;
        });
    }, [isLoaded, isSignedIn, userId, email, fullName, username, ensureProfile]);
}
