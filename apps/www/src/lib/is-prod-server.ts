// "use server";

import { env } from "@/env.mjs";

export const __isProd = env.NODE_ENV == "production";
