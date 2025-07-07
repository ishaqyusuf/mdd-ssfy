import zod, { z } from "zod";

export const emailSchema = z.object({
    subject: z.string().optional(),
    to: z.string().email(),
    from: z
        .string()
        .regex(
            /(?:.*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})(?:>)?/,
            {
                message: "Invalid email",
            }
        ),
    body: z.string(),
    type: z.string(),
});
export const newsletterSchema = z.object({
    email: z.string(),
});
