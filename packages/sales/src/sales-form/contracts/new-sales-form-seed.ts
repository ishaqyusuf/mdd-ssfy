import { z } from "zod";

const lineUid = z.string().trim().min(1).max(128);
const stepId = z.number().int().positive();

export const newSalesFormSeedScalarStepSchema = z
	.object({
		stepId,
		prodUid: z.string().trim().min(1).max(128),
	})
	.strict();

export const newSalesFormSeedMultiStepSchema = z
	.object({
		stepId,
		meta: z
			.object({
				selectedProdUids: z
					.array(z.string().trim().min(1).max(128))
					.min(1)
					.max(100),
			})
			.strict(),
	})
	.strict();

export const newSalesFormSeedCustomStepSchema = z
	.object({
		stepId,
		value: z.string().trim().min(1).max(256),
	})
	.strict();

export const newSalesFormSeedV1StepSchema = z.union([
	newSalesFormSeedScalarStepSchema,
	newSalesFormSeedMultiStepSchema,
]);

export const newSalesFormSeedStepSchema = z.union([
	newSalesFormSeedScalarStepSchema,
	newSalesFormSeedMultiStepSchema,
	newSalesFormSeedCustomStepSchema,
]);

export const newSalesFormSeedDoorSchema = z
	.object({
		dimension: z.string().trim().min(1).max(128),
		swing: z.string().max(128),
		lhQty: z.number().int().min(0).max(100000),
		rhQty: z.number().int().min(0).max(100000),
	})
	.strict()
	.refine((door) => door.lhQty + door.rhQty > 0, {
		message: "A door row must contain at least one handed unit",
	});

export const newSalesFormSeedServiceRowSchema = z
	.object({
		/** Transient client identity, never a persisted sales-item ID. */
		uid: z.string().trim().min(1).max(128),
		service: z.string().trim().min(1).max(256),
		qty: z.number().positive().max(100000),
	})
	.strict();

const housePackageToolSchema = z
	.object({
		doors: z.array(newSalesFormSeedDoorSchema).min(1).max(1000),
	})
	.strict()
	.optional();

export const newSalesFormSeedV1LineSchema = z
	.object({
		/** Transient client identity, never a persisted sales-item ID. */
		uid: lineUid,
		qty: z.number().positive().max(100000),
		formSteps: z.array(newSalesFormSeedV1StepSchema).max(100),
		housePackageTool: housePackageToolSchema,
	})
	.strict();

export const newSalesFormSeedLineSchema = z
	.object({
		/** Transient client identity, never a persisted sales-item ID. */
		uid: lineUid,
		qty: z.number().positive().max(100000),
		formSteps: z.array(newSalesFormSeedStepSchema).max(100),
		meta: z
			.object({
				serviceRows: z.array(newSalesFormSeedServiceRowSchema).min(1).max(1000),
			})
			.strict()
			.optional(),
		housePackageTool: housePackageToolSchema,
	})
	.strict();

export const newSalesFormSeedFormSchema = z
	.object({
		deliveryOption: z.enum(["pickup", "delivery"]),
	})
	.strict();

export const newSalesFormSeedDeliveryCostSchema = z
	.object({
		id: z.null(),
		label: z.literal("Delivery"),
		type: z.literal("Delivery"),
		amount: z.number().finite().min(0).max(100000000),
	})
	.strict();

export const newSalesFormSeedUnresolvedSchema = z
	.object({
		lineUid: lineUid.nullable(),
		stepId: stepId.nullable(),
		field: z.string().trim().min(1).max(128),
		status: z.enum(["ambiguous", "unreadable", "unsupported"]),
		reason: z.string().trim().min(1).max(2000),
	})
	.strict();

export const newSalesFormSeedV1Schema = z
	.object({
		schemaVersion: z.literal(1),
		lineItems: z.array(newSalesFormSeedV1LineSchema).max(100),
		unresolved: z.array(newSalesFormSeedUnresolvedSchema).max(300),
	})
	.strict();

export const newSalesFormSeedV2Schema = z
	.object({
		schemaVersion: z.literal(2),
		lineItems: z.array(newSalesFormSeedLineSchema).max(100),
		form: newSalesFormSeedFormSchema.optional(),
		extraCosts: z.array(newSalesFormSeedDeliveryCostSchema).max(1).optional(),
		unresolved: z.array(newSalesFormSeedUnresolvedSchema).max(300),
	})
	.strict();

export const newSalesFormSeedSchema = z
	.discriminatedUnion("schemaVersion", [
		newSalesFormSeedV1Schema,
		newSalesFormSeedV2Schema,
	])
	.superRefine((seed, context) => {
		if (seed.lineItems.length === 0 && seed.unresolved.length === 0) {
			context.addIssue({
				code: "custom",
				message: "A sales-form seed requires a line or unresolved entry",
			});
		}

		const lineUids = new Set<string>();
		for (const [lineIndex, line] of seed.lineItems.entries()) {
			if (lineUids.has(line.uid)) {
				context.addIssue({
					code: "custom",
					message: "Duplicate line UID",
					path: ["lineItems", lineIndex, "uid"],
				});
			}
			lineUids.add(line.uid);
			const selectedStepIds = new Set<number>();
			for (const [formStepIndex, formStep] of line.formSteps.entries()) {
				if (selectedStepIds.has(formStep.stepId)) {
					context.addIssue({
						code: "custom",
						message: "Duplicate form-step ID",
						path: ["lineItems", lineIndex, "formSteps", formStepIndex],
					});
				}
				selectedStepIds.add(formStep.stepId);
				if ("meta" in formStep) {
					const selectedProdUids = new Set<string>();
					for (const [
						uidIndex,
						uid,
					] of formStep.meta.selectedProdUids.entries()) {
						if (selectedProdUids.has(uid)) {
							context.addIssue({
								code: "custom",
								message: "Duplicate selected product UID",
								path: [
									"lineItems",
									lineIndex,
									"formSteps",
									formStepIndex,
									"meta",
									"selectedProdUids",
									uidIndex,
								],
							});
						}
						selectedProdUids.add(uid);
					}
				}
			}

			if ("meta" in line && line.meta) {
				const serviceUids = new Set<string>();
				for (const [rowIndex, row] of line.meta.serviceRows.entries()) {
					if (serviceUids.has(row.uid)) {
						context.addIssue({
							code: "custom",
							message: "Duplicate service-row UID",
							path: [
								"lineItems",
								lineIndex,
								"meta",
								"serviceRows",
								rowIndex,
								"uid",
							],
						});
					}
					serviceUids.add(row.uid);
				}
			}
		}

		for (const [index, unresolved] of seed.unresolved.entries()) {
			if (unresolved.lineUid === null && unresolved.stepId !== null) {
				context.addIssue({
					code: "custom",
					message: "A globally unresolved entry cannot reference a line step",
					path: ["unresolved", index, "stepId"],
				});
			}
			if (unresolved.lineUid && !lineUids.has(unresolved.lineUid)) {
				context.addIssue({
					code: "custom",
					message: "Unresolved entry references an unknown line UID",
					path: ["unresolved", index, "lineUid"],
				});
			}
			const line = seed.lineItems.find(
				(candidate) => candidate.uid === unresolved.lineUid,
			);
			if (
				line &&
				unresolved.stepId != null &&
				line.formSteps.some((formStep) => formStep.stepId === unresolved.stepId)
			) {
				context.addIssue({
					code: "custom",
					message: "A form step cannot be selected and unresolved",
					path: ["unresolved", index, "stepId"],
				});
			}
		}

		if (
			seed.schemaVersion === 2 &&
			(seed.extraCosts?.length || 0) > 0 &&
			seed.form?.deliveryOption !== "delivery"
		) {
			context.addIssue({
				code: "custom",
				message: "A Delivery cost requires delivery fulfillment",
				path: ["extraCosts"],
			});
		}
	});

export type NewSalesFormSeedV1 = z.infer<typeof newSalesFormSeedV1Schema>;
export type NewSalesFormSeedV2 = z.infer<typeof newSalesFormSeedV2Schema>;
export type NewSalesFormSeed = z.infer<typeof newSalesFormSeedSchema>;

export const NEW_SALES_FORM_SEED_EXAMPLE = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "line-1",
			qty: 1,
			formSteps: [
				{ stepId: 10, prodUid: "exterior" },
				{
					stepId: 20,
					meta: { selectedProdUids: ["smooth-panel"] },
				},
			],
			housePackageTool: {
				doors: [
					{
						dimension: "3-0 x 6-8",
						swing: "inswing",
						lhQty: 1,
						rhQty: 0,
					},
				],
			},
		},
	],
	unresolved: [],
} satisfies NewSalesFormSeed;
