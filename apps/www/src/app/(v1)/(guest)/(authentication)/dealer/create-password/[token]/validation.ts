import { z } from "zod";
const usPhoneNumberRegex =
    /^(?:\+1\s?)?\(?([2-9][0-9]{2})\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})$/;

const passwordSchema = z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, {
        message: "Password must contain at least one number",
    });
export const createDealerPasswordSchema = z
    .object({
        token: z.string().min(1),
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"], // This will show the error message under the confirmPassword field
    });

export type CreateDealerPasswordSchema = z.infer<
    typeof createDealerPasswordSchema
>;
// pworD1234$
