import { z } from "zod";

export const nativeEventPropertySchema = z.union([
	z.string().max(256),
	z.number().finite(),
	z.boolean(),
	z.null(),
]);

export const nativeAnalyticsEventSchema = z.object({
	eventId: z.string().uuid(),
	project: z
		.string()
		.min(2)
		.max(64)
		.regex(/^[a-z0-9-]+$/),
	name: z
		.string()
		.min(1)
		.max(80)
		.regex(/^[a-z][a-z0-9_.]*$/),
	version: z.number().int().min(1).max(99).default(1),
	source: z.literal("mobile"),
	platform: z.enum(["ios", "android"]),
	appVersion: z.string().min(1).max(64).optional(),
	appBuild: z.string().min(1).max(64).optional(),
	occurredAt: z.string().datetime(),
	visitorId: z.string().min(8).max(128),
	visitKind: z.enum(["new", "returning"]).optional(),
	route: z.string().max(256).optional(),
	properties: z
		.record(z.string(), nativeEventPropertySchema)
		.refine(
			(properties) => Object.keys(properties).length <= 20,
			"Events may contain at most 20 properties",
		),
});

export const nativeAnalyticsBatchSchema = z.object({
	sentAt: z.string().datetime(),
	sdk: z.object({
		name: z.literal("@ishaqyusuf/logly-core"),
		version: z.string(),
	}),
	events: z.array(nativeAnalyticsEventSchema).min(1).max(25),
});

export type NativeEventProperty = z.infer<typeof nativeEventPropertySchema>;
export type NativeAnalyticsEvent = z.infer<typeof nativeAnalyticsEventSchema>;
export type NativeAnalyticsBatch = z.infer<typeof nativeAnalyticsBatchSchema>;

export function sanitizeNativeProperties(input: Record<string, unknown> = {}) {
	return Object.fromEntries(
		Object.entries(input)
			.slice(0, 20)
			.flatMap(([key, rawValue]) => {
				const value =
					typeof rawValue === "string" ? rawValue.slice(0, 256) : rawValue;
				const parsed = nativeEventPropertySchema.safeParse(value);
				return parsed.success ? [[key.slice(0, 64), parsed.data]] : [];
			}),
	);
}
