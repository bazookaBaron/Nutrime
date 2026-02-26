import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
    console.warn("EXPO_PUBLIC_CONVEX_URL is not defined. Run 'npx convex dev' to set it up.");
}

export const convex = new ConvexReactClient(convexUrl);
