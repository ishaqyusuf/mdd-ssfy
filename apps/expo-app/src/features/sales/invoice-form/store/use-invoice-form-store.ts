import { create } from "zustand";
import { divideMoney, multiplyMoney } from "@gnd/sales/payment-system";
import {
	normalizeSalesFormExtraCosts,
	normalizeSalesFormLineItems,
	normalizeSalesFormMeta,
	patchShelfRowPrice,
	patchShelfRowQty,
	readSalesFormObjectMetadata,
	normalizeSalesFormPaymentTerm,
	removeSalesFormExtraCost,
	removeSalesFormLineItem,
	setSalesFormCustomerProfileMeta,
	setSalesFormMeta,
	setSalesFormSummary,
	setSalesFormTaxRate,
	toSalesFormSaveDraftPayload,
	updateSalesFormLineItem,
	upsertSalesFormExtraCost,
	addSalesFormLineItem,
	hydrateSalesFormRecord,
	validateSalesFormBeforeSave,
	type ShelfRowDraft,
} from "@gnd/sales/sales-form-core";
import {
	createDefaultLineItems,
	defaultExtraCosts,
	defaultInvoiceMeta,
} from "../mock-data";
import type {
	InvoiceCustomer,
	InvoiceFormSaveResult,
	InvoiceFormStep,
	InvoiceInventoryStatus,
	InvoiceResolvedCustomer,
	InvoiceSaveStatus,
	NewSalesFormExtraCost,
	NewSalesFormLineItem,
	NewSalesFormMeta,
	NewSalesFormMobileRecord,
	NewSalesFormSettings,
	NewSalesFormSummary,
	NewSalesFormType,
	SaveDraftNewSalesFormPayload,
} from "../types";
import { calculateInvoiceSummary } from "../lib/calculate-summary";
import type { InvoiceFormRecoverySnapshot } from "../lib/local-recovery";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import {
	fromSharedSalesFormState,
	type MobileSalesFormState,
	toSharedSalesFormState,
} from "../lib/sales-form-bridge";

const steps: InvoiceFormStep[] = [
	"customer",
	"details",
	"items",
	"costs",
	"review",
];

function sharedSnapshot(state: InvoiceFormState) {
	return toSharedSalesFormState({
		type: state.type,
		salesId: state.salesId,
		slug: state.slug,
		orderId: state.orderId,
		inventoryStatus: state.inventoryStatus,
		status: state.status,
		version: state.version,
		meta: state.meta,
		lineItems: state.lineItems,
		extraCosts: state.extraCosts,
		summary: state.summary,
		settings: state.settings,
		saveStatus: state.saveStatus,
		dirty: state.dirty,
		lastSavedAt: state.lastSavedAt,
	});
}

type InvoiceFormState = {
	step: InvoiceFormStep;
	type: NewSalesFormType;
	slug: string | null;
	salesId: number | null;
	orderId: string | null;
	inventoryStatus: string | null;
	status: string | null;
	version: string | null;
	settings: NewSalesFormSettings | null;
	meta: NewSalesFormMeta;
	customer: InvoiceCustomer | null;
	lineItems: NewSalesFormLineItem[];
	extraCosts: NewSalesFormExtraCost[];
	summary: NewSalesFormSummary;
	taxRate: number;
	dirty: boolean;
	saveStatus: InvoiceSaveStatus;
	validationError: string | null;
	lastSavedAt: string | null;
	selectorOpen: boolean;
	workflowSelectorLineUid: string | null;
	actions: {
		selectCustomer: (
			customer: InvoiceCustomer,
			options?: {
				previousProfileCoefficient?: number | null;
				nextProfileCoefficient?: number | null;
			},
		) => void;
		applyResolvedCustomer: (
			customer: InvoiceResolvedCustomer,
			options?: {
				previousProfileCoefficient?: number | null;
				nextProfileCoefficient?: number | null;
			},
		) => void;
		applyCustomerProfileMeta: (
			patch: Partial<NewSalesFormMeta>,
			options?: {
				previousProfileCoefficient?: number | null;
				nextProfileCoefficient?: number | null;
			},
		) => void;
		setFormType: (type: NewSalesFormType) => void;
		updateMeta: (patch: Partial<NewSalesFormMeta>) => void;
		setStep: (step: InvoiceFormStep) => void;
		nextStep: () => void;
		prevStep: () => void;
		openSelector: () => void;
		closeSelector: () => void;
		openWorkflowSelector: (uid: string) => void;
		closeWorkflowSelector: () => void;
		addOrUpdateLineItem: (item: NewSalesFormLineItem) => void;
		addBlankLineItem: () => void;
		patchLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
		removeLineItem: (uid: string) => void;
		setLineTitle: (uid: string, title: string) => void;
		setLineDescription: (uid: string, description: string) => void;
		setLineQty: (uid: string, qty: number) => void;
		setLineUnitPrice: (uid: string, unitPrice: number) => void;
		setLineTotal: (uid: string, lineTotal: number) => void;
		setLineTaxable: (uid: string, taxxable: boolean) => void;
		updateExtraCost: (
			type: NewSalesFormExtraCost["type"],
			amount: number,
		) => void;
		updateExtraCostAtIndex: (index: number, amount: number) => void;
		updateExtraCostLabelAtIndex: (index: number, label: string) => void;
		addCustomCost: (taxxable: boolean) => void;
		removeExtraCostAtIndex: (index: number) => void;
		setInventoryStatus: (status: InvoiceInventoryStatus | null) => void;
		setTaxRate: (taxRate: number) => void;
		validateBeforeSave: () => boolean;
		buildSavePayload: (autosave: boolean) => SaveDraftNewSalesFormPayload;
		hydrateFromRecord: (record: NewSalesFormMobileRecord) => void;
		restoreRecoverySnapshot: (snapshot: InvoiceFormRecoverySnapshot) => void;
		markSaving: () => void;
		markSaved: (data?: InvoiceFormSaveResult) => void;
		markError: (message?: string) => void;
		markStale: (message?: string) => void;
		reset: () => void;
	};
};

function createInitialData() {
	const lineItems: NewSalesFormLineItem[] = [];
	const extraCosts = normalizeSalesFormExtraCosts(
		defaultExtraCosts,
	) as NewSalesFormExtraCost[];
	const taxRate = 7.5;
	const settings: NewSalesFormSettings = { cccPercentage: 3.5 };
	return {
		lineItems,
		extraCosts,
		taxRate,
		settings,
		summary: calculateInvoiceSummary({
			lineItems,
			extraCosts,
			taxRate,
			paymentMethod: defaultInvoiceMeta.paymentMethod,
			cccPercentage: settings.cccPercentage,
		}),
	};
}

export const useInvoiceFormStore = create<InvoiceFormState>((set, get) => {
	const initial = createInitialData();

	return {
		step: "customer",
		type: "order",
		slug: null,
		salesId: null,
		orderId: null,
		inventoryStatus: null,
		status: null,
		version: null,
		settings: initial.settings,
		meta: normalizeSalesFormMeta(defaultInvoiceMeta) as NewSalesFormMeta,
		customer: null,
		lineItems: initial.lineItems,
		extraCosts: initial.extraCosts,
		summary: initial.summary,
		taxRate: initial.taxRate,
		dirty: false,
		saveStatus: "idle",
		validationError: null,
		lastSavedAt: null,
		selectorOpen: false,
		workflowSelectorLineUid: null,
		actions: {
			selectCustomer(customer, options) {
				set((state) => {
					const customerSelectedState =
						state.lineItems.length > 0
							? state
							: {
									...state,
									lineItems: createDefaultLineItems(),
								};
					const shared = setSalesFormCustomerProfileMeta(
						sharedSnapshot(customerSelectedState),
						{
							customerId: customer.id,
							customerProfileId: customer.profileId ?? null,
							billingAddressId: customer.billingAddressId,
							shippingAddressId: customer.shippingAddressId,
							paymentTerm: normalizeSalesFormPaymentTerm(
								customer.paymentTerm,
								state.meta.paymentTerm,
							),
							taxCode: customer.taxCode ?? state.meta.taxCode ?? null,
						},
						options?.previousProfileCoefficient,
						options?.nextProfileCoefficient,
					);
					return {
						customer,
						...fromSharedSalesFormState(shared),
						validationError: null,
					};
				});
			},
			applyResolvedCustomer(customer, options) {
				set((state) => {
					const nextMeta = {
						customerId:
							Number(customer.customerId || state.meta.customerId || 0) || null,
						customerProfileId:
							customer.profileId ?? state.meta.customerProfileId ?? null,
						billingAddressId:
							customer.billing?.id ??
							customer.billingId ??
							state.meta.billingAddressId ??
							null,
						shippingAddressId:
							customer.shipping?.id ??
							customer.shippingId ??
							state.meta.shippingAddressId ??
							null,
						paymentTerm: normalizeSalesFormPaymentTerm(
							customer.netTerm,
							state.meta.paymentTerm,
						),
						taxCode: customer.taxCode || state.meta.taxCode || null,
					};
					const nextCustomer = mapResolvedCustomer(customer, state.customer);
					const metaUnchanged = Object.entries(nextMeta).every(
						([key, value]) =>
							state.meta[key as keyof NewSalesFormMeta] === value,
					);
					if (
						metaUnchanged &&
						areInvoiceCustomersEqual(nextCustomer, state.customer) &&
						state.validationError == null
					) {
						return state;
					}
					const shared =
						nextMeta.customerProfileId !== state.meta.customerProfileId
							? setSalesFormCustomerProfileMeta(
									sharedSnapshot(state),
									nextMeta,
									options?.previousProfileCoefficient,
									options?.nextProfileCoefficient,
								)
							: setSalesFormMeta(sharedSnapshot(state), nextMeta);
					return {
						customer: nextCustomer,
						...fromSharedSalesFormState(recomputeSharedSummary(shared)),
						validationError: null,
					};
				});
			},
			applyCustomerProfileMeta(patch, options) {
				set((state) => {
					const shared = setSalesFormCustomerProfileMeta(
						sharedSnapshot(state),
						patch,
						options?.previousProfileCoefficient,
						options?.nextProfileCoefficient,
					);
					return {
						...fromSharedSalesFormState(recomputeSharedSummary(shared)),
						validationError: null,
					};
				});
			},
			setFormType(type) {
				set((state) => (state.type === type ? state : { type }));
			},
			updateMeta(patch) {
				set((state) => {
					const shared = setSalesFormMeta(sharedSnapshot(state), patch);
					return {
						...fromSharedSalesFormState(recomputeSharedSummary(shared)),
						validationError: null,
					};
				});
			},
			setStep(step) {
				set({ step });
			},
			nextStep() {
				const currentIndex = steps.indexOf(get().step);
				set({ step: steps[Math.min(steps.length - 1, currentIndex + 1)] });
			},
			prevStep() {
				const currentIndex = steps.indexOf(get().step);
				set({ step: steps[Math.max(0, currentIndex - 1)] });
			},
			openSelector() {
				set({ selectorOpen: true, workflowSelectorLineUid: null });
			},
			closeSelector() {
				set({ selectorOpen: false });
			},
			openWorkflowSelector(uid) {
				set({ selectorOpen: false, workflowSelectorLineUid: uid });
			},
			closeWorkflowSelector() {
				set({ workflowSelectorLineUid: null });
			},
			addOrUpdateLineItem(item) {
				set((state) => {
					const itemMeta = readSalesFormObjectMetadata(item.meta) || {};
					const sourceUid = itemMeta.sourceUid;
					const workflowLine = isWorkflowLineItem(item);
					const exists = state.lineItems.find((line) => {
						const lineMeta = readSalesFormObjectMetadata(line.meta) || {};
						return (
							line.uid === item.uid ||
							(!workflowLine && sourceUid
								? lineMeta.sourceUid === sourceUid
								: false)
						);
					});
					const shared = exists
						? updateSalesFormLineItem(sharedSnapshot(state), exists.uid, {
								...buildMergedLineItemPatch(exists, item),
							})
						: addSalesFormLineItem(sharedSnapshot(state), item);
					return {
						...fromSharedSalesFormState(shared),
						validationError: null,
					};
				});
			},
			addBlankLineItem() {
				set((state) => ({
					...fromSharedSalesFormState(
						addSalesFormLineItem(sharedSnapshot(state)),
					),
					selectorOpen: false,
					workflowSelectorLineUid: null,
					validationError: null,
				}));
			},
			patchLineItem(uid, patch) {
				set((state) =>
					fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					),
				);
			},
			removeLineItem(uid) {
				set((state) => ({
					...fromSharedSalesFormState(
						removeSalesFormLineItem(sharedSnapshot(state), uid),
					),
					validationError: null,
				}));
			},
			setLineTitle(uid, title) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line ? buildLineTitlePatch(line, title) : { title };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			setLineDescription(uid, description) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line
						? buildLineDescriptionPatch(line, description)
						: { description };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			setLineQty(uid, qty) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line
						? buildLineQtyPatch(line, Math.max(0, qty))
						: { qty: Math.max(0, qty) };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			setLineUnitPrice(uid, unitPrice) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line
						? buildLineUnitPricePatch(line, Math.max(0, unitPrice))
						: { unitPrice: Math.max(0, unitPrice) };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			setLineTotal(uid, lineTotal) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line
						? buildLineTotalPatch(line, Math.max(0, lineTotal))
						: { lineTotal: Math.max(0, lineTotal) };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			setLineTaxable(uid, taxxable) {
				set((state) => {
					const line = state.lineItems.find((item) => item.uid === uid);
					const patch = line
						? buildLineTaxablePatch(line, taxxable)
						: { taxxable };
					return fromSharedSalesFormState(
						updateSalesFormLineItem(sharedSnapshot(state), uid, patch),
					);
				});
			},
			updateExtraCost(type, amount) {
				set((state) => {
					const index = state.extraCosts.findIndex(
						(cost) => cost.type === type,
					);
					const current = state.extraCosts[index];
					const shared = upsertSalesFormExtraCost(
						sharedSnapshot(state),
						{
							id: current?.id ?? null,
							label: current?.label || type,
							type,
							amount,
							taxxable: current?.taxxable ?? type === "Delivery",
						},
						index >= 0 ? index : undefined,
					);
					return fromSharedSalesFormState(shared);
				});
			},
			updateExtraCostAtIndex(index, amount) {
				set((state) => {
					const current = state.extraCosts[index];
					if (!current) return state;
					return fromSharedSalesFormState(
						upsertSalesFormExtraCost(
							sharedSnapshot(state),
							{
								...current,
								amount,
							},
							index,
						),
					);
				});
			},
			updateExtraCostLabelAtIndex(index, label) {
				set((state) => {
					const current = state.extraCosts[index];
					if (!current) return state;
					return fromSharedSalesFormState(
						upsertSalesFormExtraCost(
							sharedSnapshot(state),
							{
								...current,
								label,
							},
							index,
						),
					);
				});
			},
			addCustomCost(taxxable) {
				set((state) => {
					const shared = upsertSalesFormExtraCost(sharedSnapshot(state), {
						label: taxxable ? "Custom taxable cost" : "Custom non-taxable cost",
						type: taxxable ? "CustomTaxxable" : "CustomNonTaxxable",
						amount: 0,
						taxxable,
					} satisfies NewSalesFormExtraCost);
					return fromSharedSalesFormState(shared);
				});
			},
			removeExtraCostAtIndex(index) {
				set((state) =>
					fromSharedSalesFormState(
						removeSalesFormExtraCost(sharedSnapshot(state), index),
					),
				);
			},
			setInventoryStatus(status) {
				set((state) => ({
					inventoryStatus: status,
					dirty: true,
					saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
				}));
			},
			setTaxRate(taxRate) {
				set((state) =>
					fromSharedSalesFormState(
						setSalesFormTaxRate(sharedSnapshot(state), taxRate),
					),
				);
			},
			validateBeforeSave() {
				const state = get();
				const result = validateSalesFormBeforeSave({
					form: state.meta,
					lineItems: state.lineItems,
				});
				if (!result.valid) {
					set({ validationError: result.message });
					return false;
				}
				set({ validationError: null });
				return true;
			},
			buildSavePayload(autosave) {
				const state = get();
				return toSalesFormSaveDraftPayload(
					{
						type: state.type,
						salesId: state.salesId,
						slug: state.slug,
						inventoryStatus: state.inventoryStatus,
						version: state.version,
						settings: state.settings,
						form: state.meta,
						lineItems: state.lineItems,
						extraCosts: state.extraCosts,
						summary: state.summary,
					},
					autosave,
				) as SaveDraftNewSalesFormPayload;
			},
			hydrateFromRecord(record) {
				const current = get();
				const sourceLineItems = Array.isArray(record.lineItems)
					? record.lineItems
					: [];
				const preserveEmptyCreateLineItems =
					!record.salesId && !record.slug && sourceLineItems.length === 0;
				const hydrated = hydrateSalesFormRecord({
					type: record.type,
					salesId: record.salesId ?? null,
					slug: record.slug ?? null,
					orderId: record.orderId ?? null,
					inventoryStatus: record.inventoryStatus ?? null,
					status: record.status ?? null,
					version: record.version ?? null,
					form: record.form,
					lineItems: record.lineItems,
					extraCosts: record.extraCosts,
					summary: record.summary,
					settings: record.settings ?? null,
					updatedAt: record.updatedAt ?? null,
				});
				const recordCustomer = mapRecordCustomer(record.customer);
				const recordCustomerId =
					recordCustomer?.id ?? record.form?.customerId ?? null;
				const currentCustomerId =
					current.customer?.id ?? current.meta.customerId ?? null;
				const canReuseCurrentCreateLineItems =
					current.lineItems.length > 0 &&
					(!recordCustomerId || currentCustomerId === recordCustomerId);
				const shouldSeedCreateLineItem = Boolean(
					recordCustomer || current.customer || record.form?.customerId,
				);
				const nextLineItems = preserveEmptyCreateLineItems
					? canReuseCurrentCreateLineItems
						? current.lineItems
						: shouldSeedCreateLineItem
							? createDefaultLineItems()
							: []
					: (hydrated.lineItems as NewSalesFormLineItem[]);
				const shared = toSharedSalesFormState({
					type: (hydrated.type || "order") as NewSalesFormType,
					salesId: hydrated.salesId ?? null,
					slug: hydrated.slug ?? null,
					orderId: hydrated.orderId ?? null,
					inventoryStatus: hydrated.inventoryStatus ?? null,
					status: hydrated.status ?? null,
					version: hydrated.version ?? null,
					settings: hydrated.settings ?? null,
					meta: hydrated.form as NewSalesFormMeta,
					lineItems: nextLineItems,
					extraCosts: hydrated.extraCosts as NewSalesFormExtraCost[],
					summary: hydrated.summary as NewSalesFormSummary,
					saveStatus: "idle",
					dirty: false,
					lastSavedAt: hydrated.updatedAt ?? null,
				});
				const nextShared = preserveEmptyCreateLineItems
					? recomputeSharedSummary(shared)
					: shared;
				const isSavedRecord = Boolean(hydrated.salesId || hydrated.slug);

				set({
					step: isSavedRecord ? "review" : current.step,
					type: (hydrated.type || "order") as NewSalesFormType,
					salesId: hydrated.salesId ?? null,
					slug: hydrated.slug ?? null,
					orderId: hydrated.orderId ?? null,
					inventoryStatus: hydrated.inventoryStatus ?? null,
					status: hydrated.status ?? null,
					version: hydrated.version ?? null,
					settings: hydrated.settings ?? null,
					customer: recordCustomer || current.customer,
					...fromSharedSalesFormState(nextShared),
					dirty: false,
					saveStatus: "idle",
					validationError: null,
					selectorOpen: false,
					workflowSelectorLineUid: null,
				});
			},
			restoreRecoverySnapshot(snapshot) {
				const payload = snapshot.payload;
				const current = get();
				const nextSalesId = payload.salesId ?? current.salesId;
				const nextSlug = payload.slug ?? current.slug;
				const nextInventoryStatus =
					payload.inventoryStatus ?? current.inventoryStatus;
				const nextVersion = payload.version ?? current.version;
				const nextSettings = snapshot.settings ?? current.settings;
				const hydrated = hydrateSalesFormRecord({
					type: payload.type,
					salesId: nextSalesId,
					slug: nextSlug,
					orderId: current.orderId,
					inventoryStatus: nextInventoryStatus,
					status: current.status,
					version: nextVersion,
					form: payload.meta,
					lineItems: payload.lineItems || [],
					extraCosts: payload.extraCosts || [],
					summary: payload.summary,
					settings: nextSettings,
					updatedAt: snapshot.savedAt,
				});
				const shared = toSharedSalesFormState({
					type: (hydrated.type || payload.type) as NewSalesFormType,
					salesId: hydrated.salesId ?? nextSalesId,
					slug: hydrated.slug ?? nextSlug,
					orderId: hydrated.orderId ?? current.orderId,
					inventoryStatus: hydrated.inventoryStatus ?? nextInventoryStatus,
					status: hydrated.status ?? current.status,
					version: hydrated.version ?? nextVersion,
					settings: hydrated.settings ?? nextSettings,
					meta: hydrated.form as NewSalesFormMeta,
					lineItems: hydrated.lineItems as NewSalesFormLineItem[],
					extraCosts: hydrated.extraCosts as NewSalesFormExtraCost[],
					summary: hydrated.summary as NewSalesFormSummary,
					saveStatus: "idle",
					dirty: true,
					lastSavedAt: snapshot.savedAt,
				});

				const nextType = (hydrated.type || payload.type) as NewSalesFormType;

				set({
					type: nextType,
					salesId: hydrated.salesId ?? nextSalesId,
					slug: hydrated.slug ?? nextSlug,
					orderId: hydrated.orderId ?? current.orderId,
					inventoryStatus: hydrated.inventoryStatus ?? nextInventoryStatus,
					status: hydrated.status ?? current.status,
					version: hydrated.version ?? nextVersion,
					settings: hydrated.settings ?? nextSettings,
					...fromSharedSalesFormState(shared),
					dirty: true,
					saveStatus: "idle",
					validationError:
						getSalesDocumentLabels(nextType).recoveredChangesMessage,
					selectorOpen: false,
					workflowSelectorLineUid: null,
				});
			},
			markSaving() {
				set({ saveStatus: "saving", validationError: null });
			},
			markSaved(data) {
				set((state) => {
					const savedAt = data?.updatedAt ?? new Date().toISOString();
					const nextType = (data?.type || state.type) as NewSalesFormType;
					const nextMeta = data?.form || data?.meta;
					const hasReturnedFormState =
						!!nextMeta &&
						Array.isArray(data?.lineItems) &&
						Array.isArray(data?.extraCosts) &&
						!!data?.summary;

					if (hasReturnedFormState) {
						const hydrated = hydrateSalesFormRecord({
							type: nextType,
							salesId: data?.salesId ?? state.salesId,
							slug: data?.slug ?? state.slug,
							orderId: data?.orderId ?? state.orderId,
							inventoryStatus: data?.inventoryStatus ?? state.inventoryStatus,
							status: data?.status ?? state.status,
							version: data?.version ?? state.version,
							form: nextMeta,
							lineItems: data.lineItems || [],
							extraCosts: data.extraCosts || [],
							summary: data.summary,
							settings: data?.settings ?? state.settings,
							updatedAt: savedAt,
						});
						const shared = toSharedSalesFormState({
							type: (hydrated.type || nextType) as NewSalesFormType,
							salesId: hydrated.salesId ?? data?.salesId ?? state.salesId,
							slug: hydrated.slug ?? data?.slug ?? state.slug,
							orderId: hydrated.orderId ?? data?.orderId ?? state.orderId,
							inventoryStatus:
								hydrated.inventoryStatus ??
								data?.inventoryStatus ??
								state.inventoryStatus,
							status: hydrated.status ?? data?.status ?? state.status,
							version: hydrated.version ?? data?.version ?? state.version,
							settings: hydrated.settings ?? data?.settings ?? state.settings,
							meta: hydrated.form as NewSalesFormMeta,
							lineItems: hydrated.lineItems as NewSalesFormLineItem[],
							extraCosts: hydrated.extraCosts as NewSalesFormExtraCost[],
							summary: hydrated.summary as NewSalesFormSummary,
							saveStatus: "saved",
							dirty: false,
							lastSavedAt: savedAt,
						});

						return {
							type: (hydrated.type || nextType) as NewSalesFormType,
							salesId: hydrated.salesId ?? data?.salesId ?? state.salesId,
							slug: hydrated.slug ?? data?.slug ?? state.slug,
							version: hydrated.version ?? data?.version ?? state.version,
							...fromSharedSalesFormState(shared),
							validationError: null,
						};
					}

					return {
						saveStatus: "saved",
						dirty: false,
						validationError: null,
						slug: data?.slug ?? state.slug,
						salesId: data?.salesId ?? state.salesId,
						orderId: data?.orderId ?? state.orderId,
						inventoryStatus: data?.inventoryStatus ?? state.inventoryStatus,
						status: data?.status ?? state.status,
						version: data?.version ?? state.version,
						lineItems: Array.isArray(data?.lineItems)
							? (normalizeSalesFormLineItems(
									data.lineItems || [],
								) as NewSalesFormLineItem[])
							: state.lineItems,
						extraCosts: Array.isArray(data?.extraCosts)
							? (normalizeSalesFormExtraCosts(
									data.extraCosts || [],
								) as NewSalesFormExtraCost[])
							: state.extraCosts,
						summary: (data?.summary as NewSalesFormSummary) ?? state.summary,
						taxRate: Number(data?.summary?.taxRate ?? state.taxRate),
						lastSavedAt: savedAt,
					};
				});
			},
			markError(message) {
				set({ saveStatus: "error", validationError: message ?? null });
			},
			markStale(message) {
				set({ saveStatus: "stale", validationError: message ?? null });
			},
			reset() {
				const initialData = createInitialData();
				set({
					step: "customer",
					type: "order",
					slug: null,
					salesId: null,
					orderId: null,
					inventoryStatus: null,
					status: null,
					version: null,
					settings: initialData.settings,
					meta: normalizeSalesFormMeta(defaultInvoiceMeta) as NewSalesFormMeta,
					customer: null,
					lineItems: initialData.lineItems,
					extraCosts: initialData.extraCosts,
					summary: initialData.summary,
					taxRate: initialData.taxRate,
					dirty: false,
					saveStatus: "idle",
					validationError: null,
					lastSavedAt: null,
					selectorOpen: false,
					workflowSelectorLineUid: null,
				});
			},
		},
	};
});

export const invoiceFormSteps = steps;

function recomputeSharedSummary(shared: MobileSalesFormState) {
	const record = shared.record;
	if (!record) return shared;
	return setSalesFormSummary(
		shared,
		calculateInvoiceSummary({
			lineItems: record.lineItems as NewSalesFormLineItem[],
			extraCosts: record.extraCosts as NewSalesFormExtraCost[],
			taxRate: Number(record.summary?.taxRate || 0),
			paymentMethod: record.form?.paymentMethod ?? null,
			cccPercentage: record.settings?.cccPercentage ?? null,
		}),
	);
}

function mapRecordCustomer(value: unknown): InvoiceCustomer | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const customer = value as Record<string, unknown>;
	const id = Number(customer.id ?? customer.customerId ?? 0);
	if (!Number.isFinite(id) || id <= 0) return null;
	const name = String(customer.businessName || customer.name || "Customer");
	return {
		id,
		profileId:
			customer.profileId == null ? null : Number(customer.profileId || 0),
		name,
		businessName: String(customer.businessName || ""),
		contact: String(customer.name || customer.contact || name),
		phone: String(customer.phone || customer.phoneNo || ""),
		email: String(customer.email || ""),
		billingAddressId: Number(customer.billingAddressId || 0),
		shippingAddressId: Number(customer.shippingAddressId || 0),
		billingAddress: String(customer.billingAddress || ""),
		shippingAddress: String(customer.shippingAddress || ""),
		taxCode: String(customer.taxCode || ""),
	};
}

function mapResolvedCustomer(
	value: InvoiceResolvedCustomer,
	fallback: InvoiceCustomer | null,
): InvoiceCustomer | null {
	const id = Number(value.customerId ?? fallback?.id ?? 0);
	if (!Number.isFinite(id) || id <= 0) return fallback;
	const billingAddress = (value.billing?.lines || []).join(", ");
	const shippingLines = value.shipping?.lines || [];
	const shippingAddress =
		shippingLines.length === 1 && shippingLines[0] === "same as billing"
			? billingAddress
			: shippingLines.join(", ");
	const name = value.customer?.name || fallback?.name || "Customer";

	return {
		id,
		profileId: value.profileId ?? fallback?.profileId ?? null,
		name,
		businessName: fallback?.businessName ?? null,
		contact: String(value.customer?.name || fallback?.contact || name),
		phone: String(value.customer?.phone || fallback?.phone || ""),
		email: String(value.customer?.email || fallback?.email || ""),
		billingAddressId:
			Number(
				value.billing?.id ?? value.billingId ?? fallback?.billingAddressId ?? 0,
			) || 0,
		shippingAddressId:
			Number(
				value.shipping?.id ??
					value.shippingId ??
					fallback?.shippingAddressId ??
					0,
			) || 0,
		billingAddress: billingAddress || fallback?.billingAddress || "",
		shippingAddress: shippingAddress || fallback?.shippingAddress || "",
		paymentTerm: normalizeSalesFormPaymentTerm(
			value.netTerm,
			fallback?.paymentTerm,
		),
		taxCode: value.taxCode ?? fallback?.taxCode ?? null,
	};
}

function areInvoiceCustomersEqual(
	left: InvoiceCustomer | null,
	right: InvoiceCustomer | null,
) {
	if (left === right) return true;
	if (!left || !right) return false;
	return (
		left.id === right.id &&
		left.profileId === right.profileId &&
		left.name === right.name &&
		left.businessName === right.businessName &&
		left.contact === right.contact &&
		left.phone === right.phone &&
		left.email === right.email &&
		left.billingAddressId === right.billingAddressId &&
		left.shippingAddressId === right.shippingAddressId &&
		left.billingAddress === right.billingAddress &&
		left.shippingAddress === right.shippingAddress &&
		left.paymentTerm === right.paymentTerm &&
		left.taxCode === right.taxCode
	);
}

function buildMergedLineItemPatch(
	existing: NewSalesFormLineItem,
	item: NewSalesFormLineItem,
) {
	const qty = Number(existing.qty || 0) + Number(item.qty || 0);
	const incomingShelf = Array.isArray(item.shelfItems) ? item.shelfItems : [];
	const existingShelf = Array.isArray(existing.shelfItems)
		? existing.shelfItems
		: [];

	if (!incomingShelf.length && !existingShelf.length) {
		const unitPrice = Number(item.unitPrice ?? existing.unitPrice ?? 0);
		const lineTotal = multiplyMoney(qty, unitPrice);
		return { qty, unitPrice, lineTotal };
	}

	const incomingRow = incomingShelf[0] as Record<string, unknown> | undefined;
	const productId = Number(incomingRow?.productId || 0);
	const shelfItems = existingShelf.length
		? [...existingShelf]
		: [...incomingShelf];
	const targetIndex = productId
		? shelfItems.findIndex((row) => readShelfProductId(row) === productId)
		: 0;
	const index = targetIndex >= 0 ? targetIndex : 0;
	const currentRow = (shelfItems[index] || incomingRow || {}) as Record<
		string,
		unknown
	>;
	const nextRow = patchShelfRowQty(currentRow as ShelfRowDraft, qty);
	const unitPrice = Number(nextRow.unitPrice || 0);
	const lineTotal = Number(nextRow.totalPrice || 0);

	shelfItems[index] = nextRow;

	return { qty, unitPrice, lineTotal, shelfItems };
}

function buildLineQtyPatch(line: NewSalesFormLineItem, qty: number) {
	const unitPrice = Number(line.unitPrice || 0);
	const lineTotal = multiplyMoney(qty, unitPrice);
	const shelfItems = syncShelfRowsToLineQty(line, qty);
	if (shelfItems) {
		const firstRow = shelfItems[0] as ShelfRowDraft | undefined;
		return {
			qty,
			unitPrice: Number(firstRow?.unitPrice ?? unitPrice),
			lineTotal: Number(firstRow?.totalPrice ?? lineTotal),
			shelfItems,
		};
	}
	return { qty, lineTotal };
}

function buildLineUnitPricePatch(
	line: NewSalesFormLineItem,
	unitPrice: number,
) {
	const qty = Number(line.qty || 0);
	const lineTotal = multiplyMoney(qty, unitPrice);
	const shelfItems = syncShelfRowsToLinePrice(line, qty, unitPrice);
	if (shelfItems) {
		const firstRow = shelfItems[0] as ShelfRowDraft | undefined;
		return {
			qty,
			unitPrice: Number(firstRow?.unitPrice ?? unitPrice),
			lineTotal: Number(firstRow?.totalPrice ?? lineTotal),
			shelfItems,
		};
	}
	return { unitPrice, lineTotal };
}

function buildLineTotalPatch(line: NewSalesFormLineItem, lineTotal: number) {
	const qty = Number(line.qty || 0);
	const unitPrice = qty > 0 ? divideMoney(lineTotal, qty) : 0;
	const shelfItems = syncShelfRowsToLinePrice(line, qty, unitPrice);
	if (shelfItems) {
		const firstRow = shelfItems[0] as ShelfRowDraft | undefined;
		return {
			qty,
			unitPrice: Number(firstRow?.unitPrice ?? unitPrice),
			lineTotal: Number(firstRow?.totalPrice ?? lineTotal),
			shelfItems,
		};
	}
	return { unitPrice, lineTotal };
}

function buildLineTitlePatch(line: NewSalesFormLineItem, title: string) {
	const shelfItems = syncShelfRowsToLineDescription(line, title);
	return shelfItems ? { title, shelfItems } : { title };
}

function buildLineDescriptionPatch(
	line: NewSalesFormLineItem,
	description: string,
) {
	const shelfItems = syncShelfRowsToLineDescription(line, description);
	return shelfItems ? { description, shelfItems } : { description };
}

function isWorkflowLineItem(line: NewSalesFormLineItem) {
	const meta = readSalesFormObjectMetadata(line.meta) || {};
	return (
		Boolean(meta.workflowComponentUid) ||
		(Array.isArray(line.formSteps) && line.formSteps.length > 0)
	);
}

function buildLineTaxablePatch(line: NewSalesFormLineItem, taxxable: boolean) {
	const meta: Record<string, unknown> & {
		serviceRows?: unknown[];
		taxxable: boolean;
	} = {
		...(readSalesFormObjectMetadata(line.meta) || {}),
		taxxable,
	};
	const serviceRows = Array.isArray(meta.serviceRows)
		? meta.serviceRows.map((row) => ({
				...(row as Record<string, unknown>),
				taxxable,
			}))
		: null;

	return {
		taxxable,
		meta: serviceRows ? { ...meta, serviceRows } : meta,
	};
}

function readShelfProductId(row: unknown) {
	if (!row || typeof row !== "object") return 0;
	return Number((row as { productId?: unknown }).productId || 0);
}

function syncShelfRowsToLineQty(line: NewSalesFormLineItem, qty: number) {
	const shelfItems = Array.isArray(line.shelfItems) ? line.shelfItems : [];
	if (!shelfItems.length) return null;

	return shelfItems.map((row, index) => {
		if (index > 0) return row;
		return patchShelfRowQty(row as ShelfRowDraft, qty);
	});
}

function syncShelfRowsToLinePrice(
	line: NewSalesFormLineItem,
	qty: number,
	unitPrice: number,
) {
	const shelfItems = Array.isArray(line.shelfItems) ? line.shelfItems : [];
	if (!shelfItems.length) return null;

	return shelfItems.map((row, index) => {
		if (index > 0) return row;
		return patchShelfRowQty(
			patchShelfRowPrice(row as ShelfRowDraft, unitPrice),
			qty,
		);
	});
}

function syncShelfRowsToLineDescription(
	line: NewSalesFormLineItem,
	description: string,
) {
	const shelfItems = Array.isArray(line.shelfItems) ? line.shelfItems : [];
	if (!shelfItems.length) return null;

	return shelfItems.map((row, index) => {
		if (index > 0) return row;
		return {
			...(row as Record<string, unknown>),
			description,
		};
	});
}
