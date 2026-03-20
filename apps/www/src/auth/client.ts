import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    basePath: "/api/better-auth",
    plugins: [magicLinkClient()],
});
