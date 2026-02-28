// app.config.js - Extends app.json with dynamic configuration
// PostHog keys are loaded from .env at build time
const appJson = require('./app.json');

export default {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  },
};
