import { z } from "zod";

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z.object({
    SQUARE_SANDBOX_ACCESS_TOKEN: z.string().optional(),
    TRIGGER_SECRET_KEY: z.string(),
    TRIGGER_PROJECT_ID: z.string(),
    SQUARE_SANDBOX_LOCATION_ID: z.string().optional(),
    SQUARE_SANDBOX_APP_ID: z.string().optional(),
    SQUARE_LOCATION_ID: z.string(),
    SQUARE_APP_ID: z.string(),
    SQUARE_ACCESS_TOKEN: z.string(),
    DATABASE_URL: z.string().url(),
    POSTGRESS_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string(),
    BLESS_TOKEN: z.string(),
    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),
    CLOUDINARY_UPLOAD_URL: z.string(),
    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_ACCOUNT_TOKEN: z.string(),
    NEXT_BACK_DOOR_TOK: z.string(),

    PLACE_API: z.string(),
    TWILIO_PHONE: z.string(),
    EMAIL_FROM_ADDRESS: z.string().email(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
        process.env.NODE_ENV === "production"
            ? z.string().min(1)
            : z.string().min(1).optional(),
    NEXTAUTH_URL: z.preprocess(
        // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
        // Since NextAuth.js automatically uses the VERCEL_URL if present.
        (str) => process.env.VERCEL_URL ?? str,
        // VERCEL_URL doesn't include `https` so it cant be validated as a URL
        process.env.VERCEL ? z.string().min(1) : z.string().url(),
    ),
    // Add `.min(1) on ID and SECRET if you want to make sure they're not empty
    // DISCORD_CLIENT_ID: z.string(),
    // DISCORD_CLIENT_SECRET: z.string(),
});

/**
 * Specify your client-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars. To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
const client = z.object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPER_PASS: z.string(),
    // CLOUDINARY_UPLOAD_URL: z.string(),
    NEXT_PUBLIC_ROOT_DOMAIN: z.string(),
    // CLOUDINARY_API_KEY: z.string(),
    NEXT_PUBLIC_CLOUDINARY_BASE_URL: z.string(),
    NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN: z.string(),
    NEXT_PUBLIC_VERCEL_BLOB_URL: z.string(),
    NEXT_PUBLIC_BACK_DOOR_TOK: z.string(),
    NEXT_PUBLIC_NODE_ENV: z.enum(["development", "test", "production"]),
    // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
 * middlewares) or client-side so we need to destruct manually.
 *
 * @type {Record<keyof z.infer<typeof server> | keyof z.infer<typeof client>, string | undefined>}
 */
const processEnv = {
    // server
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    TRIGGER_PROJECT_ID: process.env.TRIGGER_PROJECT_ID,
    SQUARE_SANDBOX_LOCATION_ID: process.env.SQUARE_SANDBOX_LOCATION_ID,
    SQUARE_SANDBOX_ACCESS_TOKEN: process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
    SQUARE_SANDBOX_APP_ID: process.env.SQUARE_SANDBOX_APP_ID,
    SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
    SQUARE_APP_ID: process.env.SQUARE_APP_ID,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    POSTGRESS_URL: process.env.POSTGRESS_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_BACK_DOOR_TOK: process.env.NEXT_BACK_DOOR_TOK,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    PLACE_API: process.env.PLACE_API,
    BLESS_TOKEN: process.env.BLESS_TOKEN,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    CLOUDINARY_UPLOAD_URL: process.env.CLOUDINARY_UPLOAD_URL,
    TWILIO_ACCOUNT_TOKEN: process.env.TWILIO_ACCOUNT_TOKEN,
    TWILIO_PHONE: process.env.TWILIO_PHONE,
    // client
    NEXT_PUBLIC_SUPER_PASS: process.env.NEXT_PUBLIC_SUPER_PASS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLOUDINARY_BASE_URL:
        process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN:
        process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
    NEXT_PUBLIC_VERCEL_BLOB_URL: process.env.NEXT_PUBLIC_VERCEL_BLOB_URL,
    NEXT_PUBLIC_BACK_DOOR_TOK: process.env.NEXT_PUBLIC_BACK_DOOR_TOK,
    // DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    // DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
};

// Don't touch the part below
// --------------------------

const merged = server.merge(client);

/** @typedef {z.input<typeof merged>} MergedInput */
/** @typedef {z.infer<typeof merged>} MergedOutput */
/** @typedef {z.SafeParseReturnType<MergedInput, MergedOutput>} MergedSafeParseReturn */

let env = /** @type {MergedOutput} */ (process.env);

if (!!process.env.SKIP_ENV_VALIDATION == false) {
    const isServer = typeof window === "undefined";

    const parsed = /** @type {MergedSafeParseReturn} */ (
        isServer
            ? merged.safeParse(processEnv) // on server we can validate all env vars
            : client.safeParse(processEnv)
    ); // on client we can only validate the ones that are exposed

    if (parsed.success === false) {
        console.error(
            "❌ Invalid environment variables:",
            parsed.error.flatten().fieldErrors,
        );
        throw new Error("Invalid environment variables");
    }

    env = new Proxy(parsed.data, {
        get(target, prop) {
            if (typeof prop !== "string") return undefined;
            // Throw a descriptive error if a server-side env var is accessed on the client
            // Otherwise it would just be returning `undefined` and be annoying to debug
            if (!isServer && !prop.startsWith("NEXT_PUBLIC_"))
                throw new Error(
                    process.env.NODE_ENV === "production"
                        ? "❌ Attempted to access a server-side environment variable on the client"
                        : `❌ Attempted to access server-side environment variable '${prop}' on the client`,
                );
            return target[/** @type {keyof typeof target} */ (prop)];
        },
    });
}

export { env };
