import type { CreateEmailOptions } from "resend";
import { z } from "zod";
import type { CreateActivityInput } from "./schemas";
import { ContactRole } from "@gnd/db";

export interface TeamContext {
  id: string;
  name: string;
  inboxId: string;
}

export interface NotificationHandler<T = any> {
  schema: z.ZodSchema<T>;
  email?: {
    template: string;
    subject: string;
    from?: string;
    replyTo?: string;
  };
  createActivity: (
    data: T,
    author: UserData,
    user: UserData,
  ) => CreateActivityInput;
  createEmail?: (
    data: T,
    author: UserData,
    user: UserData,
    args?: any,
  ) => Partial<CreateEmailOptions> & {
    data: Record<string, any>;
    template?: string;
  };
  createWhatsApp?: (
    data: T,
    author: UserData,
    user: UserData,
  ) => {
    message: string;
  };
}

export interface UserData {
  id: number;
  profileId: number;
  name: string;
  email?: string;
  phoneNo?: string;
  role?: "employee" | "customer";
  emailNotification?: boolean;
  inAppNotification?: boolean;
  whatsAppNotification?: boolean;
}

// Combine template data with all Resend options using intersection type
export type EmailInput = {
  template?: string;
  user: UserData;
  data: Record<string, any>;
} & Partial<CreateEmailOptions>;

// Use intersection type to combine our options with Resend's CreateEmailOptions
export type NotificationOptions = {
  author: {
    id: number;
    role?: ContactRole;
  };
  recipients?: {
    ids: number[];
    role?: ContactRole;
  }[];
  // priority?: number;
  // sendEmail?: boolean;
  // userIds?: number[];
  // userIdType?: ContactRole;
  // authorIdType?: ContactRole;
  // authorId?: number; // Optional authorId for activity creation, can be used in email generation as well
  // authorContact?: UserData; // Optional author object, can be used directly if available to avoid extra DB fetch
  // contacts?: UserData[]; // Optional contacts array, can be used directly if available to avoid extra DB fetch
};
// & Partial<CreateEmailOptions>;

export interface NotificationResult {
  type: string;
  activities: number;
  emails: {
    sent: number;
    skipped: number;
    failed?: number;
  };
  whatsapp?: {
    sent: number;
    skipped: number;
    failed?: number;
  };
}

// Common schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  locale: z.string().optional(),
  avatar_url: z.string().optional(),
  team_id: z.string().uuid(),
  role: z.enum(["owner", "member"]).optional(),
});

export const transactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  amount: z.number(),
  currency: z.string(),
  due_date: z.string(),
  status: z.string(),
});
