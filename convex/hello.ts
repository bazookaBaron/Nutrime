import { query } from "./_generated/server";

export const hello = query({
    args: {},
    handler: async (ctx) => {
        return "Convex is connected and responding correctly! 🚀";
    },
});
