
// This file is required by Expo Router to handle deep links that open the app
// from an external browser — specifically after Clerk's OAuth flows (e.g. Google).
// Without this, the OAuth redirect returns a deep link that Expo Router cannot
// match, resulting in the "unmatched route" error screen.
export function redirectSystemPath({
    path,
    initial,
}: {
    path: string;
    initial: boolean;
}): string {
    // After OAuth: Clerk redirects to e.g. nutrienttracker://
    // We redirect to the root so RootLayoutNav can handle routing reactively.
    try {
        // If this is an OAuth callback (contains oauth_callback or sso-callback)
        // just send to root and let _layout.tsx handle the auth state change.
        if (
            path.includes('oauth_callback') ||
            path.includes('sso-callback') ||
            path.includes('oauth-native-callback') ||
            path === '/' ||
            path === ''
        ) {
            return '/';
        }
    } catch { }

    return path;
}
