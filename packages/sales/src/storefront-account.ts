import { z } from "zod";
import { Db } from "./types";

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

export const signupSchema = z
  .object({
    name: z.string().optional().nullable(),
    businessName: z.string().optional().nullable(),
    address: z.string().optional(),
    email: z.string().email(),
    phoneNo: z.string(),
    accountType: z.enum(["individual", "business"]),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // This will show the error message under the confirmPassword field
  });

export type Signup = typeof signupSchema._type;
export async function signup(db: Db, data: Signup) {}
