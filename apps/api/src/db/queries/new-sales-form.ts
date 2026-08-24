import { getSalesCustomer } from "@api/db/queries/customer";
import {
	type BootstrapNewSalesFormSchema,
	type DeleteNewSalesFormLineItemSchema,
	type DeleteNewSalesFormShelfProductSchema,
	type GetNewSalesFormHistorySnapshotSchema,
	type GetNewSalesFormSchema,
	type GetNewSalesFormShelfCategoriesSchema,
	type GetNewSalesFormShelfProductDetailsSchema,
	type GetNewSalesFormShelfProductIndexSchema,
	type GetNewSalesFormShelfProductsSchema,
	type GetNewSalesFormStepRoutingSchema,
	type NewSalesFormExtraCost,
	type NewSalesFormLineItem,
	type NewSalesFormMeta,
	type NewSalesFormSummary,
	type RecalculateNewSalesFormSchema,
	type ResolveNewSalesCustomerSchema,
	type SaveDraftNewSalesFormSchema,
	type SaveFinalNewSalesFormSchema,
	type SearchNewSalesCustomersSchema,
	type SearchNewSalesFormServiceSuggestionsSchema,
	type SearchNewSalesFormShelfProductsSchema,
	type UpdateNewSalesFormShelfProductSchema,
	bootstrapNewSalesFormSchema,
	deleteNewSalesFormLineItemSchema,
	deleteNewSalesFormShelfProductSchema,
	getNewSalesFormHistorySnapshotSchema,
	getNewSalesFormSchema,
	getNewSalesFormShelfCategoriesSchema,
	getNewSalesFormShelfProductDetailsSchema,
	getNewSalesFormShelfProductIndexSchema,
	getNewSalesFormShelfProductsSchema,
	getNewSalesFormStepRoutingSchema,
	recalculateNewSalesFormSchema,
	resolveNewSalesCustomerSchema,
	saveDraftNewSalesFormSchema,
	saveFinalNewSalesFormSchema,
	searchNewSalesCustomersSchema,
	searchNewSalesFormServiceSuggestionsSchema,
	searchNewSalesFormShelfProductsSchema,
	updateNewSalesFormShelfProductSchema,
} from "@api/schemas/new-sales-form";
import type { TRPCContext } from "@api/trpc/init";
import { salesAddressLines } from "@api/utils/sales";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import { salesWorkflowCache } from "@gnd/cache/sales-workflow-cache";
import { assertDealerSaleOfficeAccess } from "@gnd/db/queries";
import { projectLegacyOrderPayments } from "@gnd/sales";
import { analyzeSalesFormChange } from "@gnd/sales/adjustment-system";
import {
	addMoney,
	resolveSalesDisplayCcc,
	roundMoney,
	sumMoney,
} from "@gnd/sales/payment-system";
import {
	collapseDuplicateSalesDoorRows,
	findDuplicateSalesDoorIdentities,
	getSalesDoorActiveIdentity,
	normalizeShelfProductSearchQuery,
	normalizeSalesDoorDimension,
	searchShelfProductIndex,
	shelfProductSearchCandidateTerms,
	shelfProductSearchCandidateTitleAnchorGroups,
} from "@gnd/sales/sales-form";
import {
	calculateLegacyPaymentDueDate,
	projectSalesFormMetaToLegacyMeta,
	readLegacySalesFormMeta,
} from "@gnd/sales/sales-form/application/legacy-metadata";
import { calculateSalesFormSummary } from "@gnd/sales/sales-form/domain/costing";
import {
	collapseLegacyGroupedLines,
	expandGroupedLineForLegacySave,
} from "@gnd/sales/sales-form/domain/grouping";
import {
	hydrateHptLineFromLegacy,
	normalizeHptLineForLegacy,
} from "@gnd/sales/sales-form/domain/hpt-compatibility";
import { queueSalesInventoryLineItemsSync } from "@gnd/sales/sales-inventory-sync-job";
import {
	buildSpecialOrderCustomerVisibleRevision,
	deriveSpecialOrderRevisionTransition,
	deriveSpecialOrderStatus,
	requiresSpecialOrderCustomerEmail,
	validateSpecialOrderDeclaration,
	validateSpecialOrderEnrollment,
} from "@gnd/sales/special-order";
import { generateSalesSlug } from "@gnd/sales/utils";
import { generateRandomString } from "@gnd/utils";
import { TRPCError } from "@trpc/server";
import { getNewSalesFormCommitmentSnapshot } from "./new-sales-form-adjustments";
import {
	captureNewSalesFormSavePayload,
	logNewSalesFormSaveDiagnostic,
} from "./new-sales-form-debug";
import {
	buildSalesFormUpdateActivity,
	buildSpecialOrderEnrollmentActivity,
	buildSpecialOrderRevisionInvalidatedActivity,
	createSalesFormTimelineActivity,
	getSalesActivitySenderContactId,
} from "./sales-form-activity";
import { getSpecialOrderEnrollmentAccess } from "./special-order-settings";

const DEFAULT_DELIVERY_OPTION = "pickup";
const DEFAULT_PAYMENT_TERM = "None";

type NewSalesFormPersistedMeta = {
	version: string;
	draftKey?: string;
	approvedAdjustmentId?: string;
	updatedAt: string;
	autosave: boolean;
	/** @deprecated Commercial state is relational. Retained only to read old rows. */
	lineItems?: NewSalesFormLineItem[];
	/** @deprecated Commercial state is relational. Retained only to read old rows. */
	extraCosts?: NewSalesFormExtraCost[];
	/** @deprecated Commercial state is relational. Retained only to read old rows. */
	summary?: NewSalesFormSummary;
	/** @deprecated Relational/root legacy fields are authoritative on load. */
	form?: NewSalesFormMeta;
};

type NewSalesFormContainer = {
	newSalesForm?: NewSalesFormPersistedMeta;
	[key: string]: unknown;
};

type NewSalesFormSettings = {
	cccPercentage: number;
	taxCode: string | null;
	customerProfileId: number | null;
};

type LegacyDoorStepProduct = {
	id: number;
	uid: string | null;
	name: string | null;
	img: string | null;
	doorId: number | null;
	redirectUid: string | null;
	meta: unknown;
	deletedAt: Date | null;
	door: {
		id: number;
		title: string;
		img: string | null;
		deletedAt: Date | null;
	} | null;
};

type LegacyFormStepSnapshot = {
	id: number;
	stepId: number;
	componentId: number | null;
	prodUid: string | null;
	value: string | null;
	qty: number;
	price: number;
	basePrice: number;
	meta: Record<string, unknown> | null;
	step: {
		id: number;
		uid: string | null;
		title: string | null;
	};
};

const legacyDoorStepProductSelect = {
	id: true,
	uid: true,
	name: true,
	img: true,
	doorId: true,
	redirectUid: true,
	meta: true,
	deletedAt: true,
	door: {
		select: {
			id: true,
			title: true,
			img: true,
			deletedAt: true,
		},
	},
} as const;

type DealerProfileCardProfile = {
	id: number | null;
	title: string | null;
	salesPercentage: number | null;
	coefficient: number | null;
};

function safeMeta(meta: unknown): NewSalesFormContainer {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return {};
	}
	return meta as NewSalesFormContainer;
}

function stableComparableValue(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(stableComparableValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entry]) => [key, stableComparableValue(entry)]),
	);
}

function sameComparableValue(left: unknown, right: unknown) {
	return (
		JSON.stringify(stableComparableValue(left)) ===
		JSON.stringify(stableComparableValue(right))
	);
}

function withoutPo(meta: NewSalesFormMeta) {
	const { po: _po, ...rest } = meta;
	return rest;
}

function normalizeLegacyPoOnlyComparableMeta(meta: NewSalesFormMeta) {
	const comparable = { ...withoutPo(meta) } as Record<string, unknown>;
	if (comparable.notes == null || comparable.notes === "") {
		delete comparable.notes;
	}
	if (
		comparable.resaleCertificateOnFile == null ||
		comparable.resaleCertificateOnFile === false
	) {
		delete comparable.resaleCertificateOnFile;
	}
	if (
		comparable.sellerOfRecord == null ||
		comparable.sellerOfRecord === "DEALER"
	) {
		delete comparable.sellerOfRecord;
	}
	return comparable;
}

function normalizeLegacyPoOnlyComparableLines(
	lines: NewSalesFormLineItem[],
) {
	return lines.map((line) => {
		const comparable = { ...line } as Record<string, unknown>;
		if (comparable.taxxable == null) delete comparable.taxxable;
		if (
			typeof comparable.title === "string" &&
			["moulding", "mouldings"].includes(comparable.title.trim().toLowerCase())
		) {
			comparable.title = "Mouldings";
		}
		return comparable;
	});
}

function isSyntheticLegacyLaborPlaceholder(cost: NewSalesFormExtraCost) {
	return (
		!cost.id &&
		cost.type === "Labor" &&
		cost.label === "Labor" &&
		Number(cost.amount || 0) === 0 &&
		(cost.taxxable == null || cost.taxxable === false)
	);
}

function normalizeLegacyPoOnlyComparableExtraCosts(
	costs: NewSalesFormExtraCost[],
) {
	return costs.filter((cost) => !isSyntheticLegacyLaborPlaceholder(cost));
}

function safeDate(value?: string | null) {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function resolveOrderCreatedAt(value?: string | null, fallback?: Date | null) {
	return safeDate(value) || fallback || new Date();
}

function resolveOrderPaymentDueDate(
	type: "order" | "quote",
	meta: NewSalesFormMeta,
	createdAt: Date,
) {
	if (type !== "order") return null;
	if (meta.paymentTerm === "None") return safeDate(meta.paymentDueDate);
	return safeDate(calculateLegacyPaymentDueDate(meta.paymentTerm, createdAt));
}

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function finiteOptionalNumber(value: unknown) {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function resolveDealerProfileCard(order: {
	dealerAuth?: {
		id?: number | null;
		email?: string | null;
		name?: string | null;
		companyName?: string | null;
		dealer?: {
			name?: string | null;
			businessName?: string | null;
		} | null;
	} | null;
	dealerSale?: {
		dealerCustomerProfile?: Partial<DealerProfileCardProfile> | null;
	} | null;
	dealerSalesProfile?: Partial<DealerProfileCardProfile> | null;
}) {
	const dealer = order.dealerAuth;
	if (!dealer?.id) return null;

	const dealerName =
		dealer.companyName ||
		dealer.dealer?.businessName ||
		dealer.name ||
		dealer.dealer?.name ||
		dealer.email ||
		null;

	return {
		dealerId: dealer.id,
		dealerName,
		email: dealer.email || null,
		profile: normalizeDealerProfileCardProfile(
			order.dealerSale?.dealerCustomerProfile || order.dealerSalesProfile,
		),
	};
}

function normalizeDealerProfileCardProfile(
	profile?: Partial<DealerProfileCardProfile> | null,
) {
	if (!profile?.id) return null;
	return {
		id: profile.id,
		title: profile.title || null,
		salesPercentage:
			profile.salesPercentage == null ? null : Number(profile.salesPercentage),
		coefficient:
			profile.coefficient == null ? null : Number(profile.coefficient),
	};
}

function resolvePersistedPaymentMethod(
	container: NewSalesFormContainer,
	persisted?: NewSalesFormPersistedMeta,
) {
	const newFormPaymentMethod = persisted?.form?.paymentMethod;
	if (typeof newFormPaymentMethod === "string" && newFormPaymentMethod) {
		return newFormPaymentMethod;
	}
	const legacyPaymentMethod = container.payment_option;
	return typeof legacyPaymentMethod === "string" && legacyPaymentMethod
		? legacyPaymentMethod
		: null;
}

function roundCurrency(value: number) {
	return roundMoney(value);
}

function hasUnprojectedApprovedCommercialSnapshot(
	meta: NewSalesFormContainer,
	items: Array<{ total: number | null }>,
) {
	const persisted = meta.newSalesForm;
	if (!persisted?.approvedAdjustmentId || !persisted.lineItems?.length) {
		return false;
	}
	const snapshotTotal = roundCurrency(
		persisted.lineItems.reduce(
			(total, line) => total + Number(line.lineTotal || 0),
			0,
		),
	);
	const relationalTotal = roundCurrency(
		items.reduce((total, item) => total + Number(item.total || 0), 0),
	);
	return Math.abs(snapshotTotal - relationalTotal) >= 0.01;
}

function uniquePositiveNumbers(values: Array<unknown>) {
	return values
		.map((value) => Number(value || 0))
		.filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}

function legacyShelfCategoryIds(shelf: any) {
	const meta = safeRecord(shelf?.meta);
	if (Array.isArray(meta.categoryIds)) {
		return uniquePositiveNumbers(meta.categoryIds);
	}
	const categoryUid = String(meta.categoryUid || "").trim();
	if (categoryUid) {
		return uniquePositiveNumbers(categoryUid.split("-"));
	}
	return uniquePositiveNumbers([meta.shelfParentCategoryId, shelf?.categoryId]);
}

function legacyShelfMeta(shelf: any, index: number) {
	const meta = safeRecord(shelf?.meta);
	const categoryIds = legacyShelfCategoryIds(shelf);
	const lineUid =
		String(meta.lineUid || meta.sectionUid || "").trim() ||
		`shelf-line-${index + 1}`;
	const productUid =
		String(meta.productUid || meta.productRowUid || shelf?.uid || "").trim() ||
		`shelf-product-${index + 1}`;
	return {
		...meta,
		categoryIds,
		categoryUid: categoryIds.join("-"),
		lineUid,
		productUid,
		itemIndex: Number(meta.itemIndex ?? index),
		basePrice: Number(meta.basePrice ?? shelf?.basePrice ?? 0),
		salesPrice: Number(
			meta.salesPrice ?? shelf?.salesPrice ?? shelf?.unitPrice ?? 0,
		),
		customPrice: meta.customPrice ?? shelf?.customPrice ?? null,
	};
}

function salesFormStepIdentity(step: any) {
	return [
		Number(step?.stepId || step?.step?.id || 0),
		Number(step?.componentId || 0),
		String(step?.prodUid || "").trim(),
	].join("|");
}

function collapseDuplicateRelationalFormSteps<T extends { id?: number | null }>(
	steps: T[],
) {
	const rows = new Map<string, T>();
	for (const step of steps) {
		const identity = salesFormStepIdentity(step);
		const current = rows.get(identity);
		if (!current || Number(step.id || 0) < Number(current.id || 0)) {
			rows.set(identity, step);
		}
	}
	return [...rows.values()];
}

function normalizeSalesFormTitle(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function getLineMetaRows(
	line: {
		meta?: unknown;
	},
	key: "mouldingRows" | "serviceRows",
) {
	const meta = safeRecord(line.meta);
	const rows = meta[key];
	return Array.isArray(rows) ? rows : [];
}

function mergeLegacyDoorComponentSnapshots(
	formSteps: LegacyFormStepSnapshot[],
	housePackageTool: {
		stepProduct?: LegacyDoorStepProduct | null;
		doors?: Array<{ stepProduct?: LegacyDoorStepProduct | null }> | null;
	} | null,
) {
	const doorStepIndex = formSteps.findIndex(
		(step) => normalizeSalesFormTitle(step?.step?.title) === "door",
	);
	if (doorStepIndex < 0 || !housePackageTool) return formSteps;
	const doorStep = formSteps[doorStepIndex];
	if (!doorStep) return formSteps;
	const stepMeta = safeRecord(doorStep.meta);
	const selectedComponents = Array.isArray(stepMeta.selectedComponents)
		? [...stepMeta.selectedComponents]
		: [];
	const selectedUids = new Set(
		selectedComponents
			.map((component) => String(safeRecord(component).uid || "").trim())
			.filter(Boolean),
	);
	const candidates = [
		housePackageTool.stepProduct,
		...(housePackageTool.doors || []).map((door) => door.stepProduct),
	].filter((component): component is LegacyDoorStepProduct =>
		Boolean(component),
	);
	for (const component of candidates) {
		const uid = String(component.uid || "").trim();
		if (!uid || selectedUids.has(uid)) continue;
		const componentMeta = safeRecord(component.meta);
		selectedComponents.push({
			id: component.id,
			uid,
			title:
				String(component.name || component.door?.title || "").trim() ||
				`Door ${component.id}`,
			img: component.img || component.door?.img || null,
			inventoryId: component.doorId || component.door?.id || null,
			inventoryVariantId: null,
			salesPrice: null,
			basePrice: null,
			pricing: null,
			supplierVariants: [],
			redirectUid: component.redirectUid || null,
			sectionOverride: componentMeta.sectionOverride || null,
		});
		selectedUids.add(uid);
	}
	if (!selectedComponents.length) return formSteps;
	const nextSteps = [...formSteps];
	nextSteps[doorStepIndex] = {
		...doorStep,
		meta: {
			...stepMeta,
			selectedComponents,
		},
	};
	return nextSteps;
}

export function deriveNewSalesFormSettings(
	settingMeta?: unknown,
): NewSalesFormSettings {
	const settingsMeta = safeRecord(settingMeta);
	const nestedSettingsMeta = safeRecord(settingsMeta.data);
	return {
		cccPercentage:
			Number(settingsMeta.ccc ?? nestedSettingsMeta.ccc ?? 3.5) || 3.5,
		taxCode:
			(settingsMeta.taxCode as string | null | undefined) ??
			(nestedSettingsMeta.taxCode as string | null | undefined) ??
			null,
		customerProfileId:
			Number(
				settingsMeta.customerProfileId ??
					nestedSettingsMeta.customerProfileId ??
					0,
			) || null,
	};
}

function recalculateSummary(
	input: RecalculateNewSalesFormSchema & { cccPercentage?: number | null },
) {
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate: input.taxRate,
		paymentMethod: input.paymentMethod,
		cccPercentage: input.cccPercentage,
		lineItems: input.lineItems,
		extraCosts: input.extraCosts,
	});
	return {
		subTotal: summary.subTotal,
		adjustedSubTotal: summary.adjustedSubTotal,
		taxRate: summary.taxRate,
		taxTotal: summary.taxTotal,
		grandTotal: summary.grandTotal,
		totalWithCcc: summary.totalWithCcc,
		discount: summary.discount,
		discountPct: summary.discountPct,
		percentDiscountValue: summary.percentDiscountValue,
		labor: summary.labor,
		delivery: summary.delivery,
		otherCosts: summary.otherCosts,
		taxableSubTotal: summary.taxableSubTotal,
		ccc: summary.ccc,
	};
}

function storedOrderSummary<
	T extends {
		grandTotal?: number;
		ccc?: number;
		totalWithCcc?: number;
	},
>(summary: T) {
	const grandTotal = roundMoney(summary.grandTotal);
	const ccc = roundMoney(summary.ccc);
	return {
		...summary,
		grandTotal,
		ccc,
		totalWithCcc: roundMoney(summary.totalWithCcc ?? addMoney(grandTotal, ccc)),
	};
}

function displayOrderSummary<
	T extends {
		grandTotal?: number;
		ccc?: number;
		totalWithCcc?: number;
	},
>(
	summary: T,
	input: {
		paymentMethod?: string | null;
		cccPercentage?: number | null;
		meta?: unknown;
	},
) {
	const displayCcc = resolveSalesDisplayCcc({
		baseTotal: summary.grandTotal,
		paymentMethod: input.paymentMethod,
		cccPercentage: input.cccPercentage,
		meta: input.meta,
	});
	return {
		...summary,
		grandTotal: displayCcc.baseTotal,
		ccc: displayCcc.ccc,
		totalWithCcc: displayCcc.totalWithCcc,
	};
}

function normalizeLineItems(lines: NewSalesFormLineItem[]) {
	return lines.map((line, index) => {
		const normalizedHptLine = normalizeHptLineForLegacy(line as any) as any;
		const qty = Number(normalizedHptLine.qty || 0);
		const unitPrice = Number(normalizedHptLine.unitPrice || 0);
		const lineTotal = roundCurrency(
			Number.isFinite(normalizedHptLine.lineTotal)
				? normalizedHptLine.lineTotal
				: qty * unitPrice,
		);
		return {
			...normalizedHptLine,
			qty,
			unitPrice,
			lineTotal,
			uid:
				normalizedHptLine.uid || `line-${index + 1}-${generateRandomString(6)}`,
			formSteps: normalizedHptLine.formSteps || [],
			shelfItems: normalizedHptLine.shelfItems || [],
			housePackageTool: normalizedHptLine.housePackageTool || null,
		};
	});
}

function normalizedPo(value: unknown) {
	return typeof value === "string" && value.trim() ? value : null;
}

function isLegacyPoOnlySave(input: {
	currentMeta: NewSalesFormContainer;
	currentStatus: string | null;
	nextStatus: string;
	payload: SaveDraftNewSalesFormSchema | SaveFinalNewSalesFormSchema;
	before: {
		form: NewSalesFormMeta;
		lineItems: NewSalesFormLineItem[];
		extraCosts: NewSalesFormExtraCost[];
		summary: NewSalesFormSummary;
		inventoryStatus?: unknown;
		specialOrder?: { declaration?: "NO" | "YES" | null } | null;
	};
	normalizedLines: NewSalesFormLineItem[];
	persistedSummary: NewSalesFormSummary;
	cccPercentage: number;
}) {
	if (
		input.currentMeta.newSalesForm?.form ||
		input.currentStatus !== input.nextStatus
	) {
		return false;
	}
	if (
		normalizedPo(input.payload.meta.po) ===
		normalizedPo(input.before.form.po)
	) {
		return false;
	}

	const beforeLines = normalizeLineItems(input.before.lineItems);
	const beforeSummary = storedOrderSummary(
		recalculateSummary({
			taxRate: input.before.summary.taxRate,
			lineItems: beforeLines,
			extraCosts: input.before.extraCosts.map((cost) => ({
				type: cost.type,
				amount: Number(cost.amount || 0),
				taxxable: cost.taxxable ?? false,
			})),
			paymentMethod: input.before.form.paymentMethod || null,
			cccPercentage: input.cccPercentage,
		}),
	);

	return sameComparableValue(
		{
			meta: normalizeLegacyPoOnlyComparableMeta(input.before.form),
			lineItems: normalizeLegacyPoOnlyComparableLines(beforeLines),
			extraCosts: normalizeLegacyPoOnlyComparableExtraCosts(
				input.before.extraCosts,
			),
			summary: beforeSummary,
			inventoryStatus: input.before.inventoryStatus ?? null,
			specialOrderDeclaration:
				input.before.specialOrder?.declaration ?? null,
		},
		{
			meta: normalizeLegacyPoOnlyComparableMeta(input.payload.meta),
			lineItems: normalizeLegacyPoOnlyComparableLines(input.normalizedLines),
			extraCosts: normalizeLegacyPoOnlyComparableExtraCosts(
				input.payload.extraCosts,
			),
			summary: input.persistedSummary,
			inventoryStatus: input.payload.inventoryStatus ?? null,
			specialOrderDeclaration:
				input.payload.specialOrderDeclaration ?? null,
		},
	);
}

function assertUniqueDurableSalesFormIds(
	lines: NewSalesFormLineItem[],
	extraCosts: NewSalesFormExtraCost[],
) {
	const assertUnique = (
		label: string,
		values: Array<number | null | undefined>,
	) => {
		const seen = new Set<number>();
		for (const value of values) {
			const id = Number(value || 0);
			if (id <= 0) continue;
			if (seen.has(id)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Duplicate durable ${label} id ${id}. Reload the document before saving.`,
				});
			}
			seen.add(id);
		}
	};
	const lineUids = lines.map((line) => line.uid);
	if (new Set(lineUids).size !== lineUids.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Duplicate line identity. Reload the document before saving.",
		});
	}
	assertUnique(
		"line",
		lines.map((line) => line.id),
	);
	assertUnique(
		"form-step",
		lines.flatMap((line) => (line.formSteps || []).map((step) => step.id)),
	);
	assertUnique(
		"shelf-row",
		lines.flatMap((line) => (line.shelfItems || []).map((row) => row.id)),
	);
	assertUnique(
		"door",
		lines.flatMap((line) =>
			(line.housePackageTool?.doors || []).map((door) => door.id),
		),
	);
	assertUnique(
		"extra-cost",
		extraCosts.map((cost) => cost.id),
	);
	for (const line of lines) {
		const stepIdentities = (line.formSteps || []).map(salesFormStepIdentity);
		if (new Set(stepIdentities).size !== stepIdentities.length) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Duplicate form-step selection on ${line.title}. Remove the duplicate component before saving.`,
			});
		}
	}
}

async function generateSalesIdentity(
	ctx: TRPCContext,
	type: "order" | "quote",
): Promise<{ orderId: string; slug: string }> {
	const salesRep =
		ctx.userId != null
			? await ctx.db.users.findFirst({
					where: { id: ctx.userId },
					select: { name: true },
				})
			: null;
	const orderId = String(
		await generateSalesSlug(
			type as any,
			ctx.db.salesOrders,
			salesRep?.name || "",
		),
	);
	return {
		orderId,
		slug: `${type}-${orderId.toLowerCase()}`,
	};
}

function toBootstrapPayload(
	order: {
		id: number;
		slug: string;
		orderId: string;
		inventoryStatus: string | null;
		specialOrderDeclaration: "NO" | "YES" | null;
		specialOrderStatus:
			| "NOT_REQUIRED"
			| "SIGNATURE_PENDING"
			| "CUSTOMER_APPROVED"
			| "REAPPROVAL_REQUIRED"
			| "CUSTOMER_DECLINED"
			| null;
		specialOrderRevision: string | null;
		currentSpecialOrderApprovalId: string | null;
		currentSpecialOrderRequestId: string | null;
		type: string | null;
		status: string | null;
		customerId: number | null;
		customerProfileId: number | null;
		billingAddressId: number | null;
		shippingAddressId: number | null;
		paymentTerm: string | null;
		createdAt: Date | null;
		paymentDueDate: Date | null;
		goodUntil: Date | null;
		prodDueDate: Date | null;
		deliveryOption: string | null;
		extraCosts: Array<{
			id: number;
			label: string;
			type: string;
			amount: number;
			taxxable: boolean | null;
		}>;
		taxes: Array<{
			taxCode: string;
			taxConfig: {
				percentage: number;
			} | null;
		}>;
		taxPercentage: number | null;
		subTotal: number | null;
		tax: number | null;
		grandTotal: number | null;
		updatedAt: Date | null;
		items: Array<{
			id: number;
			multiDykeUid: string | null;
			multiDyke: boolean | null;
			dykeProduction: boolean | null;
			dykeDescription: string | null;
			description: string | null;
			qty: number | null;
			rate: number | null;
			total: number | null;
			meta: unknown;
			deletedAt: Date | null;
			formSteps: Array<{
				id: number;
				stepId: number;
				componentId: number | null;
				prodUid: string | null;
				value: string | null;
				qty: number | null;
				price: number | null;
				basePrice: number | null;
				meta: unknown;
				step: {
					id: number;
					uid: string | null;
					title: string | null;
				};
			}>;
			shelfItems: Array<{
				id: number;
				categoryId: number;
				productId: number | null;
				description: string | null;
				qty: number | null;
				unitPrice: unknown;
				totalPrice: unknown;
				meta: unknown;
			}>;
			housePackageTool: {
				id: number;
				deletedAt: Date | null;
				height: string | null;
				doorType: string | null;
				doorId: number | null;
				dykeDoorId: number | null;
				jambSizeId: number | null;
				casingId: number | null;
				moldingId: number | null;
				stepProductId: number | null;
				totalPrice: number | null;
				totalDoors: number | null;
				meta: unknown;
				stepProduct: LegacyDoorStepProduct | null;
				molding: {
					id: number;
					deletedAt: Date | null;
					title: string | null;
					img: string | null;
					value: string;
					price: number | null;
				} | null;
				doors: Array<{
					id: number;
					dimension: string;
					swing: string | null;
					doorType: string | null;
					doorPrice: number | null;
					jambSizePrice: number | null;
					casingPrice: number | null;
					unitPrice: number | null;
					lhQty: number | null;
					rhQty: number | null;
					totalQty: number;
					lineTotal: number | null;
					stepProductId: number | null;
					meta: unknown;
					stepProduct: LegacyDoorStepProduct | null;
				}>;
			} | null;
		}>;
		customer: {
			id: number;
			name: string | null;
			businessName: string | null;
			phoneNo: string | null;
			email: string | null;
		} | null;
		dealerAuth?: {
			id: number;
			email: string | null;
			name: string | null;
			companyName: string | null;
			dealer: {
				name: string | null;
				businessName: string | null;
			} | null;
		} | null;
		dealerSale?: {
			dealerCustomerProfile: {
				id: number;
				title: string | null;
				salesPercentage: number | null;
				coefficient: number | null;
			} | null;
		} | null;
		dealerSalesProfile?: {
			id: number;
			title: string | null;
			salesPercentage: number | null;
			coefficient: number | null;
		} | null;
		salesProfile?: {
			coefficient: number | null;
		} | null;
		meta: unknown;
		payments?: { amount: number | null; status?: string | null }[];
	},
	settings: NewSalesFormSettings,
) {
	const container = safeMeta(order.meta);
	const persisted = container.newSalesForm;
	const rawDbLines = order.items
		.filter((item) => !item.deletedAt)
		.map((item, index) => {
			const itemMeta = safeRecord(item.meta);
			const lineMeta = safeRecord(itemMeta.meta);
			const housePackageTool =
				item.housePackageTool && !item.housePackageTool.deletedAt
					? {
							id: item.housePackageTool.id,
							height: item.housePackageTool.height,
							doorType: item.housePackageTool.doorType,
							doorId: item.housePackageTool.doorId,
							dykeDoorId: item.housePackageTool.dykeDoorId,
							jambSizeId: item.housePackageTool.jambSizeId,
							casingId: item.housePackageTool.casingId,
							moldingId: item.housePackageTool.moldingId,
							stepProductId: item.housePackageTool.stepProductId,
							totalPrice: Number(item.housePackageTool.totalPrice || 0),
							totalDoors: Number(item.housePackageTool.totalDoors || 0),
							meta: safeRecord(item.housePackageTool.meta),
							stepProduct: item.housePackageTool.stepProduct,
							molding:
								item.housePackageTool.molding &&
								!item.housePackageTool.molding.deletedAt
									? {
											id: item.housePackageTool.molding.id,
											title: item.housePackageTool.molding.title,
											img: item.housePackageTool.molding.img,
											value: item.housePackageTool.molding.value,
											price: Number(item.housePackageTool.molding.price || 0),
										}
									: null,
							doors: collapseDuplicateSalesDoorRows(
								(item.housePackageTool.doors || []).map((door) => {
									const doorMeta = safeRecord(door.meta);
									const coefficient = Number(
										order.salesProfile?.coefficient || 0,
									);
									const storedBase = Number(doorMeta.baseUnitPrice || 0);
									const recoveredBase =
										storedBase > 0
											? storedBase
											: coefficient > 0 && Number(door.jambSizePrice || 0) > 0
												? roundMoney(
														Number(door.jambSizePrice || 0) * coefficient,
													)
												: 0;
									return {
										id: door.id,
										dimension: normalizeSalesDoorDimension(door.dimension),
										swing: door.swing,
										doorType: door.doorType,
										doorPrice: Number(door.doorPrice || 0),
										jambSizePrice: Number(door.jambSizePrice || 0),
										casingPrice: Number(door.casingPrice || 0),
										unitPrice: Number(door.unitPrice || 0),
										lhQty: Number(door.lhQty || 0),
										rhQty: Number(door.rhQty || 0),
										totalQty: Number(door.totalQty || 0),
										lineTotal: Number(door.lineTotal || 0),
										stepProductId: door.stepProductId,
										meta: {
											...doorMeta,
											...(recoveredBase > 0
												? {
														baseUnitPrice: recoveredBase,
														pricingAuthority:
															storedBase > 0
																? doorMeta.pricingAuthority || "catalog"
																: "recovered-relational-price",
													}
												: {}),
										},
										stepProduct: door.stepProduct,
									};
								}),
							),
						}
					: null;
			const rawLine = {
				id: item.id,
				multiDykeUid: item.multiDykeUid || null,
				multiDyke: item.multiDyke ?? null,
				dykeProduction: item.dykeProduction ?? false,
				sourceMeta: itemMeta,
				uid:
					(typeof itemMeta.uid === "string" && itemMeta.uid) ||
					`sales-item-${item.id}`,
				title:
					item.dykeDescription ||
					(typeof itemMeta.title === "string" ? itemMeta.title : "") ||
					item.description ||
					"",
				description: item.description,
				qty: Number(item.qty || 0),
				unitPrice: Number(item.rate || 0),
				lineTotal: Number(item.total || 0),
				meta: lineMeta,
				formSteps: mergeLegacyDoorComponentSnapshots(
					collapseDuplicateRelationalFormSteps(item.formSteps).map((step) => ({
						id: step.id,
						stepId: step.stepId,
						componentId: step.componentId,
						prodUid: step.prodUid,
						value: step.value,
						qty: Number(step.qty || 0),
						price: Number(step.price || 0),
						basePrice: Number(step.basePrice || 0),
						meta: safeRecord(step.meta),
						step: {
							id: step.step.id,
							uid: step.step.uid,
							title: step.step.title,
						},
					})),
					item.housePackageTool,
				),
				shelfItems: item.shelfItems.map((shelf) => ({
					id: shelf.id,
					categoryId: shelf.categoryId,
					productId: shelf.productId,
					description: shelf.description,
					qty: Number(shelf.qty || 0),
					unitPrice: Number(shelf.unitPrice || 0),
					totalPrice: Number(shelf.totalPrice || 0),
					meta: safeRecord(shelf.meta),
				})),
				housePackageTool,
			};
			return hydrateHptLineFromLegacy(rawLine as any, {
				profileCoefficient: order.salesProfile?.coefficient,
			}) as typeof rawLine;
		});
	const dbLines = collapseLegacyGroupedLines(rawDbLines)
		.map(
			({ multiDykeUid, multiDyke, dykeProduction, sourceMeta, ...line }) =>
				line,
		)
		.sort((left, right) => {
			const leftIndex = Number(safeRecord(left.meta).itemIndex);
			const rightIndex = Number(safeRecord(right.meta).itemIndex);
			if (!Number.isFinite(leftIndex) || !Number.isFinite(rightIndex)) return 0;
			return leftIndex - rightIndex;
		});

	// The relational sales graph is the sole commercial authority. Historical
	// JSON line snapshots are deliberately ignored here so they cannot recreate
	// deleted rows, replace durable ids, or override current prices.
	const lineItems = dbLines.map((line) =>
		normalizeHptLineForLegacy(line as any, {
			profileCoefficient: order.salesProfile?.coefficient,
		}),
	) as typeof dbLines;
	const taxRate = Number(
		order.taxPercentage ?? order.taxes?.[0]?.taxConfig?.percentage ?? 0,
	);
	const paymentMethod = resolvePersistedPaymentMethod(container, persisted);
	const summary = recalculateSummary({
		taxRate,
		paymentMethod,
		cccPercentage: settings.cccPercentage,
		extraCosts: order.extraCosts.map((cost) => ({
			type: cost.type as any,
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable ?? false,
		})),
		lineItems: lineItems as any,
	});
	const hasComputedSummary = Number(summary.subTotal || 0) > 0;
	const paymentTotal = sumMoney(
		(order.payments || []).map((payment) => Number(payment.amount || 0)),
	);
	const paymentMethodReviewDismissed = Boolean(
		container.paymentMethodReviewDismissed,
	);
	const legacyFormMeta = readLegacySalesFormMeta({
		meta: container,
		persistedForm: persisted?.form,
		order: {
			createdAt: order.createdAt,
			paymentDueDate: order.paymentDueDate,
			goodUntil: order.goodUntil,
			prodDueDate: order.prodDueDate,
			paymentTerm: order.paymentTerm,
			deliveryOption: order.deliveryOption,
		},
		defaults: {
			paymentTerm: DEFAULT_PAYMENT_TERM,
			deliveryOption: DEFAULT_DELIVERY_OPTION,
		},
	});
	const baseHydratedSummary = {
		...summary,
		grandTotal: hasComputedSummary
			? Number(storedOrderSummary(summary).grandTotal || 0)
			: Number(order.grandTotal ?? summary.grandTotal),
	};
	const displayHydratedSummary = displayOrderSummary(baseHydratedSummary, {
		paymentMethod,
		cccPercentage: settings.cccPercentage,
		meta: container,
	});

	return {
		salesId: order.id,
		slug: order.slug,
		orderId: order.orderId,
		inventoryStatus: order.inventoryStatus,
		specialOrder: {
			declaration: order.specialOrderDeclaration,
			status: order.specialOrderStatus,
			revision: order.specialOrderRevision,
			currentApprovalId: order.currentSpecialOrderApprovalId,
			currentRequestId: order.currentSpecialOrderRequestId,
			changeReason: null,
		},
		type: (order.type || "order") as "order" | "quote",
		status: order.status || "Draft",
		version:
			persisted?.version ||
			`${order.updatedAt?.getTime() || order.createdAt?.getTime() || 0}-legacy`,
		updatedAt:
			persisted?.updatedAt ||
			order.updatedAt?.toISOString() ||
			new Date().toISOString(),
		customer: order.customer,
		dealerProfileCard: resolveDealerProfileCard(order),
		settings,
		paymentTotal,
		paymentCount: order.payments?.length || 0,
		paymentMethodReviewDismissed,
		form: {
			paymentTerm: DEFAULT_PAYMENT_TERM,
			createdAt: null,
			paymentDueDate: null,
			goodUntil: null,
			prodDueDate: null,
			po: "",
			notes: null,
			deliveryOption: DEFAULT_DELIVERY_OPTION,
			...legacyFormMeta,
			taxCode: order.taxes?.[0]?.taxCode ?? legacyFormMeta.taxCode ?? null,
			customerId: order.customerId,
			customerProfileId: order.customerProfileId,
			billingAddressId: order.billingAddressId,
			shippingAddressId: order.shippingAddressId,
			paymentMethod,
		},
		lineItems,
		extraCosts: order.extraCosts.map((cost) => ({
			id: cost.id,
			label: cost.label,
			type: cost.type as any,
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable,
		})),
		summary: {
			subTotal: Number(summary.subTotal),
			adjustedSubTotal: Number(summary.adjustedSubTotal ?? summary.subTotal),
			taxableSubTotal: Number(summary.taxableSubTotal || 0),
			taxRate,
			taxTotal: Number(summary.taxTotal),
			grandTotal: Number(displayHydratedSummary.grandTotal || 0),
			totalWithCcc: Number(displayHydratedSummary.totalWithCcc || 0),
			discount: Number(summary.discount || 0),
			discountPct: Number(summary.discountPct || 0),
			percentDiscountValue: Number(summary.percentDiscountValue || 0),
			labor: Number(summary.labor || 0),
			delivery: Number(summary.delivery || 0),
			otherCosts: Number(summary.otherCosts || 0),
			ccc: Number(displayHydratedSummary.ccc || 0),
		},
	};
}

export async function bootstrapNewSalesForm(
	ctx: TRPCContext,
	input: BootstrapNewSalesFormSchema,
) {
	bootstrapNewSalesFormSchema.parse(input);
	const [setting, selectedCustomer] = await Promise.all([
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
			select: {
				meta: true,
			},
		}),
		input.customerId
			? ctx.db.customers.findFirst({
					where: {
						id: input.customerId,
						dealerOwnerId: null,
						deletedAt: null,
					},
					select: {
						id: true,
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
					},
				})
			: null,
	]);
	if (input.customerId && !selectedCustomer) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Dealer-owned customers cannot be used for office-origin sales.",
		});
	}
	const settings = deriveNewSalesFormSettings(setting?.meta);
	const now = new Date().toISOString();
	return {
		salesId: null,
		slug: null,
		orderId: null,
		inventoryStatus: null,
		specialOrder: {
			declaration: null,
			status: null,
			revision: null,
			currentApprovalId: null,
			currentRequestId: null,
			changeReason: null,
		},
		type: input.type,
		status: "Draft",
		version: `new-${Date.now()}-${generateRandomString(6)}`,
		updatedAt: now,
		customer: selectedCustomer,
		dealerProfileCard: null,
		settings,
		form: {
			customerId: input.customerId || null,
			customerProfileId: settings.customerProfileId,
			billingAddressId: null,
			shippingAddressId: null,
			paymentTerm: DEFAULT_PAYMENT_TERM,
			paymentMethod: null,
			createdAt: now,
			paymentDueDate: null,
			goodUntil: null,
			prodDueDate: null,
			po: null,
			notes: null,
			deliveryOption: DEFAULT_DELIVERY_OPTION,
			taxCode: settings.taxCode,
		},
		lineItems: [],
		extraCosts: [
			{
				id: null,
				label: "Labor",
				type: "Labor",
				amount: 0,
				taxxable: false,
			},
		],
		summary: {
			subTotal: 0,
			adjustedSubTotal: 0,
			taxRate: 0,
			taxTotal: 0,
			grandTotal: 0,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			ccc: 0,
		},
	};
}

export async function getNewSalesForm(
	ctx: TRPCContext,
	input: GetNewSalesFormSchema,
	sourceType: string = input.type,
) {
	getNewSalesFormSchema.parse(input);
	const loadOrder = (identifier: { slug: string } | { orderId: string }) =>
		ctx.db.salesOrders.findFirst({
			where: {
				...identifier,
				type: sourceType,
				deletedAt: null,
			},
			select: {
				id: true,
				slug: true,
				orderId: true,
				inventoryStatus: true,
				specialOrderDeclaration: true,
				specialOrderStatus: true,
				specialOrderRevision: true,
				currentSpecialOrderApprovalId: true,
				currentSpecialOrderRequestId: true,
				type: true,
				status: true,
				customerId: true,
				customerProfileId: true,
				billingAddressId: true,
				shippingAddressId: true,
				paymentTerm: true,
				createdAt: true,
				paymentDueDate: true,
				goodUntil: true,
				prodDueDate: true,
				deliveryOption: true,
				extraCosts: {
					select: {
						id: true,
						label: true,
						type: true,
						amount: true,
						taxxable: true,
					},
				},
				taxes: {
					where: {
						deletedAt: null,
					},
					orderBy: {
						createdAt: "desc",
					},
					select: {
						taxCode: true,
						taxConfig: {
							select: {
								percentage: true,
							},
						},
					},
				},
				taxPercentage: true,
				subTotal: true,
				tax: true,
				grandTotal: true,
				updatedAt: true,
				meta: true,
				payments: {
					where: {
						deletedAt: null,
					},
					select: {
						amount: true,
						status: true,
					},
				},
				customer: {
					select: {
						id: true,
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
					},
				},
				dealerAuthId: true,
				dealerAuth: {
					select: {
						id: true,
						email: true,
						name: true,
						companyName: true,
						dealer: {
							select: {
								name: true,
								businessName: true,
							},
						},
					},
				},
				dealerSale: {
					select: {
						dealerCustomerProfile: {
							select: {
								id: true,
								title: true,
								salesPercentage: true,
								coefficient: true,
							},
						},
					},
				},
				dealerSalesProfile: {
					select: {
						id: true,
						title: true,
						salesPercentage: true,
						coefficient: true,
					},
				},
				salesProfile: {
					select: {
						coefficient: true,
					},
				},
				items: {
					where: {
						deletedAt: null,
					},
					select: {
						id: true,
						multiDykeUid: true,
						multiDyke: true,
						dykeProduction: true,
						dykeDescription: true,
						description: true,
						qty: true,
						rate: true,
						total: true,
						meta: true,
						deletedAt: true,
						formSteps: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								stepId: true,
								componentId: true,
								prodUid: true,
								value: true,
								qty: true,
								price: true,
								basePrice: true,
								meta: true,
								step: {
									select: {
										id: true,
										uid: true,
										title: true,
									},
								},
							},
						},
						shelfItems: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								categoryId: true,
								productId: true,
								description: true,
								qty: true,
								unitPrice: true,
								totalPrice: true,
								meta: true,
							},
						},
						housePackageTool: {
							select: {
								id: true,
								deletedAt: true,
								height: true,
								doorType: true,
								doorId: true,
								dykeDoorId: true,
								jambSizeId: true,
								casingId: true,
								moldingId: true,
								stepProductId: true,
								totalPrice: true,
								totalDoors: true,
								meta: true,
								stepProduct: {
									select: legacyDoorStepProductSelect,
								},
								molding: {
									select: {
										id: true,
										deletedAt: true,
										title: true,
										img: true,
										value: true,
										price: true,
									},
								},
								doors: {
									where: {
										deletedAt: null,
									},
									select: {
										id: true,
										dimension: true,
										swing: true,
										doorType: true,
										doorPrice: true,
										jambSizePrice: true,
										casingPrice: true,
										unitPrice: true,
										lhQty: true,
										rhQty: true,
										totalQty: true,
										lineTotal: true,
										stepProductId: true,
										meta: true,
										stepProduct: {
											select: legacyDoorStepProductSelect,
										},
									},
								},
							},
						},
					},
					orderBy: {
						id: "asc",
					},
				},
			},
		});
	const [orderBySlug, setting] = await Promise.all([
		loadOrder({ slug: input.slug }),
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
			select: {
				meta: true,
			},
		}),
	]);
	const order = orderBySlug ?? (await loadOrder({ orderId: input.slug }));
	if (order?.dealerAuthId) {
		if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
		await assertDealerSaleOfficeAccess(ctx.db, ctx.userId, order.id);
	}

	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Sales form not found.",
		});
	}
	return toBootstrapPayload(order, deriveNewSalesFormSettings(setting?.meta));
}

export async function getNewSalesFormHistorySnapshot(
	ctx: TRPCContext,
	input: GetNewSalesFormHistorySnapshotSchema,
) {
	const payload = getNewSalesFormHistorySnapshotSchema.parse(input);
	const historyType = `${payload.type}-hx`;
	const [current, history] = await Promise.all([
		ctx.db.salesOrders.findFirst({
			where: {
				id: payload.salesId,
				type: payload.type,
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
			},
		}),
		ctx.db.salesOrders.findFirst({
			where: {
				id: payload.historyId,
				type: historyType,
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				slug: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	if (
		!current ||
		!history ||
		!history.orderId.startsWith(`${current.orderId}-hx`)
	) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Sales history snapshot not found.",
		});
	}

	const record = await getNewSalesForm(
		ctx,
		{
			type: payload.type,
			slug: history.slug,
		},
		historyType,
	);

	return {
		history: {
			id: history.id,
			orderId: history.orderId,
			createdAt: history.createdAt?.toISOString() || null,
			updatedAt: history.updatedAt?.toISOString() || null,
		},
		record: {
			...record,
			type: payload.type,
		},
	};
}

export async function getNewSalesFormStepRouting(
	ctx: TRPCContext,
	input: GetNewSalesFormStepRoutingSchema,
) {
	getNewSalesFormStepRoutingSchema.parse(input);
	return salesWorkflowCache.getOrSetStepRouting(() =>
		fetchNewSalesFormStepRoutingFromDb(ctx),
	);
}

async function fetchNewSalesFormStepRoutingFromDb(ctx: TRPCContext) {
	const [setting, steps] = await Promise.all([
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
			select: {
				id: true,
				meta: true,
			},
		}),
		ctx.db.dykeSteps.findMany({
			where: {
				deletedAt: null,
			},
			select: {
				id: true,
				uid: true,
				title: true,
				meta: true,
				stepProducts: {
					where: {
						deletedAt: null,
					},
					select: {
						id: true,
						uid: true,
						name: true,
						img: true,
						meta: true,
						redirectUid: true,
						product: {
							select: {
								title: true,
								img: true,
							},
						},
						door: {
							select: {
								title: true,
								img: true,
							},
						},
					},
				},
			},
		}),
	]);

	const settingsMeta = safeRecord(setting?.meta);
	const nestedRouteData = safeRecord(settingsMeta.data);
	const rawRoute = safeRecord(
		Object.keys(safeRecord(settingsMeta.route)).length
			? settingsMeta.route
			: nestedRouteData.route,
	);
	const composedRouter: Record<
		string,
		{
			config?: unknown;
			routeSequence: Array<{ uid: string }>;
			route: Record<string, string>;
		}
	> = {};

	for (const [rootUid, routeDef] of Object.entries(rawRoute)) {
		const routeObj = safeRecord(routeDef);
		const routeSequence = Array.isArray(routeObj.routeSequence)
			? routeObj.routeSequence
					.map((entry) => safeRecord(entry))
					.map((entry) => ({ uid: String(entry.uid || "") }))
					.filter((entry) => !!entry.uid)
			: [];
		const route: Record<string, string> = {};
		let current = rootUid;
		for (const next of routeSequence) {
			route[current] = next.uid;
			current = next.uid;
		}
		composedRouter[rootUid] = {
			config: routeObj.config,
			routeSequence,
			route,
		};
	}

	const stepsByUid: Record<
		string,
		{
			id: number;
			uid: string;
			title: string | null;
			meta: Record<string, unknown>;
			components: Array<{
				id: number;
				uid: string;
				title: string | null;
				redirectUid: string | null;
				img: string | null;
				meta: unknown;
			}>;
		}
	> = {};
	const stepsById: Record<number, string> = {};

	for (const step of steps) {
		if (!step.uid) continue;
		stepsById[step.id] = step.uid;
		stepsByUid[step.uid] = {
			id: step.id,
			uid: step.uid,
			title: step.title,
			meta: safeRecord(step.meta),
			components: (step.stepProducts || [])
				.filter((component) => !!component.uid)
				.map((component) => ({
					id: component.id,
					uid: component.uid!,
					title:
						component.name ||
						component.product?.title ||
						component.door?.title ||
						null,
					redirectUid: component.redirectUid || null,
					meta: component.meta,
					img:
						component.img ||
						component.product?.img ||
						component.door?.img ||
						null,
				})),
		};
	}

	const configuredRootComponentUids = Object.keys(composedRouter);
	const rootStepFromRoute =
		Object.values(stepsByUid)
			.map((step) => ({
				step,
				score: (step.components || []).filter((component) =>
					configuredRootComponentUids.includes(component.uid),
				).length,
			}))
			.sort((a, b) => b.score - a.score)[0] || null;
	const rootStep =
		(rootStepFromRoute && rootStepFromRoute.score > 0
			? rootStepFromRoute.step
			: null) ||
		Object.values(stepsByUid).find((step) => step.id === 1) ||
		null;
	return {
		settingId: setting?.id || null,
		settingsMeta,
		composedRouter,
		stepsByUid,
		stepsById,
		rootStepUid: rootStep?.uid || null,
		rootComponents: rootStep?.components || [],
	};
}

export async function searchNewSalesCustomers(
	ctx: TRPCContext,
	input: SearchNewSalesCustomersSchema,
) {
	const data = searchNewSalesCustomersSchema.parse(input);
	const query = data.query?.trim();
	if (!query && !data.recent) return [];

	const mapCustomerResult = (customer: {
		id: number;
		name: string | null;
		businessName: string | null;
		phoneNo: string | null;
		email: string | null;
		profile: {
			id: number;
			title: string | null;
		} | null;
		taxProfiles: Array<{
			tax: {
				title: string | null;
				taxCode: string | null;
			} | null;
		}>;
		addressBooks: Array<{
			id: number;
			name: string | null;
			address1: string | null;
			address2: string | null;
			city: string | null;
			state: string | null;
			country: string | null;
			phoneNo: string | null;
			email: string | null;
			meta: unknown;
			isPrimary: boolean | null;
		}>;
	}) => {
		const businessName = String(customer?.businessName || "").trim();
		const [taxProfile] = customer.taxProfiles || [];
		const [addressBook] = customer.addressBooks || [];
		const shippingLines = addressBook
			? salesAddressLines(addressBook as any, customer as any)
			: [];
		return {
			id: Number(customer?.id || 0),
			customerId: Number(customer?.id || 0),
			name: String(customer?.name || ""),
			businessName,
			phoneNo: String(customer?.phoneNo || ""),
			phone: String(customer?.phoneNo || ""),
			email: String(customer?.email || ""),
			profileId:
				customer?.profile?.id == null ? null : Number(customer.profile.id || 0),
			profileName: String(customer?.profile?.title || ""),
			taxName: String(taxProfile?.tax?.title || ""),
			taxCode: String(taxProfile?.tax?.taxCode || ""),
			billingAddressId:
				addressBook?.id == null ? null : Number(addressBook.id || 0),
			shippingAddressId:
				addressBook?.id == null ? null : Number(addressBook.id || 0),
			shippingAddress: shippingLines.join(", "),
			shippingAddressLines: shippingLines,
			isBusiness: businessName.length > 0,
		};
	};

	if (data.recent && !query) {
		const recentCustomerLimit = Math.max(data.limit * 3, data.limit + 10);
		const recentCustomerGroups = await ctx.db.salesOrders.groupBy({
			by: ["customerId"],
			take: recentCustomerLimit,
			where: {
				deletedAt: null,
				customerId: {
					not: null,
				},
				type: data.type || undefined,
			},
			_max: {
				updatedAt: true,
			},
			orderBy: {
				_max: {
					updatedAt: "desc",
				},
			},
		});
		const customerIds = recentCustomerGroups
			.map((group) => Number(group.customerId || 0))
			.filter((customerId) => customerId > 0);
		if (!customerIds.length) return [];
		const customers = await ctx.db.customers.findMany({
			where: {
				dealerOwnerId: null,
				deletedAt: null,
				id: {
					in: customerIds,
				},
			},
			select: {
				id: true,
				name: true,
				businessName: true,
				phoneNo: true,
				email: true,
				profile: {
					select: {
						id: true,
						title: true,
					},
				},
				taxProfiles: {
					take: 1,
					select: {
						tax: {
							select: {
								title: true,
								taxCode: true,
							},
						},
					},
				},
				addressBooks: {
					take: 1,
					orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
					select: {
						id: true,
						name: true,
						address1: true,
						address2: true,
						city: true,
						state: true,
						country: true,
						phoneNo: true,
						email: true,
						meta: true,
						isPrimary: true,
					},
				},
			},
		});
		const customerById = new Map(
			customers.map((customer) => [Number(customer.id || 0), customer]),
		);
		return customerIds
			.map((customerId) => customerById.get(customerId))
			.filter((customer): customer is NonNullable<typeof customer> =>
				Boolean(customer),
			)
			.slice(0, data.limit)
			.map(mapCustomerResult);
	}

	const customers = await ctx.db.customers.findMany({
		take: data.limit,
		distinct: ["id"],
		where: {
			dealerOwnerId: null,
			deletedAt: null,
			OR: [
				{ name: { contains: query } },
				{ businessName: { contains: query } },
				{ phoneNo: { contains: query } },
				{ email: { contains: query } },
				{ address: { contains: query } },
				{
					addressBooks: {
						some: {
							OR: [
								{ name: { contains: query } },
								{ address1: { contains: query } },
								{ address2: { contains: query } },
								{ city: { contains: query } },
								{ state: { contains: query } },
								{ country: { contains: query } },
								{ phoneNo: { contains: query } },
								{ email: { contains: query } },
							],
						},
					},
				},
			],
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			phoneNo: true,
			email: true,
			profile: {
				select: {
					id: true,
					title: true,
				},
			},
			taxProfiles: {
				take: 1,
				select: {
					tax: {
						select: {
							title: true,
							taxCode: true,
						},
					},
				},
			},
			addressBooks: {
				take: 1,
				orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
				select: {
					id: true,
					name: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
					phoneNo: true,
					email: true,
					meta: true,
					isPrimary: true,
				},
			},
		},
	});
	return customers.map(mapCustomerResult);
}

export async function getNewSalesFormShelfCategories(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfCategoriesSchema,
) {
	getNewSalesFormShelfCategoriesSchema.parse(input);
	return ctx.db.dykeShelfCategories.findMany({
		where: {
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			type: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ type: "asc" }, { name: "asc" }],
	});
}

async function activeShelfCategoryIds(ctx: TRPCContext) {
	const categories = await ctx.db.dykeShelfCategories.findMany({
		where: {
			deletedAt: null,
		},
		select: {
			id: true,
			categoryId: true,
			parentCategoryId: true,
		},
	});
	const byId = new Map(
		categories
			.map((category) => [Number(category.id || 0), category] as const)
			.filter(([id]) => id > 0),
	);
	const memo = new Map<number, boolean>();
	const hasActiveAncestors = (
		id: number,
		visiting = new Set<number>(),
	): boolean => {
		const cached = memo.get(id);
		if (cached != null) return cached;
		const category = byId.get(id);
		if (!category || visiting.has(id)) return false;
		const parentId =
			Number(category.parentCategoryId || 0) ||
			Number(category.categoryId || 0);
		if (!parentId || parentId === id) {
			memo.set(id, true);
			return true;
		}
		const nextVisiting = new Set(visiting).add(id);
		const active = hasActiveAncestors(parentId, nextVisiting);
		memo.set(id, active);
		return active;
	};
	return Array.from(byId.keys()).filter((id) => hasActiveAncestors(id));
}

async function activeShelfProductWhere(ctx: TRPCContext) {
	const activeCategoryIds = await activeShelfCategoryIds(ctx);
	return {
		deletedAt: null,
		AND: [
			{
				OR: [
					{
						categoryId: null,
					},
					{
						categoryId: {
							in: activeCategoryIds,
						},
					},
				],
			},
			{
				OR: [
					{
						parentCategoryId: null,
					},
					{
						parentCategoryId: {
							in: activeCategoryIds,
						},
					},
				],
			},
		],
	};
}

export async function getNewSalesFormShelfProducts(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfProductsSchema,
) {
	const payload = getNewSalesFormShelfProductsSchema.parse(input);
	if (!payload.categoryIds.length) return [];
	const visibilityWhere = await activeShelfProductWhere(ctx);
	const products = await ctx.db.dykeShelfProducts.findMany({
		where: {
			...visibilityWhere,
			OR: [
				{
					categoryId: {
						in: payload.categoryIds,
					},
				},
				{
					parentCategoryId: {
						in: payload.categoryIds,
					},
				},
			],
		},
		select: {
			id: true,
			title: true,
			img: true,
			unitPrice: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ title: "asc" }],
	});
	const categories = await shelfCategoryRowsForProducts(ctx, products);
	return products.map((product) => ({
		...product,
		categoryPath: shelfCategoryPathForProduct(product, categories),
	}));
}

export async function getNewSalesFormShelfProductIndex(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfProductIndexSchema,
) {
	getNewSalesFormShelfProductIndexSchema.parse(input);
	const visibilityWhere = await activeShelfProductWhere(ctx);
	const products = await ctx.db.dykeShelfProducts.findMany({
		where: visibilityWhere,
		select: {
			id: true,
			title: true,
			unitPrice: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ title: "asc" }],
	});
	const categories = await shelfCategoryRowsForProducts(ctx, products);
	return products.map((product) => ({
		...product,
		categoryPath: shelfCategoryPathForProduct(product, categories),
	}));
}

async function shelfCategoryRowsForProducts(
	ctx: TRPCContext,
	products: Array<{
		categoryId?: number | null;
		parentCategoryId?: number | null;
	}>,
) {
	const categoryIds = Array.from(
		new Set(
			products
				.flatMap((product) => [
					Number(product?.parentCategoryId || 0),
					Number(product?.categoryId || 0),
				])
				.filter((id) => id > 0),
		),
	);
	if (!categoryIds.length) return [];
	const categories = await ctx.db.dykeShelfCategories.findMany({
		where: {
			deletedAt: null,
			id: {
				in: categoryIds,
			},
		},
		select: {
			id: true,
			name: true,
			type: true,
			categoryId: true,
			parentCategoryId: true,
		},
	});
	const loadedIds = new Set(
		categories.map((category) => Number(category?.id || 0)),
	);
	const parentIds = Array.from(
		new Set(
			categories
				.flatMap((category) => [
					Number(category?.parentCategoryId || 0),
					Number(category?.categoryId || 0),
				])
				.filter((id) => id > 0 && !loadedIds.has(id)),
		),
	);
	if (!parentIds.length) return categories;
	const parents = await ctx.db.dykeShelfCategories.findMany({
		where: {
			deletedAt: null,
			id: {
				in: parentIds,
			},
		},
		select: {
			id: true,
			name: true,
			type: true,
			categoryId: true,
			parentCategoryId: true,
		},
	});
	return [...categories, ...parents];
}

function shelfCategoryPathForProduct(
	product: {
		categoryId?: number | null;
		parentCategoryId?: number | null;
	},
	categories: Array<{
		id?: number | null;
		name?: string | null;
		categoryId?: number | null;
		parentCategoryId?: number | null;
	}>,
) {
	const byId = new Map(
		categories
			.map((category) => [Number(category?.id || 0), category] as const)
			.filter(([id]) => id > 0),
	);
	const child = byId.get(Number(product.categoryId || 0));
	const parentId =
		Number(product.parentCategoryId || 0) ||
		Number(child?.parentCategoryId || 0) ||
		Number(child?.categoryId || 0) ||
		0;
	return [byId.get(parentId), child]
		.filter(
			(category, index, list) =>
				category &&
				Number(category.id || 0) > 0 &&
				list.findIndex(
					(entry) => Number(entry?.id || 0) === Number(category.id || 0),
				) === index,
		)
		.map((category) => ({
			id: category?.id,
			name: category?.name,
		}));
}

export async function getNewSalesFormShelfProductDetails(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfProductDetailsSchema,
) {
	const payload = getNewSalesFormShelfProductDetailsSchema.parse(input);
	const ids = payload.ids.filter(
		(id, index, list) => id > 0 && list.indexOf(id) === index,
	);
	if (!ids.length) return [];
	const visibilityWhere = await activeShelfProductWhere(ctx);
	const products = await ctx.db.dykeShelfProducts.findMany({
		where: {
			...visibilityWhere,
			id: {
				in: ids,
			},
		},
		select: {
			id: true,
			title: true,
			img: true,
			unitPrice: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ title: "asc" }],
	});
	const categories = await shelfCategoryRowsForProducts(ctx, products);
	return products.map((product) => ({
		...product,
		categoryPath: shelfCategoryPathForProduct(product, categories),
	}));
}

async function getRecentShelfProducts(
	ctx: TRPCContext,
	visibilityWhere: any,
	productSelect: any,
	limit: number,
) {
	if (limit <= 0) return [];

	const products: any[] = [];
	const seenProductIds = new Set<number>();
	const batchSize = Math.max(limit * 4, 25);
	let skip = 0;

	while (products.length < limit) {
		const recentRows = await ctx.db.dykeSalesShelfItem.findMany({
			where: {
				deletedAt: null,
				productId: {
					not: null,
				},
			},
			select: {
				productId: true,
			},
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			take: batchSize,
			skip,
		});

		if (!recentRows.length) break;

		const candidateIds = recentRows
			.map((row) => Number(row?.productId || 0))
			.filter((id) => {
				if (id <= 0 || seenProductIds.has(id)) return false;
				seenProductIds.add(id);
				return true;
			});

		const visibleProducts = candidateIds.length
			? await ctx.db.dykeShelfProducts.findMany({
					where: {
						...visibilityWhere,
						id: {
							in: candidateIds,
						},
					},
					select: productSelect,
				})
			: [];
		const visibleProductById = new Map(
			visibleProducts.map(
				(product) => [Number(product?.id || 0), product] as const,
			),
		);

		for (const id of candidateIds) {
			const product = visibleProductById.get(id);
			if (product) products.push(product);
			if (products.length >= limit) break;
		}

		if (recentRows.length < batchSize) break;
		skip += recentRows.length;
	}

	if (products.length < limit) {
		const fallbackRows = await ctx.db.dykeShelfProducts.findMany({
			where: {
				...visibilityWhere,
				id: {
					notIn: Array.from(seenProductIds),
				},
			},
			select: productSelect,
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			take: limit - products.length,
		});
		products.push(...fallbackRows);
	}

	return products.slice(0, limit);
}

export async function updateNewSalesFormShelfProduct(
	ctx: TRPCContext,
	input: UpdateNewSalesFormShelfProductSchema,
) {
	const payload = updateNewSalesFormShelfProductSchema.parse(input);
	return ctx.db.dykeShelfProducts.update({
		where: {
			id: payload.id,
		},
		data: {
			title: payload.title,
			unitPrice:
				payload.unitPrice == null ? null : Number(payload.unitPrice || 0),
		},
		select: {
			id: true,
			title: true,
			img: true,
			unitPrice: true,
			categoryId: true,
			parentCategoryId: true,
		},
	});
}

export async function deleteNewSalesFormShelfProduct(
	ctx: TRPCContext,
	input: DeleteNewSalesFormShelfProductSchema,
) {
	const payload = deleteNewSalesFormShelfProductSchema.parse(input);
	return ctx.db.dykeShelfProducts.update({
		where: {
			id: payload.id,
		},
		data: {
			deletedAt: new Date(),
		},
		select: {
			id: true,
		},
	});
}

export async function searchNewSalesFormShelfProducts(
	ctx: TRPCContext,
	input: SearchNewSalesFormShelfProductsSchema,
) {
	const payload = searchNewSalesFormShelfProductsSchema.parse(input);
	const query = payload.query.trim();
	const limit = query ? payload.limit : Math.min(payload.limit, 15);
	const visibilityWhere = await activeShelfProductWhere(ctx);
	const productSelect = {
		id: true,
		title: true,
		img: true,
		unitPrice: true,
		categoryId: true,
		parentCategoryId: true,
	} as const;
	if (query) {
		const candidateTerms = shelfProductSearchCandidateTerms(query);
		const exactCandidatesPromise = candidateTerms.length
			? ctx.db.dykeShelfProducts.findMany({
					where: {
						...visibilityWhere,
						title: {
							equals: query,
						},
					},
					select: productSelect,
					take: 1,
				})
			: Promise.resolve([]);
		const phraseCandidatesPromise =
			candidateTerms.length > 1
				? ctx.db.dykeShelfProducts.findMany({
						where: {
							...visibilityWhere,
							title: {
								contains: query,
							},
						},
						select: productSelect,
						orderBy: [{ title: "asc" }],
						take: 100,
					})
				: Promise.resolve([]);
		const matchingCategories = candidateTerms.length
			? await ctx.db.dykeShelfCategories.findMany({
					where: {
						deletedAt: null,
						OR: candidateTerms.map((term) => ({
							name: {
								contains: term,
							},
						})),
					},
					select: {
						id: true,
						name: true,
					},
				})
			: [];
		const matchingCategoryIds = matchingCategories
			.map((category) => Number(category.id || 0))
			.filter((id) => id > 0);
		const descendantCategories = matchingCategoryIds.length
			? await ctx.db.dykeShelfCategories.findMany({
					where: {
						deletedAt: null,
						OR: [
							{ parentCategoryId: { in: matchingCategoryIds } },
							{ categoryId: { in: matchingCategoryIds } },
						],
					},
					select: {
						id: true,
						categoryId: true,
						parentCategoryId: true,
					},
				})
			: [];
		const categoryIdsByTerm = new Map(
			candidateTerms.map((term) => {
				const directIds = matchingCategories
					.filter((category) =>
						normalizeShelfProductSearchQuery(category.name).includes(term),
					)
					.map((category) => Number(category.id || 0))
					.filter((id) => id > 0);
				const directIdSet = new Set(directIds);
				const descendantIds = descendantCategories
					.filter(
						(category) =>
							directIdSet.has(Number(category.parentCategoryId || 0)) ||
							directIdSet.has(Number(category.categoryId || 0)),
					)
					.map((category) => Number(category.id || 0))
					.filter((id) => id > 0);
				return [
					term,
					Array.from(new Set([...directIds, ...descendantIds])),
				] as const;
			}),
		);
		const activeAnd = Array.isArray(visibilityWhere.AND)
			? visibilityWhere.AND
			: [];
		const termClauses = candidateTerms.map((term) => {
			const categoryIds = categoryIdsByTerm.get(term) || [];
			return {
				OR: [
					{
						title: {
							contains: term,
						},
					},
					...(categoryIds.length
						? [
								{ categoryId: { in: categoryIds } },
								{ parentCategoryId: { in: categoryIds } },
							]
						: []),
				],
			};
		});
		const titleAnchorGroups =
			shelfProductSearchCandidateTitleAnchorGroups(query);
		const lexicalTermClauses = termClauses.filter(
			(_clause, index) => !/^\d+$/.test(candidateTerms[index] || ""),
		);
		const [
			exactCandidates,
			phraseCandidates,
			structuredCandidates,
			coarseCandidates,
		] = await Promise.all([
			exactCandidatesPromise,
			phraseCandidatesPromise,
			titleAnchorGroups.length
				? ctx.db.dykeShelfProducts.findMany({
						where: {
							...visibilityWhere,
							AND: [
								...activeAnd,
								...lexicalTermClauses,
								...titleAnchorGroups.map((anchors) => ({
									OR: anchors.map((anchor) => ({
										title: {
											contains: anchor,
										},
									})),
								})),
							],
						},
						select: productSelect,
						orderBy: [{ title: "asc" }],
						take: 250,
					})
				: Promise.resolve([]),
			candidateTerms.length
				? ctx.db.dykeShelfProducts.findMany({
						where: {
							...visibilityWhere,
							AND: [...activeAnd, ...termClauses],
						},
						select: productSelect,
						orderBy: [{ title: "asc" }],
						take: Math.min(250, Math.max(100, limit * 8)),
					})
				: Promise.resolve([]),
		]);
		const candidates = Array.from(
			new Map(
				[
					...exactCandidates,
					...phraseCandidates,
					...structuredCandidates,
					...coarseCandidates,
				].map((product) => [Number(product.id || 0), product] as const),
			).values(),
		);
		const candidateIds = new Set(
			candidates.map((product) => Number(product.id || 0)),
		);
		const missingSelectedIds = payload.selectedIds.filter(
			(id, index, list) =>
				id > 0 && list.indexOf(id) === index && !candidateIds.has(id),
		);
		const selectedProducts = missingSelectedIds.length
			? await ctx.db.dykeShelfProducts.findMany({
					where: {
						...visibilityWhere,
						id: {
							in: missingSelectedIds,
						},
					},
					select: productSelect,
				})
			: [];
		const products = [...candidates, ...selectedProducts];
		const categories = await shelfCategoryRowsForProducts(ctx, products);
		const productIndex = products.map((product) => ({
			...product,
			categoryPath: shelfCategoryPathForProduct(product, categories),
		}));
		return searchShelfProductIndex(productIndex, query, {
			limit,
			selectedIds: payload.selectedIds,
		});
	}
	const rows = await getRecentShelfProducts(
		ctx,
		visibilityWhere,
		productSelect,
		limit,
	);
	const rowIds = new Set(rows.map((row) => Number(row?.id || 0)));
	const selectedIds = payload.selectedIds.filter(
		(id, index, list) =>
			id > 0 && list.indexOf(id) === index && !rowIds.has(id),
	);
	const selectedRows = selectedIds.length
		? await ctx.db.dykeShelfProducts.findMany({
				where: {
					...visibilityWhere,
					id: {
						in: selectedIds,
					},
				},
				select: productSelect,
				orderBy: [{ title: "asc" }],
			})
		: [];
	const products = [...rows, ...selectedRows].filter(
		(product, index, list) =>
			Number(product?.id || 0) > 0 &&
			list.findIndex(
				(entry) => Number(entry?.id || 0) === Number(product?.id || 0),
			) === index,
	);
	const categories = await shelfCategoryRowsForProducts(ctx, products);
	return products.map((product) => ({
		...product,
		categoryPath: shelfCategoryPathForProduct(product, categories),
	}));
}

type ServiceSuggestionEntry = {
	service: string;
	unitPrice: number;
	usageCount: number;
	lastUsedAt: string | null;
	sortTime: number;
};

function normalizeServiceSuggestionName(value: unknown) {
	return String(value || "")
		.trim()
		.replace(/\s+/g, " ")
		.toUpperCase();
}

function serviceSuggestionPrice(...values: unknown[]) {
	for (const value of values) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return 0;
}

function addServiceSuggestion(
	suggestions: Map<string, ServiceSuggestionEntry>,
	serviceValue: unknown,
	unitPrice: number,
	usedAt: Date,
	query: string,
) {
	const service = normalizeServiceSuggestionName(serviceValue);
	if (!service) return;
	if (query && !service.includes(query)) return;
	const sortTime = usedAt.getTime();
	const existing = suggestions.get(service);
	if (!existing) {
		suggestions.set(service, {
			service,
			unitPrice,
			usageCount: 1,
			lastUsedAt: usedAt.toISOString(),
			sortTime,
		});
		return;
	}
	existing.usageCount += 1;
	if (sortTime >= existing.sortTime) {
		existing.unitPrice = unitPrice;
		existing.lastUsedAt = usedAt.toISOString();
		existing.sortTime = sortTime;
	}
}

function serviceRowsFromLineMeta(line: { meta?: unknown }) {
	const rows = getLineMetaRows(line, "serviceRows");
	return rows.map((row) => safeRecord(row));
}

export async function searchNewSalesFormServiceSuggestions(
	ctx: TRPCContext,
	input: SearchNewSalesFormServiceSuggestionsSchema,
) {
	const payload = searchNewSalesFormServiceSuggestionsSchema.parse(input);
	const query = normalizeServiceSuggestionName(payload.query);
	const orders = await ctx.db.salesOrders.findMany({
		where: {
			deletedAt: null,
		},
		select: {
			id: true,
			createdAt: true,
			updatedAt: true,
			meta: true,
			items: {
				where: {
					deletedAt: null,
				},
				select: {
					description: true,
					dykeProduction: true,
					meta: true,
					multiDykeUid: true,
					qty: true,
					rate: true,
					total: true,
				},
			},
		},
		orderBy: [{ updatedAt: "desc" }],
		take: 150,
	});
	const suggestions = new Map<string, ServiceSuggestionEntry>();

	for (const order of orders) {
		const usedAt = order.updatedAt || order.createdAt || new Date();
		const orderMeta = safeRecord(order.meta);
		const persistedForm = safeRecord(orderMeta.newSalesForm);
		const persistedLines = Array.isArray(persistedForm.lineItems)
			? persistedForm.lineItems
			: [];
		let foundPersistedServiceRows = false;

		for (const line of persistedLines) {
			const lineRecord = safeRecord(line);
			for (const row of serviceRowsFromLineMeta(lineRecord)) {
				foundPersistedServiceRows = true;
				addServiceSuggestion(
					suggestions,
					row.service ?? row.description,
					serviceSuggestionPrice(row.unitPrice, row.rate, row.salesPrice),
					usedAt,
					query,
				);
			}
		}

		if (foundPersistedServiceRows) continue;

		for (const item of order.items || []) {
			const itemMeta = safeRecord(item.meta);
			const nestedMeta = safeRecord(itemMeta.meta);
			const nestedRows = Array.isArray(nestedMeta.serviceRows)
				? nestedMeta.serviceRows.map((row) => safeRecord(row))
				: [];
			if (nestedRows.length) {
				for (const row of nestedRows) {
					addServiceSuggestion(
						suggestions,
						row.service ?? row.description,
						serviceSuggestionPrice(row.unitPrice, row.rate, row.salesPrice),
						usedAt,
						query,
					);
				}
				continue;
			}
			const looksLikeLegacyService =
				itemMeta.tax != null ||
				Boolean(item.dykeProduction) ||
				String(item.multiDykeUid || "")
					.toLowerCase()
					.includes("service");
			if (!looksLikeLegacyService) continue;
			addServiceSuggestion(
				suggestions,
				item.description,
				serviceSuggestionPrice(item.rate, item.total),
				usedAt,
				query,
			);
		}
	}

	return Array.from(suggestions.values())
		.sort((a, b) => {
			if (query) {
				const aStarts = a.service.startsWith(query) ? 0 : 1;
				const bStarts = b.service.startsWith(query) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
			}
			return b.sortTime - a.sortTime || b.usageCount - a.usageCount;
		})
		.slice(0, payload.limit)
		.map((suggestion) => ({
			service: suggestion.service,
			unitPrice: suggestion.unitPrice,
			usageCount: suggestion.usageCount,
			lastUsedAt: suggestion.lastUsedAt,
		}));
}

export async function recalculateNewSalesForm(
	ctx: TRPCContext,
	input: RecalculateNewSalesFormSchema,
) {
	const data = recalculateNewSalesFormSchema.parse(input);
	const setting = await ctx.db.settings.findFirst({
		where: {
			type: "sales-settings",
		},
		select: {
			meta: true,
		},
	});
	const settings = deriveNewSalesFormSettings(setting?.meta);
	const summary = recalculateSummary({
		...data,
		cccPercentage: settings.cccPercentage,
	});
	return displayOrderSummary(storedOrderSummary(summary), {
		paymentMethod: data.paymentMethod,
		cccPercentage: settings.cccPercentage,
	});
}

export async function resolveNewSalesCustomer(
	ctx: TRPCContext,
	input: ResolveNewSalesCustomerSchema,
) {
	const payload = resolveNewSalesCustomerSchema.parse(input);
	const customer = await ctx.db.customers.findFirst({
		where: {
			id: payload.customerId,
			dealerOwnerId: null,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (!customer) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Dealer-owned customers cannot be used for office-origin sales.",
		});
	}
	return getSalesCustomer(ctx, {
		customerId: payload.customerId,
		billingId: payload.billingId,
		shippingId: payload.shippingId,
	});
}

async function saveNewSalesFormInternal(
	ctx: TRPCContext,
	payload: SaveDraftNewSalesFormSchema | SaveFinalNewSalesFormSchema,
	status: string,
	origin?: {
		salesChannel?: string;
		storefrontCheckoutId?: string;
		storefrontPricing?: unknown;
		storefrontInquiryId?: string;
		storefrontInquiryReference?: string;
	},
) {
	const newDraftKey =
		!payload.salesId &&
		!payload.slug &&
		String(payload.version || "").startsWith("new-")
			? String(payload.version)
			: null;
	if (newDraftKey) {
		const existingDraft = await ctx.db.salesOrders.findFirst({
			where: {
				type: payload.type,
				deletedAt: null,
				dealerAuthId: null,
				meta: {
					path: "$.newSalesForm.draftKey",
					equals: newDraftKey,
				},
			},
			select: {
				id: true,
				slug: true,
				meta: true,
			},
		});
		if (existingDraft) {
			payload = {
				...payload,
				salesId: existingDraft.id,
				slug: existingDraft.slug,
				version:
					safeMeta(existingDraft.meta).newSalesForm?.version ?? payload.version,
			};
		}
	}
	if (payload.salesId || payload.slug) {
		const dealerSale = await ctx.db.salesOrders.findFirst({
			where: {
				id: payload.salesId || undefined,
				slug: payload.slug || undefined,
				dealerAuthId: { not: null },
				deletedAt: null,
			},
			select: { id: true },
		});
		if (dealerSale) {
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			await assertDealerSaleOfficeAccess(ctx.db, ctx.userId, dealerSale.id);
		}
	}
	const activitySenderContactId =
		payload.salesId || payload.slug
			? ctx.userId
				? await getSalesActivitySenderContactId(ctx.db, ctx.userId)
				: null
			: null;
	const normalizedLines = normalizeLineItems(payload.lineItems).map((line) => {
		const doors = line.housePackageTool?.doors || [];
		return !doors.length
			? line
			: {
					...line,
					housePackageTool: {
						...line.housePackageTool!,
						doors: doors.map((door) => ({
							...door,
							dimension: normalizeSalesDoorDimension(door.dimension),
						})),
					},
				};
	});
	assertUniqueDurableSalesFormIds(normalizedLines, payload.extraCosts);
	for (const line of normalizedLines) {
		const duplicates = findDuplicateSalesDoorIdentities(
			line.housePackageTool?.doors || [],
		);
		if (duplicates.length) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Duplicate door component and size: ${duplicates.join(", ")}. Remove the duplicate row before saving.`,
			});
		}
	}
	const legacySaveLines = normalizedLines.flatMap((line) =>
		expandGroupedLineForLegacySave(line),
	);
	const lineOrderByUid = new Map(
		normalizedLines.map((line, index) => [line.uid, index]),
	);
	const setting = await ctx.db.settings.findFirst({
		where: {
			type: "sales-settings",
		},
		select: {
			meta: true,
		},
	});
	const settings = deriveNewSalesFormSettings(setting?.meta);
	const summary = recalculateSummary({
		taxRate: payload.summary.taxRate,
		extraCosts: payload.extraCosts.map((cost) => ({
			type: cost.type,
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable ?? false,
		})),
		lineItems: normalizedLines,
		paymentMethod: payload.meta.paymentMethod || null,
		cccPercentage: settings.cccPercentage,
	});
	const persistedSummary = storedOrderSummary(summary);
	const [revisionCustomer, revisionProfile, revisionBilling, revisionShipping] =
		await Promise.all([
			payload.meta.customerId
				? ctx.db.customers.findFirst({
						where: { id: payload.meta.customerId, deletedAt: null },
						select: {
							id: true,
							name: true,
							businessName: true,
							email: true,
							phoneNo: true,
							phoneNo2: true,
							address: true,
						},
					})
				: null,
			payload.meta.customerProfileId
				? ctx.db.customerTypes.findFirst({
						where: { id: payload.meta.customerProfileId, deletedAt: null },
						select: {
							id: true,
							title: true,
							coefficient: true,
							salesPercentage: true,
						},
					})
				: null,
			payload.meta.billingAddressId
				? ctx.db.addressBooks.findFirst({
						where: { id: payload.meta.billingAddressId, deletedAt: null },
						select: {
							id: true,
							name: true,
							address1: true,
							address2: true,
							city: true,
							state: true,
							country: true,
							email: true,
							phoneNo: true,
						},
					})
				: null,
			payload.meta.shippingAddressId
				? ctx.db.addressBooks.findFirst({
						where: { id: payload.meta.shippingAddressId, deletedAt: null },
						select: {
							id: true,
							name: true,
							address1: true,
							address2: true,
							city: true,
							state: true,
							country: true,
							email: true,
							phoneNo: true,
						},
					})
				: null,
		]);
	const specialOrderRevision = buildSpecialOrderCustomerVisibleRevision({
		customer: revisionCustomer,
		customerProfile: revisionProfile,
		billingAddress: revisionBilling,
		shippingAddress: revisionShipping,
		orderDate: payload.meta.createdAt,
		lineItems: normalizedLines,
		extraCosts: payload.extraCosts,
		summary: persistedSummary,
	});
	const displayCcc = resolveSalesDisplayCcc({
		baseTotal: persistedSummary.grandTotal,
		paymentMethod: payload.meta.paymentMethod || null,
		cccPercentage: settings.cccPercentage,
	});
	const transactionResult = await ctx.db.$transaction(
		async (tx) => {
			const isNew = !(payload.salesId || payload.slug);
			let currentId = payload.salesId || null;
			const persistedLineItemIds = new Map<string, number>();
			const retainedSalesItemIds = new Set<number>();
			const retainedStepIds = new Set<number>();
			const retainedShelfIds = new Set<number>();
			const retainedHptIds = new Set<number>();
			const retainedDoorIds = new Set<number>();
			const persistedExtraCosts: NewSalesFormExtraCost[] = [];
			let order = null as null | {
				id: number;
				slug: string;
				orderId: string;
				status: string | null;
				meta: unknown;
				inventoryStatus: string | null;
				specialOrderDeclaration: "NO" | "YES" | null;
				specialOrderStatus:
					| "NOT_REQUIRED"
					| "SIGNATURE_PENDING"
					| "CUSTOMER_APPROVED"
					| "REAPPROVAL_REQUIRED"
					| "CUSTOMER_DECLINED"
					| null;
				specialOrderRevision: string | null;
				currentSpecialOrderApprovalId: string | null;
				currentSpecialOrderRequestId: string | null;
				updatedAt: Date | null;
				createdAt: Date | null;
				paymentTerm: string | null;
				paymentDueDate: Date | null;
				goodUntil: Date | null;
				prodDueDate: Date | null;
				customerId: number | null;
				dealerAuthId: number | null;
				salesChannel: string | null;
				payments: { amount: number | null; status: string | null }[];
				grandTotal: number | null;
				items: Array<{
					id: number;
					multiDykeUid: string | null;
					description: string | null;
					dykeDescription: string | null;
					qty: number | null;
					total: number | null;
					meta: unknown;
				}>;
			};

			if (payload.salesId || payload.slug) {
				order = await tx.salesOrders.findFirst({
					where: {
						id: payload.salesId || undefined,
						slug: payload.slug || undefined,
						type: payload.type,
						deletedAt: null,
					},
					select: {
						id: true,
						slug: true,
						orderId: true,
						status: true,
						meta: true,
						inventoryStatus: true,
						specialOrderDeclaration: true,
						specialOrderStatus: true,
						specialOrderRevision: true,
						currentSpecialOrderApprovalId: true,
						currentSpecialOrderRequestId: true,
						updatedAt: true,
						createdAt: true,
						paymentTerm: true,
						paymentDueDate: true,
						goodUntil: true,
						prodDueDate: true,
						customerId: true,
						dealerAuthId: true,
						salesChannel: true,
						payments: {
							where: {
								deletedAt: null,
							},
							select: {
								amount: true,
								status: true,
							},
						},
						grandTotal: true,
						items: {
							where: { deletedAt: null },
							orderBy: { id: "asc" },
							select: {
								id: true,
								multiDykeUid: true,
								description: true,
								dykeDescription: true,
								qty: true,
								total: true,
								meta: true,
							},
						},
					},
				});
				if (!order) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Sales form not found for save.",
					});
				}
				currentId = order.id;
			}

			if (order?.dealerAuthId && payload.meta.customerId !== order.customerId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "A dealer-origin order's customer cannot be changed.",
				});
			}
			let selectedCustomer: {
				dealerOwnerId: number | null;
				email: string | null;
			} | null = null;
			if (payload.meta.customerId) {
				selectedCustomer = await tx.customers.findFirst({
					where: {
						id: payload.meta.customerId,
						deletedAt: null,
					},
					select: { dealerOwnerId: true, email: true },
				});
				const editsMatchingDealerOrder =
					Boolean(order?.dealerAuthId) &&
					order?.customerId === payload.meta.customerId;
				if (
					!selectedCustomer ||
					(selectedCustomer.dealerOwnerId && !editsMatchingDealerOrder)
				) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"Dealer-owned customers cannot be used for office-origin sales.",
					});
				}
			}

			const isInternalDashboardOrder = !origin && !order?.dealerAuthId;
			const enrollmentAccess = isInternalDashboardOrder
				? await getSpecialOrderEnrollmentAccess(
						tx as unknown as TRPCContext["db"],
						ctx.userId ?? null,
					)
				: { canEnroll: true };
			const actorCanEnrollSpecialOrder = enrollmentAccess.canEnroll;
			const currentSpecialOrderDeclaration =
				order?.specialOrderDeclaration ?? null;
			const nextSpecialOrderDeclaration =
				payload.type !== "order"
					? null
					: payload.specialOrderDeclaration === undefined
						? currentSpecialOrderDeclaration
						: payload.specialOrderDeclaration;
			const enrollmentValidation = validateSpecialOrderEnrollment({
				currentDeclaration: currentSpecialOrderDeclaration,
				nextDeclaration: nextSpecialOrderDeclaration,
				canEnroll: !isInternalDashboardOrder || actorCanEnrollSpecialOrder,
			});
			if (!enrollmentValidation.allowed) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"SPECIAL_ORDER_ENROLLMENT_RESTRICTED: Only Super Admin can mark an order as Special Order during the pilot.",
				});
			}
			const declarationValidation = validateSpecialOrderDeclaration({
				type: payload.type,
				commitIntent: payload.commitIntent,
				declaration: nextSpecialOrderDeclaration,
				isInternalDashboardOrder,
				canEnroll: actorCanEnrollSpecialOrder,
			});
			if (!declarationValidation.valid) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"SPECIAL_ORDER_DECLARATION_REQUIRED: Choose Yes or No for Special Order before completing this sale.",
				});
			}
			if (
				requiresSpecialOrderCustomerEmail({
					declaration: nextSpecialOrderDeclaration,
					customerEmail: selectedCustomer?.email,
					commitIntent: payload.commitIntent,
				})
			) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED: Add a valid customer email before saving this Special Order.",
				});
			}
			const manuallyEnrolledExistingOrder =
				Boolean(order) &&
				isInternalDashboardOrder &&
				currentSpecialOrderDeclaration !== "YES" &&
				nextSpecialOrderDeclaration === "YES";
			const specialOrderTransition = deriveSpecialOrderRevisionTransition({
				declaration: nextSpecialOrderDeclaration,
				currentRevision: order?.specialOrderRevision,
				nextRevision: specialOrderRevision,
				currentApprovalId: order?.currentSpecialOrderApprovalId,
				currentStatus: order?.specialOrderStatus,
			});
			const nextCurrentSpecialOrderApprovalId =
				specialOrderTransition.nextApprovalId;
			const specialOrderRevisionChanged =
				specialOrderTransition.revisionChanged;
			const hadCustomerEvidence = specialOrderTransition.hadCustomerEvidence;
			const nextSpecialOrderStatus = specialOrderTransition.nextStatus;
			if (order && specialOrderRevisionChanged) {
				await tx.specialOrderApprovalRequest.updateMany({
					where: { salesOrderId: order.id, status: "ACTIVE" },
					data: {
						status: "REVOKED",
						revokedAt: new Date(),
						revokedReason: "ORDER_REVISION_CHANGED",
					},
				});
				if (order.currentSpecialOrderApprovalId) {
					await tx.specialOrderApprovalEvidence.updateMany({
						where: { id: order.currentSpecialOrderApprovalId },
						data: {
							supersededAt: new Date(),
							supersededReason: "Order revision changed",
							supersededByUserId: ctx.userId ?? null,
						},
					});
				}
			}

			const currentMeta = safeMeta(order?.meta);
			const currentVersion = order
				? currentMeta.newSalesForm?.version ||
					`${order.updatedAt?.getTime() || order.createdAt?.getTime() || 0}-legacy`
				: null;
			if (order && !payload.version) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This sales document must be reloaded before it can be saved.",
				});
			}
			if (
				currentVersion &&
				payload.version &&
				currentVersion !== payload.version
			) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This form changed elsewhere. Reload the latest version before saving.",
				});
			}
			if (
				order &&
				hasUnprojectedApprovedCommercialSnapshot(currentMeta, order.items)
			) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"SALES_RELATIONAL_REVIEW_REQUIRED: An approved adjustment was not projected into the relational sales rows. This document is locked until the migration review reconciles it.",
				});
			}
			let canonicalBefore: Awaited<ReturnType<typeof getNewSalesForm>> | null =
				null;
			if (
				order &&
				(payload.type === "order" || !currentMeta.newSalesForm?.form)
			) {
				canonicalBefore = await getNewSalesForm(
					{
						...ctx,
						db: tx as unknown as TRPCContext["db"],
					},
					{ type: payload.type, slug: order.slug },
				);
			}
			if (
				order &&
				canonicalBefore &&
				isLegacyPoOnlySave({
					currentMeta,
					currentStatus: order.status,
					nextStatus: status,
					payload,
					before: canonicalBefore,
					normalizedLines,
					persistedSummary,
					cccPercentage: settings.cccPercentage,
				})
			) {
				await tx.salesOrders.update({
					where: { id: order.id },
					data: {
						meta: {
							...currentMeta,
							po: normalizedPo(payload.meta.po),
						} as any,
					},
				});
				return {
					salesId: order.id,
					slug: order.slug,
					orderId: order.orderId,
					type: payload.type,
					isNew: false,
					_saveScope: "legacy-po-only" as const,
				};
			}
			const saveCommitments =
				order && payload.type === "order"
					? await getNewSalesFormCommitmentSnapshot(
							tx as unknown as TRPCContext["db"],
							order.id,
						)
					: null;
			if (
				order &&
				payload.type === "order" &&
				saveCommitments &&
				canonicalBefore
			) {
				const analysis = analyzeSalesFormChange({
					before: {
						lineItems: canonicalBefore.lineItems,
						summary: {
							grandTotal: canonicalBefore.summary.grandTotal,
						},
					},
					after: { lineItems: normalizedLines, summary: persistedSummary },
					commitments: saveCommitments,
				});
				if (analysis.requiresSalesRepApproval) {
					const approved = payload.approvedAdjustmentId
						? await tx.salesOrderAdjustment.findFirst({
								where: {
									id: payload.approvedAdjustmentId,
									salesOrderId: order.id,
									status: { in: ["APPROVED", "APPLYING"] },
									sourceVersion: currentVersion || null,
								},
								select: {
									id: true,
									proposedGrandTotal: true,
									proposedSnapshot: true,
								},
							})
						: null;
					const approvedSnapshot = safeRecord(approved?.proposedSnapshot);
					const approvedLines = Array.isArray(approvedSnapshot.lineItems)
						? approvedSnapshot.lineItems.map((line) => safeRecord(line))
						: [];
					const approvedSummary = safeRecord(approvedSnapshot.summary);
					const approvedPayloadDiff = approved
						? analyzeSalesFormChange({
								before: {
									lineItems: approvedLines.map((line) => ({
										id: Number(line.id || 0) || null,
										uid: String(line.uid || ""),
										title: String(
											line.title || line.description || "Line item",
										),
										qty: Number(line.qty || 0),
										lineTotal: Number(line.lineTotal || 0),
									})),
									summary: {
										grandTotal: Number(approvedSummary.grandTotal || 0),
									},
								},
								after: {
									lineItems: normalizedLines,
									summary: persistedSummary,
								},
								commitments: {},
							})
						: null;
					if (
						!approved ||
						Number(approved.proposedGrandTotal) !==
							Number(persistedSummary.grandTotal) ||
						approvedPayloadDiff?.direction !== "NONE"
					) {
						throw new TRPCError({
							code: "PRECONDITION_FAILED",
							message:
								"SALES_CHANGE_REVIEW_REQUIRED: This change creates a refund or affects inbound/allocated material. Review and approve it before saving.",
						});
					}
				}
			}
			const salesProfile = payload.meta.customerProfileId
				? await tx.customerTypes.findFirst({
						where: {
							id: payload.meta.customerProfileId,
						},
						select: {
							coefficient: true,
						},
					})
				: null;
			const salesCoefficient =
				finiteOptionalNumber(salesProfile?.coefficient) ??
				finiteOptionalNumber(currentMeta.salesCoefficient) ??
				finiteOptionalNumber(currentMeta.sales_percentage);

			const nextVersion = `${Date.now()}-${generateRandomString(8)}`;
			const nextCreatedAt = resolveOrderCreatedAt(
				payload.meta.createdAt,
				order?.createdAt,
			);
			const nextPaymentDueDate = resolveOrderPaymentDueDate(
				payload.type,
				payload.meta,
				nextCreatedAt,
			);
			const nextFormMeta = {
				...payload.meta,
				paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
				createdAt: nextCreatedAt.toISOString(),
				paymentDueDate: nextPaymentDueDate?.toISOString() || null,
				goodUntil: safeDate(payload.meta.goodUntil)?.toISOString() || null,
				prodDueDate: safeDate(payload.meta.prodDueDate)?.toISOString() || null,
			};
			const legacyMeta = projectSalesFormMetaToLegacyMeta({
				existingMeta: currentMeta,
				form:
					salesCoefficient == null
						? nextFormMeta
						: {
								...nextFormMeta,
								salesCoefficient,
							},
				summary: {
					...summary,
					ccc: displayCcc.ccc,
				},
				extraCosts: payload.extraCosts,
				cccPercentage: settings.cccPercentage,
			});
			const originMeta = {
				...(origin?.storefrontCheckoutId
					? {
							storefront: {
								checkoutId: origin.storefrontCheckoutId,
								channel: origin.salesChannel || "storefront",
								...(origin.storefrontPricing
									? { pricing: origin.storefrontPricing }
									: {}),
							},
						}
					: {}),
				...(origin?.storefrontInquiryId
					? {
							storefrontInquiry: {
								id: origin.storefrontInquiryId,
								reference: origin.storefrontInquiryReference || null,
								channel: origin.salesChannel || "storefront-custom",
							},
						}
					: {}),
			};
			const nextMeta: NewSalesFormContainer = {
				...legacyMeta,
				...originMeta,
				newSalesForm: {
					version: nextVersion,
					draftKey:
						currentMeta.newSalesForm?.draftKey || newDraftKey || undefined,
					updatedAt: new Date().toISOString(),
					autosave: payload.autosave,
					form: {
						...safeRecord(currentMeta.newSalesForm?.form),
						...nextFormMeta,
						po: legacyMeta.po == null ? null : String(legacyMeta.po),
					},
				},
			};
			const nextAmountDue =
				order?.id != null
					? projectLegacyOrderPayments({
							salesOrderId: order.id,
							grandTotal: persistedSummary.grandTotal,
							payments: order.payments || [],
						}).amountDue
					: persistedSummary.grandTotal;

			if (!order) {
				const identity = await generateSalesIdentity(ctx, payload.type);
				const created = await tx.salesOrders.create({
					data: {
						orderId: identity.orderId,
						slug: origin ? identity.slug : identity.orderId,
						type: payload.type,
						status,
						isDyke: true,
						salesRepId: origin ? null : ctx.userId,
						customerId: payload.meta.customerId || null,
						customerProfileId: payload.meta.customerProfileId || null,
						billingAddressId: payload.meta.billingAddressId || null,
						shippingAddressId: payload.meta.shippingAddressId || null,
						paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
						createdAt: nextCreatedAt,
						paymentDueDate: nextPaymentDueDate,
						goodUntil: safeDate(payload.meta.goodUntil),
						prodDueDate: safeDate(payload.meta.prodDueDate),
						deliveryOption:
							payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
						inventoryStatus:
							payload.type === "order" ? payload.inventoryStatus || null : null,
						specialOrderDeclaration: nextSpecialOrderDeclaration,
						specialOrderStatus: nextSpecialOrderStatus,
						specialOrderRevision:
							nextSpecialOrderDeclaration === "YES"
								? specialOrderRevision
								: null,
						currentSpecialOrderApprovalId: nextCurrentSpecialOrderApprovalId,
						currentSpecialOrderRequestId: null,
						taxPercentage: persistedSummary.taxRate,
						subTotal: persistedSummary.subTotal,
						tax: persistedSummary.taxTotal,
						grandTotal: persistedSummary.grandTotal,
						amountDue: nextAmountDue,
						meta: nextMeta as any,
						salesChannel: origin?.salesChannel || null,
					},
					select: {
						id: true,
						slug: true,
						orderId: true,
					},
				});
				currentId = created.id;
				order = {
					...created,
					status,
					meta: nextMeta,
					inventoryStatus:
						payload.type === "order" ? payload.inventoryStatus || null : null,
					specialOrderDeclaration: nextSpecialOrderDeclaration,
					specialOrderStatus: nextSpecialOrderStatus,
					specialOrderRevision:
						nextSpecialOrderDeclaration === "YES" ? specialOrderRevision : null,
					currentSpecialOrderApprovalId: nextCurrentSpecialOrderApprovalId,
					currentSpecialOrderRequestId: null,
					updatedAt: new Date(),
					createdAt: nextCreatedAt,
					paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
					paymentDueDate: nextPaymentDueDate,
					goodUntil: safeDate(payload.meta.goodUntil),
					prodDueDate: safeDate(payload.meta.prodDueDate),
					customerId: payload.meta.customerId || null,
					dealerAuthId: null,
					salesChannel: origin?.salesChannel || null,
					payments: [],
					grandTotal: persistedSummary.grandTotal,
					items: [],
				};
			} else {
				await tx.salesOrders.update({
					where: {
						id: order.id,
					},
					data: {
						status,
						customerId: payload.meta.customerId || null,
						customerProfileId: payload.meta.customerProfileId || null,
						billingAddressId: payload.meta.billingAddressId || null,
						shippingAddressId: payload.meta.shippingAddressId || null,
						paymentTerm:
							payload.meta.paymentTerm ||
							order.paymentTerm ||
							DEFAULT_PAYMENT_TERM,
						createdAt: nextCreatedAt,
						paymentDueDate: nextPaymentDueDate,
						goodUntil: safeDate(payload.meta.goodUntil),
						prodDueDate: safeDate(payload.meta.prodDueDate),
						deliveryOption:
							payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
						inventoryStatus:
							payload.type === "order"
								? payload.inventoryStatus || order.inventoryStatus || null
								: null,
						specialOrderDeclaration: nextSpecialOrderDeclaration,
						specialOrderStatus: nextSpecialOrderStatus,
						specialOrderRevision:
							nextSpecialOrderDeclaration === "YES"
								? specialOrderRevision
								: null,
						currentSpecialOrderApprovalId: nextCurrentSpecialOrderApprovalId,
						currentSpecialOrderRequestId:
							nextSpecialOrderDeclaration === "YES" &&
							!specialOrderRevisionChanged
								? order.currentSpecialOrderRequestId
								: null,
						taxPercentage: persistedSummary.taxRate,
						subTotal: persistedSummary.subTotal,
						tax: persistedSummary.taxTotal,
						grandTotal: persistedSummary.grandTotal,
						amountDue: nextAmountDue,
						meta: nextMeta as any,
						salesChannel: origin?.salesChannel || order.salesChannel || null,
					},
				});
			}

			if (!currentId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to persist sales form.",
				});
			}
			await tx.dykeSalesDoors.updateMany({
				where: { salesOrderId: currentId, deletedAt: null },
				data: { activeIdentity: null },
			});

			if (legacySaveLines.length) {
				for (const legacyLine of legacySaveLines) {
					const line = legacyLine.line;
					const row = legacyLine.row || {};
					const rowQty =
						legacyLine.kind === "service" || legacyLine.kind === "moulding"
							? Number(row.qty || 0)
							: line.qty;
					const rowUnitPrice =
						legacyLine.kind === "service"
							? Number(row.unitPrice || 0)
							: legacyLine.kind === "moulding"
								? row.customPrice == null || row.customPrice === ""
									? Number(row.salesPrice || 0) + Number(row.addon || 0)
									: Number(row.customPrice || 0) + Number(row.addon || 0)
								: line.unitPrice;
					const rowTotal =
						legacyLine.kind === "service" || legacyLine.kind === "moulding"
							? roundCurrency(
									Number.isFinite(Number(row.lineTotal))
										? Number(row.lineTotal || 0)
										: rowQty * rowUnitPrice,
								)
							: line.lineTotal;
					const rowDescription =
						legacyLine.kind === "service"
							? String(row.service || row.description || "").trim()
							: legacyLine.kind === "moulding"
								? String(row.description || row.title || "Moulding").trim()
								: line.description || line.title;
					const rowUid =
						String(row.uid || "").trim() ||
						(legacyLine.kind ? `${line.uid}-${legacyLine.kind}` : line.uid);
					const itemMeta = {
						uid: rowUid,
						title: line.title,
						description: rowDescription,
						meta: {
							...safeRecord(line.meta),
							itemIndex: lineOrderByUid.get(line.uid) ?? 0,
						},
						...(legacyLine.kind === "service"
							? {
									tax: Boolean(row.taxxable),
								}
							: {}),
					};
					const itemData = {
						salesOrderId: currentId!,
						dykeDescription: line.title || null,
						description: rowDescription,
						qty: rowQty,
						rate: rowUnitPrice,
						total: rowTotal,
						multiDykeUid: legacyLine.groupUid,
						multiDyke: Boolean(legacyLine.primaryGroupItem),
						dykeProduction:
							legacyLine.kind === "service" ? Boolean(row.produceable) : false,
						meta: itemMeta as any,
						deletedAt: null,
					};
					const existingSalesItemId = Number(
						row.salesItemId ||
							(legacyLine.kind && !legacyLine.primaryGroupItem ? 0 : line.id) ||
							0,
					);
					const ownedSalesItemId = order?.items.some(
						(item) => item.id === existingSalesItemId,
					)
						? existingSalesItemId
						: 0;
					const existingSalesItemByUid = order?.items.find((item) => {
						const meta = safeRecord(item.meta);
						return String(meta.uid || "").trim() === rowUid;
					});
					const retainedSalesItemId =
						ownedSalesItemId > 0
							? ownedSalesItemId
							: Number(existingSalesItemByUid?.id || 0);
					const createdItem =
						retainedSalesItemId > 0
							? await tx.salesOrderItems.update({
									where: {
										id: retainedSalesItemId,
									},
									data: itemData,
									select: {
										id: true,
									},
								})
							: await tx.salesOrderItems.create({
									data: itemData,
									select: {
										id: true,
									},
								});
					retainedSalesItemIds.add(createdItem.id);
					if (!legacyLine.kind || legacyLine.primaryGroupItem) {
						persistedLineItemIds.set(line.uid, createdItem.id);
					}

					const formSteps =
						legacyLine.kind && !legacyLine.primaryGroupItem
							? []
							: line.formSteps || [];
					if (formSteps.length) {
						const stepRows = formSteps
							.map((step) => ({
								id: Number(step.id || 0),
								stepId: Number(step.stepId || step.step?.id || 0),
								componentId: step.componentId || null,
								prodUid: step.prodUid || null,
								value: step.value || null,
								qty: Number(step.qty || 0),
								price: Number(step.price || 0),
								basePrice: Number(step.basePrice || 0),
								meta: safeRecord(step.meta) as any,
								salesId: currentId!,
								salesItemId: createdItem.id,
								deletedAt: null,
							}))
							.filter((step) => step.stepId > 0);
						for (const { id, ...stepData } of stepRows) {
							const existingStep = await tx.dykeStepForm.findFirst({
								where: {
									...(id > 0 ? { id } : {}),
									salesItemId: createdItem.id,
									...(id > 0
										? {}
										: {
												stepId: stepData.stepId,
												componentId: stepData.componentId,
												prodUid: stepData.prodUid,
											}),
									deletedAt: null,
								},
								orderBy: { id: "asc" },
								select: { id: true },
							});
							const savedStep = existingStep
								? await tx.dykeStepForm.update({
										where: { id: existingStep.id },
										data: stepData,
										select: { id: true },
									})
								: await tx.dykeStepForm.create({
										data: stepData,
										select: { id: true },
									});
							retainedStepIds.add(savedStep.id);
						}
					}

					const shelfItems = legacyLine.kind ? [] : line.shelfItems || [];
					if (shelfItems.length) {
						const shelfRows = shelfItems
							.map((shelf, index) => {
								const meta = legacyShelfMeta(shelf, index);
								const categoryIds = Array.isArray(meta.categoryIds)
									? meta.categoryIds
									: [];
								const categoryId =
									Number(shelf.categoryId || 0) ||
									Number(categoryIds[categoryIds.length - 1] || 0);
								return {
									id: Number(shelf.id || 0),
									salesOrderItemId: createdItem.id,
									categoryId,
									productId: shelf.productId || null,
									description: shelf.description || null,
									qty: Number(shelf.qty || 0),
									unitPrice: roundMoney(shelf.unitPrice),
									totalPrice: roundMoney(shelf.totalPrice),
									meta: meta as any,
									deletedAt: null,
								};
							})
							.filter((shelf) => shelf.categoryId > 0);
						for (const { id, ...shelfData } of shelfRows) {
							const existingShelf = await tx.dykeSalesShelfItem.findFirst({
								where: {
									...(id > 0 ? { id } : {}),
									salesOrderItemId: createdItem.id,
									...(id > 0
										? {}
										: {
												categoryId: shelfData.categoryId,
												productId: shelfData.productId,
											}),
									deletedAt: null,
								},
								orderBy: { id: "asc" },
								select: { id: true },
							});
							const savedShelf = existingShelf
								? await tx.dykeSalesShelfItem.update({
										where: { id: existingShelf.id },
										data: shelfData,
										select: { id: true },
									})
								: await tx.dykeSalesShelfItem.create({
										data: shelfData,
										select: { id: true },
									});
							retainedShelfIds.add(savedShelf.id);
						}
					}

					const hpt =
						legacyLine.kind === "moulding"
							? {
									...(line.housePackageTool || {}),
									doorType:
										line.housePackageTool?.doorType ||
										String(line.title || "Moulding"),
									moldingId:
										Number(row.mouldingProductId || 0) ||
										line.housePackageTool?.moldingId ||
										null,
									stepProductId:
										Number(row.stepProductId || 0) ||
										line.housePackageTool?.stepProductId ||
										null,
									totalPrice: rowTotal,
									totalDoors: 0,
									meta: {
										...safeRecord(line.housePackageTool?.meta),
										priceTags: {
											...safeRecord(
												safeRecord(line.housePackageTool?.meta).priceTags,
											),
											moulding: {
												...safeRecord(
													safeRecord(
														safeRecord(line.housePackageTool?.meta).priceTags,
													).moulding,
												),
												addon: Number(row.addon || 0),
												overridePrice:
													row.customPrice == null || row.customPrice === ""
														? null
														: Number(row.customPrice || 0),
												salesPrice: Number(row.salesPrice || 0),
												basePrice: Number(row.basePrice || 0),
												price: rowUnitPrice,
												laborQty: row.laborQty ?? null,
												unitLabor: row.unitLabor ?? null,
											},
										},
										legacyGroupUid: legacyLine.groupUid,
										legacySalesItemId: row.salesItemId ?? null,
										legacyHptId: row.hptId ?? null,
									},
									doors: [],
								}
							: legacyLine.kind
								? null
								: line.housePackageTool;
					const hasHpt =
						!!hpt &&
						(!!hpt.doorType ||
							!!hpt.dykeDoorId ||
							!!hpt.doorId ||
							!!hpt.moldingId ||
							!!hpt.stepProductId ||
							!!hpt.totalDoors ||
							!!hpt.totalPrice ||
							!!(hpt.doors || []).length);

					if (hasHpt && hpt) {
						const hptData = {
							salesOrderId: currentId!,
							orderItemId: createdItem.id,
							height: hpt.height || null,
							doorType: hpt.doorType || null,
							doorId: hpt.doorId || null,
							dykeDoorId: hpt.dykeDoorId || null,
							jambSizeId: hpt.jambSizeId || null,
							casingId: hpt.casingId || null,
							moldingId: hpt.moldingId || null,
							stepProductId: hpt.stepProductId || null,
							totalPrice: Number(hpt.totalPrice || 0),
							totalDoors: Number(hpt.totalDoors || 0),
							meta: safeRecord(hpt.meta) as any,
							deletedAt: null,
						};
						const existingHpt = await tx.housePackageTools.findUnique({
							where: { orderItemId: createdItem.id },
							select: { id: true },
						});
						const createdHpt = existingHpt
							? await tx.housePackageTools.update({
									where: {
										id: existingHpt.id,
									},
									data: hptData,
									select: {
										id: true,
									},
								})
							: await tx.housePackageTools.create({
									data: hptData,
									select: {
										id: true,
									},
								});
						retainedHptIds.add(createdHpt.id);

						const doors = (hpt.doors || []).filter(
							(door) =>
								!!door.dimension && (door.lhQty || door.rhQty || door.totalQty),
						);
						if (doors.length) {
							const existingDoors = await tx.dykeSalesDoors.findMany({
								where: {
									housePackageToolId: createdHpt.id,
									deletedAt: null,
								},
								orderBy: { id: "asc" },
								select: {
									id: true,
									dimension: true,
									stepProductId: true,
									meta: true,
								},
							});
							const existingDoorIds = new Set(
								existingDoors.map((door) => door.id),
							);
							const existingDoorByIdentity = new Map<string, number>();
							for (const door of existingDoors) {
								const identity = getSalesDoorActiveIdentity(door);
								if (!existingDoorByIdentity.has(identity)) {
									existingDoorByIdentity.set(identity, door.id);
								}
							}
							for (const door of doors) {
								const normalizedDimension = normalizeSalesDoorDimension(
									door.dimension,
								);
								const doorData = {
									housePackageToolId: createdHpt.id,
									activeIdentity: `${createdHpt.id}|${getSalesDoorActiveIdentity(
										{
											...door,
											dimension: normalizedDimension,
										},
									)}`,
									salesOrderId: currentId!,
									salesOrderItemId: createdItem.id,
									dimension: normalizedDimension,
									swing: door.swing || null,
									doorType: door.doorType || hpt.doorType || null,
									doorPrice: Number(door.doorPrice || 0),
									jambSizePrice: Number(door.jambSizePrice || 0),
									casingPrice: Number(door.casingPrice || 0),
									unitPrice: Number(door.unitPrice || 0),
									lhQty: Math.round(Number(door.lhQty || 0)),
									rhQty: Math.round(Number(door.rhQty || 0)),
									totalQty: Math.round(
										Number(door.totalQty || 0) ||
											Number(door.lhQty || 0) + Number(door.rhQty || 0),
									),
									lineTotal: Number(door.lineTotal || 0),
									stepProductId: door.stepProductId || null,
									meta: safeRecord(door.meta) as any,
									deletedAt: null,
								};
								const requestedDoorId = Number(door.id || 0);
								const existingDoorId = existingDoorIds.has(requestedDoorId)
									? requestedDoorId
									: Number(
											existingDoorByIdentity.get(
												getSalesDoorActiveIdentity(doorData),
											) || 0,
										);
								let savedDoorId: number;
								if (existingDoorId > 0) {
									await tx.dykeSalesDoors.update({
										where: {
											id: existingDoorId,
										},
										data: doorData,
									});
									savedDoorId = existingDoorId;
								} else {
									const savedDoor = await tx.dykeSalesDoors.create({
										data: doorData,
										select: { id: true },
									});
									savedDoorId = savedDoor.id;
								}
								retainedDoorIds.add(savedDoorId);
							}
						}
					}
				}
			}

			// Identity-preserving relational diff: only rows omitted from the canonical
			// command are retired. Retained rows keep their durable ids across autosaves.
			const retiredAt = new Date();
			await tx.dykeSalesDoors.updateMany({
				where: {
					salesOrderId: currentId,
					deletedAt: null,
					id: { notIn: retainedDoorIds.size ? [...retainedDoorIds] : [0] },
				},
				data: { deletedAt: retiredAt, activeIdentity: null },
			});
			await tx.dykeStepForm.updateMany({
				where: {
					salesId: currentId,
					deletedAt: null,
					id: { notIn: retainedStepIds.size ? [...retainedStepIds] : [0] },
				},
				data: { deletedAt: retiredAt },
			});
			await tx.dykeSalesShelfItem.updateMany({
				where: {
					salesOrderItem: { salesOrderId: currentId },
					deletedAt: null,
					id: { notIn: retainedShelfIds.size ? [...retainedShelfIds] : [0] },
				},
				data: { deletedAt: retiredAt },
			});
			await tx.housePackageTools.updateMany({
				where: {
					salesOrderId: currentId,
					deletedAt: null,
					id: { notIn: retainedHptIds.size ? [...retainedHptIds] : [0] },
				},
				data: { deletedAt: retiredAt },
			});
			await tx.salesOrderItems.updateMany({
				where: {
					salesOrderId: currentId,
					deletedAt: null,
					id: {
						notIn: retainedSalesItemIds.size ? [...retainedSalesItemIds] : [0],
					},
				},
				data: { deletedAt: retiredAt },
			});

			if (payload.extraCosts.length) {
				const existingCostIds = payload.extraCosts
					.map((cost) => Number(cost.id || 0))
					.filter((id) => id > 0);

				await tx.salesExtraCosts.deleteMany({
					where: {
						orderId: currentId,
						id: {
							notIn: existingCostIds.length ? existingCostIds : [0],
						},
					},
				});

				for (const cost of payload.extraCosts) {
					if (cost.id) {
						const updatedCost = await tx.salesExtraCosts.updateMany({
							where: {
								id: cost.id,
								orderId: currentId,
							},
							data: {
								label: cost.label,
								amount: Number(cost.amount || 0),
								type: cost.type as any,
								taxxable: cost.taxxable ?? false,
							},
						});
						if (updatedCost.count > 0) {
							persistedExtraCosts.push(cost);
							continue;
						}
					}
					const createdCost = await tx.salesExtraCosts.create({
						data: {
							orderId: currentId!,
							label: cost.label,
							amount: Number(cost.amount || 0),
							type: cost.type as any,
							taxxable: cost.taxxable ?? false,
						},
						select: {
							id: true,
						},
					});
					persistedExtraCosts.push({
						...cost,
						id: createdCost.id,
					});
				}
			} else {
				await tx.salesExtraCosts.deleteMany({
					where: { orderId: currentId },
				});
			}

			const hydratedLineItems = normalizedLines.map((line) => ({
				...line,
				id: persistedLineItemIds.get(line.uid) ?? line.id ?? null,
			}));
			const hydratedExtraCosts = persistedExtraCosts.length
				? persistedExtraCosts
				: payload.extraCosts;
			await tx.salesTaxes.deleteMany({
				where: {
					salesId: currentId,
				},
			});

			if (payload.meta.taxCode) {
				await tx.salesTaxes.create({
					data: {
						salesId: currentId,
						taxCode: payload.meta.taxCode,
						taxxable: summary.taxableSubTotal,
						tax: summary.taxTotal,
					},
				});
			}

			if (!isNew && activitySenderContactId) {
				const beforeLines = currentMeta.newSalesForm?.lineItems?.length
					? currentMeta.newSalesForm.lineItems
					: order!.items.map((item) => ({
							id: item.id,
							uid:
								(typeof safeRecord(item.meta).uid === "string" &&
									String(safeRecord(item.meta).uid)) ||
								item.multiDykeUid ||
								`sales-item-${item.id}`,
							title: item.dykeDescription || item.description || "Line item",
							description: item.description,
							qty: Number(item.qty || 0),
						}));
				await createSalesFormTimelineActivity(
					tx as unknown as TRPCContext["db"],
					{
						salesId: currentId,
						orderId: order!.orderId,
						senderContactId: activitySenderContactId,
						copy: buildSalesFormUpdateActivity({
							salesType: payload.type,
							orderId: order!.orderId,
							status,
							autosave: payload.autosave,
							beforeGrandTotal: Number(order!.grandTotal || 0),
							afterGrandTotal: persistedSummary.grandTotal,
							beforeLines,
							afterLines: hydratedLineItems,
						}),
					},
				);
				if (manuallyEnrolledExistingOrder) {
					await createSalesFormTimelineActivity(
						tx as unknown as TRPCContext["db"],
						{
							salesId: currentId,
							orderId: order!.orderId,
							senderContactId: activitySenderContactId,
							copy: buildSpecialOrderEnrollmentActivity({
								orderId: order!.orderId,
								reason: payload.specialOrderChangeReason,
							}),
						},
					);
				}
				if (specialOrderRevisionChanged) {
					await createSalesFormTimelineActivity(
						tx as unknown as TRPCContext["db"],
						{
							salesId: currentId,
							orderId: order!.orderId,
							senderContactId: activitySenderContactId,
							copy: buildSpecialOrderRevisionInvalidatedActivity({
								orderId: order!.orderId,
								hadCustomerEvidence,
							}),
						},
					);
				}
			}

			return {
				salesId: currentId,
				slug: order!.slug,
				orderId: order!.orderId,
				inventoryStatus:
					payload.type === "order"
						? payload.inventoryStatus || order!.inventoryStatus || null
						: null,
				type: payload.type,
				isNew,
				version: nextVersion,
				updatedAt: nextMeta.newSalesForm?.updatedAt,
				form: nextFormMeta,
				lineItems: hydratedLineItems,
				extraCosts: hydratedExtraCosts,
				summary,
				settings,
				status,
				_saveScope: "full" as const,
				specialOrder: {
					declaration: nextSpecialOrderDeclaration,
					status: nextSpecialOrderStatus,
					revision:
						nextSpecialOrderDeclaration === "YES" ? specialOrderRevision : null,
					currentApprovalId: nextCurrentSpecialOrderApprovalId,
					currentRequestId:
						nextSpecialOrderDeclaration === "YES" &&
						!specialOrderRevisionChanged
							? order!.currentSpecialOrderRequestId
							: null,
					changeReason: null,
				},
			};
		},
		{
			isolationLevel: "Serializable",
			maxWait: 5_000,
			timeout: 30_000,
		},
	);
	const canonical = await getNewSalesForm(ctx, {
		slug: transactionResult.slug,
		type: transactionResult.type,
	});
	return {
		...canonical,
		isNew: transactionResult.isNew,
		_saveScope: transactionResult._saveScope,
	};
}

const POST_SAVE_QUEUE_TIMEOUT_MS = 2_000;

export async function runBoundedPostSaveTask<T>(
	label: string,
	task: () => Promise<T>,
	timeoutMs = POST_SAVE_QUEUE_TIMEOUT_MS,
): Promise<T | null> {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let timedOut = false;

	try {
		return await Promise.race([
			Promise.resolve()
				.then(task)
				.catch((error) => {
					if (!timedOut) {
						console.error(`Unable to complete post-save task: ${label}`, error);
					}
					return null;
				}),
			new Promise<null>((resolve) => {
				timeout = setTimeout(() => {
					timedOut = true;
					console.error(`Timed out post-save task: ${label}`);
					resolve(null);
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

function getSalesDocumentPrefixes(isQuote: boolean) {
	return isQuote
		? ["quote_pdf"]
		: [
				"invoice_pdf",
				"production_pdf",
				"packing_slip_pdf",
				"order_packing_pdf",
				"quote_pdf",
			];
}

function getSalesDocumentWarmupInputs(salesOrderId: number, isQuote: boolean) {
	return isQuote
		? [{ salesOrderId, mode: "quote" as const }]
		: [
				{ salesOrderId, mode: "invoice" as const },
				{ salesOrderId, mode: "production" as const },
				{ salesOrderId, mode: "packing-slip" as const },
				{ salesOrderId, mode: "order-packing" as const },
			];
}

async function runNewSalesFormPostSaveTasks(
	ctx: TRPCContext,
	result: Awaited<ReturnType<typeof saveNewSalesFormInternal>>,
) {
	const isQuote = result.type === "quote";
	const shouldSyncInventory = result._saveScope !== "legacy-po-only";

	await Promise.all([
		runBoundedPostSaveTask("expire-current-sales-document-snapshots", () =>
			expireCurrentSalesDocumentSnapshots({
				db: ctx.db,
				salesOrderId: result.salesId,
				reason: "invoice_updated",
				documentPrefixes: getSalesDocumentPrefixes(isQuote),
			}),
		),
		...(shouldSyncInventory
			? [
					runBoundedPostSaveTask(
						"queue-sales-inventory-line-items-sync",
						() =>
							queueSalesInventoryLineItemsSync({
								salesOrderId: result.salesId,
								source: "new-form",
								triggeredByUserId: ctx.userId ?? null,
							}),
					),
				]
			: []),
		runBoundedPostSaveTask("queue-sales-document-snapshot-warmups", () =>
			queueSalesDocumentSnapshotWarmups(
				getSalesDocumentWarmupInputs(result.salesId, isQuote),
			),
		),
	]);
}

function publicNewSalesFormSaveResult(
	result: Awaited<ReturnType<typeof saveNewSalesFormInternal>>,
) {
	const { _saveScope: saveScope, ...publicResult } = result;
	return { ...publicResult, saveScope };
}

export async function saveDraftNewSalesForm(
	ctx: TRPCContext,
	input: SaveDraftNewSalesFormSchema,
) {
	const payload = saveDraftNewSalesFormSchema.parse(input);
	const startedAt = performance.now();
	logNewSalesFormSaveDiagnostic({
		action: "save-draft",
		stage: "ingress",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		payload,
	});
	await captureNewSalesFormSavePayload({
		action: "save-draft",
		payload,
		userId: ctx.userId,
		requestId: ctx.requestId,
	});
	logNewSalesFormSaveDiagnostic({
		action: "save-draft",
		stage: "payload-captured",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		payload,
	});
	const result = await saveNewSalesFormInternal(ctx, payload, "Draft");
	logNewSalesFormSaveDiagnostic({
		action: "save-draft",
		stage: "core-complete",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		salesId: result.salesId,
		payload,
	});
	await runNewSalesFormPostSaveTasks(ctx, result);
	logNewSalesFormSaveDiagnostic({
		action: "save-draft",
		stage: "post-save-complete",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		salesId: result.salesId,
	});
	return publicNewSalesFormSaveResult(result);
}

export async function saveFinalNewSalesForm(
	ctx: TRPCContext,
	input: SaveFinalNewSalesFormSchema,
) {
	const payload = saveFinalNewSalesFormSchema.parse(input);
	const startedAt = performance.now();
	logNewSalesFormSaveDiagnostic({
		action: "save-final",
		stage: "ingress",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		payload,
	});
	await captureNewSalesFormSavePayload({
		action: "save-final",
		payload,
		userId: ctx.userId,
		requestId: ctx.requestId,
	});
	logNewSalesFormSaveDiagnostic({
		action: "save-final",
		stage: "payload-captured",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		payload,
	});
	const result = await saveNewSalesFormInternal(ctx, payload, "Active");
	logNewSalesFormSaveDiagnostic({
		action: "save-final",
		stage: "core-complete",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		salesId: result.salesId,
		payload,
	});
	await runNewSalesFormPostSaveTasks(ctx, result);
	logNewSalesFormSaveDiagnostic({
		action: "save-final",
		stage: "post-save-complete",
		requestId: ctx.requestId,
		clientRequestId: payload.clientRequestId,
		startedAt,
		salesId: result.salesId,
	});
	return publicNewSalesFormSaveResult(result);
}

export async function saveStorefrontSalesOrder(
	ctx: TRPCContext,
	input: {
		checkoutId: string;
		customerId: number;
		customerProfileId?: number | null;
		salesRepId: number;
		billingAddressId: number;
		shippingAddressId: number;
		taxCode?: string | null;
		taxRate: number;
		deliveryOption: "pickup" | "delivery";
		deliveryAmount: number;
		promotionAdjustments?: Array<{
			id: string;
			title: string;
			amount: number;
		}>;
		storefrontPricing?: unknown;
		lineItems: NewSalesFormLineItem[];
	},
) {
	const extraCosts: NewSalesFormExtraCost[] = [
		...(input.promotionAdjustments || [])
			.filter((adjustment) => adjustment.amount > 0)
			.map((adjustment) => ({
				id: null,
				label: adjustment.title,
				type: "Discount" as const,
				amount: adjustment.amount,
				taxxable: false,
			})),
		...(input.deliveryAmount > 0
			? [
					{
						id: null,
						label: "Delivery",
						type: "Delivery" as const,
						amount: input.deliveryAmount,
						taxxable: false,
					},
				]
			: []),
	];
	const payload: SaveFinalNewSalesFormSchema = {
		type: "order",
		slug: null,
		salesId: null,
		version: null,
		autosave: false,
		commitIntent: "final",
		meta: {
			customerId: input.customerId,
			customerProfileId: input.customerProfileId || null,
			billingAddressId: input.billingAddressId,
			shippingAddressId: input.shippingAddressId,
			paymentTerm: "None",
			paymentMethod: "link",
			createdAt: new Date().toISOString(),
			paymentDueDate: null,
			goodUntil: null,
			prodDueDate: null,
			po: null,
			notes: `Storefront checkout ${input.checkoutId}`,
			deliveryOption: input.deliveryOption,
			taxCode: input.taxCode || null,
		},
		lineItems: input.lineItems,
		extraCosts,
		summary: {
			subTotal: 0,
			adjustedSubTotal: 0,
			taxRate: input.taxRate,
			taxTotal: 0,
			grandTotal: 0,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: input.deliveryAmount,
			otherCosts: 0,
			ccc: 0,
		},
	};
	const result = await saveNewSalesFormInternal(ctx, payload, "Active", {
		salesChannel: "storefront",
		storefrontCheckoutId: input.checkoutId,
		storefrontPricing: input.storefrontPricing,
	});
	await ctx.db.salesOrders.update({
		where: { id: result.salesId },
		data: { salesRepId: input.salesRepId },
	});
	await runNewSalesFormPostSaveTasks(ctx, result);
	return publicNewSalesFormSaveResult(result);
}

export async function saveStorefrontInquiryQuote(
	ctx: TRPCContext,
	input: {
		inquiryId: string;
		reference: string;
		customerId: number;
		salesRepId: number;
		notes: string;
	},
) {
	const bootstrap = await bootstrapNewSalesForm(ctx, {
		type: "quote",
		customerId: input.customerId,
	});
	const payload: SaveDraftNewSalesFormSchema = {
		type: "quote",
		slug: null,
		salesId: null,
		version: null,
		autosave: false,
		commitIntent: "draft",
		meta: {
			...bootstrap.form,
			notes: input.notes,
		},
		lineItems: [],
		extraCosts:
			bootstrap.extraCosts as SaveDraftNewSalesFormSchema["extraCosts"],
		summary: bootstrap.summary,
	};
	const result = await saveNewSalesFormInternal(ctx, payload, "Draft", {
		salesChannel: "storefront-custom",
		storefrontInquiryId: input.inquiryId,
		storefrontInquiryReference: input.reference,
	});
	await ctx.db.salesOrders.update({
		where: { id: result.salesId },
		data: { salesRepId: input.salesRepId },
	});
	await runNewSalesFormPostSaveTasks(ctx, result);
	return publicNewSalesFormSaveResult(result);
}

export async function deleteNewSalesFormLineItem(
	ctx: TRPCContext,
	input: DeleteNewSalesFormLineItemSchema,
) {
	const payload = deleteNewSalesFormLineItemSchema.parse(input);
	const line = await ctx.db.salesOrderItems.findFirst({
		where: {
			id: payload.lineItemId,
			salesOrderId: payload.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			salesOrderId: true,
			salesOrder: {
				select: {
					slug: true,
					type: true,
					status: true,
				},
			},
		},
	});
	if (!line) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Line item not found.",
		});
	}
	const commitments = await getNewSalesFormCommitmentSnapshot(
		ctx.db,
		line.salesOrderId,
	);
	if (
		commitments.paymentTotal > 0 ||
		commitments.allocatedQty > 0 ||
		commitments.inboundQty > 0 ||
		commitments.productionQty > 0 ||
		commitments.fulfilledQty > 0
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"SALES_CHANGE_REVIEW_REQUIRED: This committed line must be removed through the in-form sales-representative review flow.",
		});
	}
	const type = line.salesOrder?.type;
	if (type !== "order" && type !== "quote") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Unsupported sales document type.",
		});
	}
	const document = await getNewSalesForm(ctx, {
		type,
		slug: line.salesOrder!.slug,
	});
	if (document.version !== payload.version) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "This sales document changed elsewhere. Reload before deleting.",
		});
	}
	const nextLineItems = document.lineItems.filter(
		(item) => Number(item.id || 0) !== line.id,
	);
	const nextSummary = recalculateSummary({
		taxRate: document.summary.taxRate,
		paymentMethod: document.form.paymentMethod || null,
		cccPercentage: document.settings.cccPercentage,
		lineItems: nextLineItems,
		extraCosts: document.extraCosts.map((cost) => ({
			type: cost.type,
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable ?? false,
		})),
	});
	const result = await saveNewSalesFormInternal(
		ctx,
		{
			type,
			salesId: document.salesId,
			slug: document.slug,
			version: document.version,
			autosave: false,
			commitIntent: "draft",
			specialOrderDeclaration: document.specialOrder.declaration,
			meta: document.form,
			lineItems: nextLineItems,
			extraCosts: document.extraCosts,
			summary: nextSummary,
		},
		line.salesOrder!.status || document.status,
	);
	await runNewSalesFormPostSaveTasks(ctx, result);
	return {
		ok: true,
		lineItemId: payload.lineItemId,
		version: result.version,
		updatedAt: result.updatedAt,
		lineItems: result.lineItems,
		summary: result.summary,
	};
}
