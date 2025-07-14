import { z } from "zod";

export const getCheckoutSchema = z.object({});

export type GetCheckoutSchema = z.infer<typeof getCheckoutSchema>;
