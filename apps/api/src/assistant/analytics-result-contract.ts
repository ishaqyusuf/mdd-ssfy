import { z } from "zod";

import { assistantAnalyticsCatalog } from "./analytics-contract";

export const ASSISTANT_ANALYTICS_RESULT_VERSION =
	"assistant-analytics-result-v1" as const;

const assistantAnalyticsMetricIdSchema = z.enum(
	assistantAnalyticsCatalog.metrics.map(({ id }) => id) as [
		(typeof assistantAnalyticsCatalog.metrics)[number]["id"],
		...(typeof assistantAnalyticsCatalog.metrics)[number]["id"][],
	],
);

function isSafeAssistantDrilldown(href: string) {
	return [...href].every((character) => {
		const code = character.charCodeAt(0);
		return character !== "\\" && code >= 32 && code !== 127;
	});
}

const assistantAnalyticsRowSchema = z
	.object({
		label: z.string().trim().min(1).max(160),
		value: z.number().finite(),
		secondaryLabel: z.string().trim().min(1).max(160).optional(),
		drilldown: z
			.object({
				label: z.string().trim().min(1).max(80),
				href: z
					.string()
					.trim()
					.max(500)
					.regex(/^\/(?!\/)/)
					.refine(isSafeAssistantDrilldown),
			})
			.strict()
			.optional(),
	})
	.strict();

export const assistantAnalyticsResultSchema = z
	.object({
		version: z.literal(ASSISTANT_ANALYTICS_RESULT_VERSION),
		metric: assistantAnalyticsMetricIdSchema,
		title: z.string().trim().min(1).max(160),
		definition: z.string().trim().min(1).max(500),
		presentation: z.enum(["kpi", "table", "bar", "line", "area"]),
		rows: z.array(assistantAnalyticsRowSchema).max(100),
		dateRange: z
			.object({
				from: z.iso.date(),
				to: z.iso.date(),
				timezone: z.string().trim().min(1).max(80),
			})
			.strict(),
		unit: z.enum(["count", "currency", "quantity", "percent"]),
		currency: z.enum(["USD"]).nullable(),
		freshness: z
			.object({
				observedAt: z.iso.datetime(),
				label: z.string().trim().min(1).max(80),
			})
			.strict(),
		sources: z
			.array(
				z
					.object({
						id: z.string().trim().min(1).max(300),
						label: z.string().trim().min(1).max(160),
					})
					.strict(),
			)
			.min(1)
			.max(8),
	})
	.strict()
	.superRefine((result, context) => {
		const metric = assistantAnalyticsCatalog.metrics.find(
			(candidate) => candidate.id === result.metric,
		);
		if (!metric) return;
		if (
			result.title !== metric.title ||
			result.definition !== metric.definition
		) {
			context.addIssue({
				code: "custom",
				path: ["metric"],
				message:
					"Analytics result metadata does not match the semantic catalog",
			});
		}
		if (result.unit !== metric.unit || result.currency !== metric.currency) {
			context.addIssue({
				code: "custom",
				path: ["unit"],
				message: "Analytics result unit does not match the semantic catalog",
			});
		}
		if (result.presentation === "kpi" && result.rows.length > 1) {
			context.addIssue({
				code: "custom",
				path: ["rows"],
				message: "KPI analytics results may contain at most one row",
			});
		}
	});

export const assistantAnalyticsPartSchema = z
	.object({
		type: z.literal("data-assistant-analytics"),
		id: z.string().trim().min(1).max(200),
		data: assistantAnalyticsResultSchema,
	})
	.strict();

export type AssistantAnalyticsResult = z.infer<
	typeof assistantAnalyticsResultSchema
>;
