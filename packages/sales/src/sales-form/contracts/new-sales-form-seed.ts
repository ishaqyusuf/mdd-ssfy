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

export const newSalesFormSeedHandedDoorSchema = z
	.object({
		dimension: z.string().trim().min(1).max(128),
		swing: z.string().max(128).optional(),
		lhQty: z.number().int().min(0).max(100000),
		rhQty: z.number().int().min(0).max(100000),
	})
	.strict()
	.refine((door) => door.lhQty + door.rhQty > 0, {
		message: "A door row must contain at least one handed unit",
	});

export const newSalesFormSeedUnhandedDoorSchema = z
	.object({
		dimension: z.string().trim().min(1).max(128),
		totalQty: z.number().int().positive().max(100000),
	})
	.strict();

export const newSalesFormSeedDoorSchema = z.union([
	newSalesFormSeedHandedDoorSchema,
	newSalesFormSeedUnhandedDoorSchema,
]);

export function newSalesFormSeedDoorQty(
	door: z.infer<typeof newSalesFormSeedDoorSchema>,
) {
	return "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty;
}

export const newSalesFormSeedServiceRowSchema = z
	.object({
		/** Transient client identity, never a persisted sales-item ID. */
		uid: z.string().trim().min(1).max(128),
		service: z.string().trim().min(1).max(256),
		qty: z.number().positive().max(100000),
	})
	.strict();

export const newSalesFormSeedMouldingCalculationSchema = z
	.object({
		linearFeet: z.number().positive().max(10000000),
		pieceLength: z.number().positive().max(1000),
		wastePercentage: z.number().min(0).max(100).optional(),
	})
	.strict();

export const newSalesFormSeedMouldingPieceRowSchema = z
	.object({
		/** Existing Moulding component UID; this becomes the native row UID. */
		uid: z.string().trim().min(1).max(128),
		qty: z.number().int().min(0).max(100000),
		/** Retained calculator facts after normalization computes the piece count. */
		calculation: newSalesFormSeedMouldingCalculationSchema.optional(),
	})
	.strict();

export const newSalesFormSeedMouldingLinearFeetRowSchema = z
	.object({
		/** Existing Moulding component UID; this becomes the native row UID. */
		uid: z.string().trim().min(1).max(128),
		calculation: newSalesFormSeedMouldingCalculationSchema,
	})
	.strict();

export const newSalesFormSeedMouldingRowSchema = z.union([
	newSalesFormSeedMouldingPieceRowSchema,
	newSalesFormSeedMouldingLinearFeetRowSchema,
]);

const newSalesFormSeedLineMetaSchema = z
	.object({
		serviceRows: z
			.array(newSalesFormSeedServiceRowSchema)
			.min(1)
			.max(1000)
			.optional(),
		mouldingRows: z
			.array(newSalesFormSeedMouldingRowSchema)
			.min(1)
			.max(1000)
			.optional(),
	})
	.strict()
	.refine(
		(meta) => Boolean(meta.serviceRows?.length || meta.mouldingRows?.length),
		{
			message: "Line metadata requires service or moulding rows",
		},
	);

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
		qty: z.number().min(0).max(100000),
		formSteps: z.array(newSalesFormSeedStepSchema).max(100),
		meta: newSalesFormSeedLineMetaSchema.optional(),
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
			const pendingMouldingRows = "meta" in line
				? line.meta?.mouldingRows?.filter((row) => "qty" in row && row.qty === 0) || []
				: [];
			const hasQuantityReview = seed.unresolved.some((entry) =>
				entry.lineUid === line.uid && entry.stepId === null && entry.field === "quantity",
			);
			if ((line.qty === 0 && pendingMouldingRows.length === 0) ||
				(pendingMouldingRows.length > 0 && !hasQuantityReview)) {
				context.addIssue({
					code: "custom",
					message: "Zero quantities require selected moulding rows and an explicit quantity review",
					path: ["lineItems", lineIndex, "qty"],
				});
			}

			if (line.housePackageTool) {
				const doorQty = line.housePackageTool.doors.reduce(
					(total, door) => total + newSalesFormSeedDoorQty(door),
					0,
				);
				if (line.qty !== doorQty) {
					context.addIssue({
						code: "custom",
						message: "Line quantity must equal its HPT door quantity",
						path: ["lineItems", lineIndex, "qty"],
					});
				}
			}
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
				for (const [rowIndex, row] of (line.meta.serviceRows ?? []).entries()) {
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

				const mouldingUids = new Set<string>();
				for (const [rowIndex, row] of (
					line.meta.mouldingRows ?? []
				).entries()) {
					if (mouldingUids.has(row.uid)) {
						context.addIssue({
							code: "custom",
							message: "Duplicate moulding-row UID",
							path: [
								"lineItems",
								lineIndex,
								"meta",
								"mouldingRows",
								rowIndex,
								"uid",
							],
						});
					}
					mouldingUids.add(row.uid);
				}
				if (line.meta.serviceRows?.length && line.meta.mouldingRows?.length) {
					context.addIssue({
						code: "custom",
						message: "A line cannot contain both service and moulding rows",
						path: ["lineItems", lineIndex, "meta"],
					});
				}
				if (line.housePackageTool && line.meta.mouldingRows?.length) {
					context.addIssue({
						code: "custom",
						message: "A moulding row line cannot also contain HPT door rows",
						path: ["lineItems", lineIndex, "meta", "mouldingRows"],
					});
				}
				if (
					line.meta.mouldingRows?.length &&
					line.meta.mouldingRows.every((row) => "qty" in row)
				) {
					const mouldingQty = line.meta.mouldingRows.reduce(
						(total, row) => total + ("qty" in row ? row.qty : 0),
						0,
					);
					if (line.qty !== mouldingQty) {
						context.addIssue({
							code: "custom",
							message: "Line quantity must equal its moulding-row quantity",
							path: ["lineItems", lineIndex, "qty"],
						});
					}
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
			qty: 14,
			formSteps: [
				{ stepId: 10, prodUid: "door-slabs-only" },
				{ stepId: 15, prodUid: "height-6-8" },
				{
					stepId: 20,
					meta: { selectedProdUids: ["smooth-solid-core"] },
				},
			],
			housePackageTool: {
				doors: [
					{ dimension: "2-4 x 6-8", totalQty: 1 },
					{ dimension: "2-10 x 6-8", totalQty: 11 },
					{ dimension: "3-0 x 6-8", totalQty: 2 },
				],
			},
		},
	],
	unresolved: [],
} satisfies NewSalesFormSeed;

export const NEW_SALES_FORM_MOULDING_SEED_EXAMPLE = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "moulding-line-1",
			qty: 52,
			formSteps: [
				{ stepId: 10, prodUid: "mouldings" },
				{
					stepId: 215,
					meta: {
						selectedProdUids: ["baseboard-profile-16", "casing-profile-17"],
					},
				},
			],
			meta: {
				mouldingRows: [
					{
						uid: "baseboard-profile-16",
						calculation: {
							linearFeet: 400,
							pieceLength: 16,
							wastePercentage: 10,
						},
					},
					{ uid: "casing-profile-17", qty: 24 },
				],
			},
		},
	],
	unresolved: [],
} satisfies NewSalesFormSeed;
