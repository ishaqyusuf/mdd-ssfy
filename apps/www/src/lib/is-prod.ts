// "use server";

import { env } from "@/env.mjs";

export const isProdClient = env.NEXT_PUBLIC_NODE_ENV === "production";
