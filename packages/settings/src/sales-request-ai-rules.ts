import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";

export const salesRequestAIRuleSchema = z.object({
	id: z.string().trim().min(1).max(100),
	title: z.string().trim().min(1).max(100),
	instruction: z.string().trim().min(1).max(1000),
	enabled: z.boolean(),
});
const rulesSchema = z
	.array(salesRequestAIRuleSchema)
	.max(30)
	.superRefine((rules, ctx) => {
		if (new Set(rules.map((rule) => rule.id)).size !== rules.length)
			ctx.addIssue({ code: "custom", message: "Rule IDs must be unique" });
		if (
			rules.reduce(
				(total, rule) => total + rule.title.length + rule.instruction.length,
				0,
			) > 12000
		)
			ctx.addIssue({
				code: "custom",
				message: "Rules must total at most 12,000 characters",
			});
	});
export const salesRequestAIRulesInputSchema = z.object({
	expectedRevision: z.number().int().nonnegative(),
	rules: rulesSchema,
});
const savedRulesSchema = z.object({
	revision: z.number().int().nonnegative(),
	rules: rulesSchema,
	changedAt: z.string().nullable(),
	changedBy: z.number().int().nullable(),
});
export type SalesRequestAIRule = z.infer<typeof salesRequestAIRuleSchema>;
export type SalesRequestAIRulesInput = z.infer<
	typeof salesRequestAIRulesInputSchema
>;

function record(value: unknown): Record<string, unknown> {
	if (typeof value === "string") return record(JSON.parse(value));
	if (value == null) return {};
	if (typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid sales settings metadata");
	return value as Record<string, unknown>;
}
function readRules(meta: unknown) {
	const value = record(record(meta).requestGeneration).aiRules;
	return value == null
		? {
				revision: 0,
				rules: [] as SalesRequestAIRule[],
				changedAt: null,
				changedBy: null,
			}
		: savedRulesSchema.parse(value);
}
function requireSettingId(settingId: number) {
	if (!Number.isSafeInteger(settingId) || settingId <= 0)
		throw new Error("A valid sales settings ID is required");
}
export async function getSalesRequestAIRules(
	db: Pick<Db, "settings">,
	settingId: number,
) {
	requireSettingId(settingId);
	const row = await db.settings.findFirst({
		where: { id: settingId, type: "sales-settings", deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!row || row.id !== settingId) throw new Error("Sales settings not found");
	return { settingId, ...readRules(row.meta) };
}
export async function updateSalesRequestAIRules(
	db: Db,
	input: SalesRequestAIRulesInput & { settingId: number; changedBy: number },
) {
	requireSettingId(input.settingId);
	const parsed = salesRequestAIRulesInputSchema.parse(input);
	return db.$transaction(
		async (tx) => {
			const rows = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings WHERE id=${input.settingId} AND type='sales-settings' AND deletedAt IS NULL FOR UPDATE`,
			);
			if (!rows.some((row) => row.id === input.settingId))
				throw new Error("Sales settings not found");
			const row = await tx.settings.findFirst({
				where: { id: input.settingId, type: "sales-settings", deletedAt: null },
				select: { meta: true },
			});
			if (!row) throw new Error("Sales settings not found");
			const meta = record(row.meta);
			const current = readRules(meta);
			if (current.revision !== parsed.expectedRevision)
				throw new Error(
					"Sales request rules changed. Reload settings before saving.",
				);
			const next = {
				revision: current.revision + 1,
				rules: parsed.rules,
				changedAt: new Date().toISOString(),
				changedBy: input.changedBy,
			};
			await tx.settings.update({
				where: { id: input.settingId },
				data: {
					meta: {
						...meta,
						requestGeneration: {
							...record(meta.requestGeneration),
							aiRules: next,
						},
					},
				},
			});
			return { settingId: input.settingId, ...next };
		},
		{ isolationLevel: "Serializable", timeout: 60_000 },
	);
}
