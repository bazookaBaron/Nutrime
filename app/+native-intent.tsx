
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
    try {
        if (
            path === '/' ||
            path === ''
        ) {
            return '/';
        }
    } catch { }

    return path;
}
