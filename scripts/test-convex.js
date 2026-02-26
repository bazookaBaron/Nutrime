const { ConvexHttpClient } = require("convex/browser");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function checkConvexConnection() {
    const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
        console.error("❌ Error: EXPO_PUBLIC_CONVEX_URL is not defined in your .env file.");
        console.info("💡 Tip: Run 'npx convex dev' to initialize Convex and get your deployment URL.");
        return;
    }

    console.log(`🔍 Checking connectivity to Convex at: ${convexUrl}...`);

    try {
        const client = new ConvexHttpClient(convexUrl);

        // We try to call the 'hello:hello' query we just created.
        // Note: This requires the deployment to be live (npx convex dev).
        const result = await client.query("hello:hello");

        console.log("✅ Success! Connected to Convex.");
        console.log(`💬 Server response: "${result}"`);
    } catch (error) {
        if (error.message.includes("Could not find query")) {
            console.warn("⚠️  Connected to Convex, but the query 'hello:hello' was not found.");
            console.info("💡 Tip: Make sure you've run 'npx convex dev' so your functions are deployed.");
        } else {
            console.error("❌ Failed to connect to Convex:");
            console.error(error.message);
        }
    }
}

checkConvexConnection();
