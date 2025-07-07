import { z } from "zod";
const usPhoneNumberRegex =
    /^(?:\+1\s?)?\(?([2-9][0-9]{2})\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})$/;
export const registerSchema = z.object({
    name: z.string().min(1),
    businessName: z.string().optional(),
    address: z.string().min(1),
    email: z.string().email().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    phoneNo: z.string().regex(usPhoneNumberRegex, {
        message: "Invalid phone number",
    }),
    // password: z.string().min(1),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
