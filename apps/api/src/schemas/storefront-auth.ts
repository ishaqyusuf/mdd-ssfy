import { z } from "zod";

const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters.")
	.max(128)
	.regex(/[a-z]/, "Password must contain a lowercase letter.")
	.regex(/[A-Z]/, "Password must contain an uppercase letter.")
	.regex(/[0-9]/, "Password must contain a number.");

export const storefrontSignupSchema = z
	.object({
		name: z.string().trim().max(255).optional().nullable(),
		businessName: z.string().trim().max(255).optional().nullable(),
		email: z.string().trim().toLowerCase().email().max(255),
		phoneNo: z.string().trim().min(7).max(40),
		accountType: z.enum(["individual", "business"]),
		agreeToTerms: z.literal(true, {
			error: "You must agree to the terms.",
		}),
	})
	.superRefine((value, ctx) => {
		if (value.accountType === "individual" && !value.name) {
			ctx.addIssue({
				code: "custom",
				path: ["name"],
				message: "Name is required.",
			});
		}
		if (value.accountType === "business" && !value.businessName) {
			ctx.addIssue({
				code: "custom",
				path: ["businessName"],
				message: "Business name is required.",
			});
		}
	});

export const storefrontVerificationTokenSchema = z.object({
	token: z.string().trim().min(20).max(255),
});

export const storefrontCreatePasswordSchema = storefrontVerificationTokenSchema
	.extend({
		password: passwordSchema,
		confirmPassword: z.string(),
		agreeToTerms: z.literal(true, {
			error: "You must agree to the terms.",
		}),
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match.",
	});

export const storefrontResendVerificationSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(255),
});

export const storefrontRequestPasswordResetSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(255),
});

export const storefrontResetPasswordSchema = z
	.object({
		token: z.string().trim().min(32).max(512),
		password: passwordSchema,
		confirmPassword: z.string(),
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match.",
	});
