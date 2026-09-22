import { createHash } from "node:crypto";
import {
	bootstrapNewSalesForm,
	recalculateNewSalesForm,
	resolveNewSalesCustomer,
	saveDraftNewSalesForm,
} from "@api/db/queries/new-sales-form";
import { getSalesFormCatalog } from "@api/db/queries/new-sales-form-catalog";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form-routing";
import { saveDraftNewSalesFormSchema } from "@api/schemas/new-sales-form";
import type { TRPCContext } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import {
	getDefaultSalesFormCustomerProfile,
	initializeNewSalesFormSeed,
	normalizeSalesFormPaymentTerm,
	normalizeSalesFormTaxOptions,
	resolveSalesFormTaxRateByCode,
	resolveSalesFormProfilePaymentTerm,
	toSalesFormSaveDraftPayload,
	validateSalesFormBeforeSave,
	type WorkflowComponentRecord,
} from "@gnd/sales/sales-form-core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AssistantActor } from "./actor";
import { getAssistantSalesDraftHandoff } from "./sales-draft-handoff";

export const prepareAssistantSalesDraftSchema = z
	.object({
		conversationId: z.string().trim().min(1).max(191),
		generationId: z.string().uuid(),
		customerId: z.number().int().positive(),
	})
	.strict();

export const saveAssistantSalesDraftSchema =
	prepareAssistantSalesDraftSchema.extend({
		revision: z.string().regex(/^[a-f0-9]{64}$/),
	});

const defaultDependencies = {
	getAssistantSalesDraftHandoff,
	bootstrapNewSalesForm,
	resolveNewSalesCustomer,
	getNewSalesFormStepRouting,
	getSalesFormCatalog,
	recalculateNewSalesForm,
	saveDraftNewSalesForm,
	requireAnyOperationalPermission,
};

type Input = z.infer<typeof prepareAssistantSalesDraftSchema>;
type Dependencies = typeof defaultDependencies;

function stableValue(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(stableValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entry]) => [key, stableValue(entry)]),
	);
}

function rowDetails(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((row) => {
		if (!row || typeof row !== "object") return [];
		const title = String(row.title || row.service || row.description || "Item");
		return [`${title} · Qty ${Number(row.qty || 0)}`];
	});
}

async function requireSaveAccess(
	ctx: TRPCContext,
	actor: AssistantActor,
	deps: Dependencies,
) {
	if (ctx.userId !== actor.userId || !actor.grants.editOrders) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to save sales orders or quotes.",
		});
	}
	await deps.requireAnyOperationalPermission(
		ctx,
		["editOrders"],
		"You do not have permission to save sales orders or quotes.",
	);
}

async function buildReviewedDraft(
	ctx: TRPCContext,
	actor: AssistantActor,
	input: Input,
	deps: Dependencies,
) {
	const handoff = await deps.getAssistantSalesDraftHandoff(
		ctx.db,
		actor,
		input,
	);
	if (handoff.savedSale)
		return { savedSale: handoff.savedSale, review: null, payload: null };
	const preview = handoff.preview;
	if (!preview.seed.lineItems.length) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"This request has no selected items. Open the sales form to finish the draft.",
		});
	}
	const [base, customer, routeData, session, taxes, profiles] =
		await Promise.all([
			deps.bootstrapNewSalesForm(ctx, {
				type: preview.type,
				customerId: input.customerId,
			}),
			deps.resolveNewSalesCustomer(ctx, { customerId: input.customerId }),
			deps.getNewSalesFormStepRouting(ctx, {}),
			ctx.db.assistantSalesRequestSession.findFirst({
				where: {
					conversationId: input.conversationId,
					generationId: input.generationId,
					ownerUserId: actor.userId,
					scopeType: actor.scopeType,
					scopeId: actor.scopeId,
					status: "ready",
				},
				select: { completedAt: true },
			}),
			ctx.db.taxes.findMany({
				select: { taxCode: true, title: true, percentage: true },
			}),
			ctx.db.customerTypes.findMany({
				select: { id: true, title: true, coefficient: true, meta: true },
			}),
		]);
	if (!session?.completedAt)
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "This Assistant draft is no longer available.",
		});
	const profileRecords = profiles.map(({ meta, ...profile }) => ({
		...profile,
		meta:
			meta && typeof meta === "object" && !Array.isArray(meta) ? meta : null,
	}));
	const profileId =
		customer.profileId ??
		base.form.customerProfileId ??
		getDefaultSalesFormCustomerProfile(profileRecords)?.id ??
		null;
	const profile = profileRecords.find(
		(candidate) => candidate.id === profileId,
	);
	const profileCoefficient = Number(profile?.coefficient ?? 1);
	if (
		(profileId && !profile) ||
		!Number.isFinite(profileCoefficient) ||
		profileCoefficient <= 0
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"The customer's pricing profile is unavailable. Open the sales form to review it.",
		});
	}
	const taxCode = customer.taxCode || null;
	const taxRate = resolveSalesFormTaxRateByCode(
		normalizeSalesFormTaxOptions(taxes),
		taxCode,
	);
	const catalogs = new Map<number, Promise<WorkflowComponentRecord[]>>();
	const initialized = await initializeNewSalesFormSeed({
		seed: preview.seed,
		baseRecord: {
			...base,
			// Generation consumption owns deduplication; avoid the native editable-draft key.
			version: `assistant-${input.generationId}`,
			form: {
				...base.form,
				customerId: input.customerId,
				customerProfileId: profileId,
				billingAddressId: customer.billing.id ?? null,
				shippingAddressId: customer.shipping.id ?? null,
				paymentTerm: normalizeSalesFormPaymentTerm(
					customer.netTerm,
					resolveSalesFormProfilePaymentTerm(
						profile?.meta,
						base.form.paymentTerm,
					),
				),
				taxCode,
				createdAt: session.completedAt.toISOString(),
			},
			summary: { ...base.summary, taxRate },
		},
		routeData,
		pricing: { profileCoefficient },
		resolveComponents: ({ step }) => {
			const stepId = Number(step.id);
			let loading = catalogs.get(stepId);
			if (!loading) {
				loading = deps
					.getSalesFormCatalog(ctx, { stepId, fresh: true })
					.then((catalog) => catalog.components as WorkflowComponentRecord[]);
				catalogs.set(stepId, loading);
			}
			return loading;
		},
	});
	if (initialized.issues.length) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Some selected items need review in the sales form before saving.",
		});
	}
	const record = initialized.record;
	const validation = validateSalesFormBeforeSave(record);
	if (!validation.valid)
		throw new TRPCError({ code: "BAD_REQUEST", message: validation.message! });
	const reviewNotes = initialized.unresolved.map(({ lineUid, reason }) => ({
		lineUid,
		reason,
	}));
	if ((preview.sourceText?.length ?? 0) > 20_000)
		reviewNotes.push({
			lineUid: null,
			reason:
				"Only the first 20,000 characters are shown in the Sales form. Refer to the original request in this Assistant chat for the full text.",
		});
	const notes = reviewNotes.map((item) => item.reason);
	const nativePayload = toSalesFormSaveDraftPayload(record, false);
	const payload = saveDraftNewSalesFormSchema.parse({
		...nativePayload,
		clientRequestId: `assistant-${input.generationId}`,
		assistantHandoff: {
			conversationId: input.conversationId,
			generationId: input.generationId,
		},
		meta: {
			...nativePayload.meta,
			customerRequestText: preview.sourceText?.slice(0, 20_000),
			customerRequestReview: reviewNotes,
		},
	});
	payload.summary = await deps.recalculateNewSalesForm(ctx, {
		taxRate,
		paymentMethod: payload.meta.paymentMethod,
		lineItems: payload.lineItems,
		extraCosts: payload.extraCosts,
	});
	const revision = createHash("sha256")
		.update(JSON.stringify(stableValue(payload)))
		.digest("hex");
	return {
		savedSale: null,
		payload,
		review: {
			revision,
			type: preview.type,
			customer: {
				id: input.customerId,
				name:
					base.customer?.businessName?.trim() ||
					base.customer?.name?.trim() ||
					`Customer ${input.customerId}`,
			},
			lineItems: payload.lineItems.map((line) => ({
				uid: line.uid,
				title: line.title,
				quantity: line.housePackageTool?.totalDoors ?? line.qty,
				total: line.lineTotal,
				details: [
					...rowDetails(line.meta?.mouldingRows),
					...rowDetails(line.meta?.serviceRows),
					...(line.formSteps ?? []).map((step) =>
						[step.step?.title, step.value].filter(Boolean).join(": "),
					),
					...(line.housePackageTool?.doors ?? []).map((door) =>
						[
							door.dimension,
							door.swing,
							`Qty ${door.totalQty ?? (door.lhQty ?? 0) + (door.rhQty ?? 0)}`,
						]
							.filter(Boolean)
							.join(" · "),
					),
				].filter(Boolean),
			})),
			subtotal: payload.summary.subTotal,
			taxTotal: payload.summary.taxTotal,
			extraCosts: [
				{ label: "Labor", amount: payload.summary.labor ?? 0 },
				{ label: "Delivery", amount: payload.summary.delivery ?? 0 },
				{ label: "Other costs", amount: payload.summary.otherCosts ?? 0 },
				{
					label: "Discount",
					amount:
						-(payload.summary.discount ?? 0) -
						(payload.summary.percentDiscountValue ?? 0),
				},
			].filter((cost) => cost.amount !== 0),
			cardFee: payload.summary.ccc ?? 0,
			total: payload.summary.totalWithCcc ?? payload.summary.grandTotal,
			notes,
		},
	};
}

export async function prepareAssistantSalesDraft(
	ctx: TRPCContext,
	actor: AssistantActor,
	input: Input,
	deps = defaultDependencies,
) {
	await requireSaveAccess(ctx, actor, deps);
	const { payload: _payload, ...result } = await buildReviewedDraft(
		ctx,
		actor,
		input,
		deps,
	);
	return result;
}

export async function saveAssistantSalesDraft(
	ctx: TRPCContext,
	actor: AssistantActor,
	input: z.infer<typeof saveAssistantSalesDraftSchema>,
	deps = defaultDependencies,
) {
	await requireSaveAccess(ctx, actor, deps);
	const prepared = await buildReviewedDraft(ctx, actor, input, deps);
	if (prepared.savedSale) return { savedSale: prepared.savedSale };
	if (prepared.review.revision !== input.revision) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"The customer, items or prices changed. Review the draft again before saving.",
		});
	}
	try {
		const saved = await deps.saveDraftNewSalesForm(ctx, prepared.payload);
		return { savedSale: { orderId: saved.orderId!, slug: saved.slug! } };
	} catch (error) {
		// A simultaneous save (including the native editor) may have consumed this generation.
		if (error instanceof TRPCError && error.code === "CONFLICT") {
			const current = await deps.getAssistantSalesDraftHandoff(
				ctx.db,
				actor,
				input,
			);
			if (current.savedSale) return { savedSale: current.savedSale };
		}
		throw error;
	}
}
