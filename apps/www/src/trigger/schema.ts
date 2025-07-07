import { z } from "zod";

export const SendComposedEmailSchema = z.object({
    data: z.any(),
    subject: z.string().optional(),
    from: z.object({
        name: z.string(),
        email: z.string(),
    }),
    to: z.any(),
    preview: z.string(),
});
