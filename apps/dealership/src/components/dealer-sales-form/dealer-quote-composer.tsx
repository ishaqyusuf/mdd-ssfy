"use client";

import { useTRPC } from "@/trpc/client";
import {
	type DealerSalesFormQuotePricingContext,
	SalesFormFloatingActions,
	SalesFormHeaderActions,
	SalesFormShell,
	CostPriceBreakdownHover,
	buildSalesFormTaxSelectOptions,
	composeDealerSalesFormQuotePricing,
	composeDealerSalesFormQuoteSaveInput,
	normalizeSalesFormTaxOptions,
	resolveDealerSalesFormStructuredLineTotal,
	resolveSalesFormTaxRateByCode,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSalesFormActions } from "./adapters/use-sales-form-actions";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useDealerSalesFormData } from "./adapters/use-sales-form-data";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import { useDealerSalesFormState } from "./adapters/use-sales-form-state";
import { DealerCustomerSelectorDialog } from "./dealer-customer-selector-dialog";
import { dealerPricingTerms } from "./dealer-pricing-terms";
import { DealerQuoteMainPanel } from "./dealer-quote-main-panel";
import { DealerQuoteSkeleton } from "./dealer-quote-skeleton";
import { DealerQuoteSummaryPanel } from "./dealer-quote-summary-panel";
import type {
	DealerInternalSalesFormProfile,
	DealerSalesFormCustomer,
	DealerSalesFormProfile,
	DealerSalesFormRecord,
} from "./types";

type DealerQuoteComposerProps = {
	quoteId?: number | null;
	mode?: "create" | "edit";
	onSavedHref?: string;
	initialCustomerId?: number | null;
};

function getLineTitlePlaceholder(line: {
	title?: string | null;
	formSteps?: Array<{
		step?: { title?: string | null } | null;
		title?: string | null;
		value?: string | null;
		prodUid?: string | null;
	}> | null;
}) {
	const explicitTitle = String(line?.title || "").trim();
	if (explicitTitle) return explicitTitle;
	const itemTypeStep = (line?.formSteps || []).find(
		(step) =>
			String(step?.step?.title || "")
				.trim()
				.toLowerCase() === "item type",
	);
	return String(
		itemTypeStep?.value || itemTypeStep?.title || itemTypeStep?.prodUid || "",
	).trim();
}

function lineItemPickerLabel(
	line: {
		title?: string | null;
		formSteps?: Array<{
			step?: { title?: string | null } | null;
			title?: string | null;
			value?: string | null;
			prodUid?: string | null;
		}> | null;
	},
	index: number,
) {
	const placeholder = getLineTitlePlaceholder(line);
	return placeholder
		? `Item ${index + 1} (${placeholder})`
		: `Item ${index + 1}`;
}

function finiteNumber(value: unknown) {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function pricingChanged(saved?: number | null, current?: number | null) {
	if (saved == null || current == null) return false;
	return Math.abs(Number(saved) - Number(current)) > 0.0001;
}

function objectValue(value: unknown) {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function positiveNumber(...values: unknown[]) {
	for (const value of values) {
		const number = Number(value);
		if (Number.isFinite(number) && number > 0) return number;
	}
	return 0;
}

function quantityValue(value: unknown) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatDealerCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function resolveDealerQuoteOfficeCostSubtotal(
	lineItems: DealerSalesFormRecord["lineItems"] = [],
) {
	return Number(
		lineItems
			.reduce((sum, line) => {
				const meta = objectValue(line.meta);
				if (Array.isArray(line.shelfItems) && line.shelfItems.length) {
					return (
						sum +
						line.shelfItems.reduce((lineSum, row) => {
							const rowMeta = objectValue(row?.meta);
							return (
								lineSum +
								quantityValue(row?.qty) *
									positiveNumber(
										row?.basePrice,
										rowMeta.basePrice,
										row?.unitPrice,
									)
							);
						}, 0)
					);
				}
				const hptDoors = Array.isArray(line.housePackageTool?.doors)
					? line.housePackageTool.doors
					: [];
				if (hptDoors.length) {
					return (
						sum +
						hptDoors.reduce((lineSum, row) => {
							const rowMeta = objectValue(row?.meta);
							return (
								lineSum +
								quantityValue(row?.totalQty) *
									positiveNumber(rowMeta.baseUnitPrice, row?.unitPrice)
							);
						}, 0)
					);
				}
				const mouldingRows = Array.isArray(meta.mouldingRows)
					? meta.mouldingRows
					: [];
				if (mouldingRows.length) {
					return (
						sum +
						mouldingRows.reduce((lineSum, row) => {
							const rowRecord = objectValue(row);
							return (
								lineSum +
								quantityValue(rowRecord.qty) *
									positiveNumber(
										rowRecord.basePrice,
										rowRecord.estimateUnit,
										rowRecord.unitPrice,
									)
							);
						}, 0)
					);
				}
				const serviceRows = Array.isArray(meta.serviceRows)
					? meta.serviceRows
					: [];
				if (serviceRows.length) {
					return (
						sum +
						serviceRows.reduce((lineSum, row) => {
							const rowRecord = objectValue(row);
							return (
								lineSum +
								quantityValue(rowRecord.qty) *
									positiveNumber(rowRecord.basePrice, rowRecord.unitPrice)
							);
						}, 0)
					);
				}
				return (
					sum +
					quantityValue(line.qty) *
						positiveNumber(line.basePrice, meta.basePrice, line.unitPrice)
				);
			}, 0)
			.toFixed(2),
	);
}

function getDealerSettingsDefaults(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return {
			defaultTaxCode: null,
			defaultCustomerProfileId: null,
			defaultFulfillmentMode: null,
		};
	}
	const settings = meta as {
		defaultTaxCode?: unknown;
		defaultCustomerProfileId?: unknown;
		defaultFulfillmentMode?: unknown;
	};
	const defaultCustomerProfileId = Number(settings.defaultCustomerProfileId);
	return {
		defaultTaxCode:
			typeof settings.defaultTaxCode === "string" &&
			settings.defaultTaxCode.trim()
				? settings.defaultTaxCode.trim()
				: null,
		defaultCustomerProfileId: Number.isFinite(defaultCustomerProfileId)
			? defaultCustomerProfileId
			: null,
		defaultFulfillmentMode:
			typeof settings.defaultFulfillmentMode === "string" &&
			settings.defaultFulfillmentMode.trim()
				? settings.defaultFulfillmentMode.trim()
				: null,
	};
}

export function DealerQuoteComposer({
	quoteId = null,
	mode,
	onSavedHref = "/quotes",
	initialCustomerId = null,
}: DealerQuoteComposerProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const editingQuoteId = mode === "edit" ? quoteId : null;
	const [, setQuoteCustomerParams] = useQueryStates({
		selectedCustomerId: parseAsInteger,
	});
	const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
	const [showMargin, setShowMargin] = useState(false);
	const [pricingView, setPricingView] = useState<"internal" | "dealer">(
		"dealer",
	);
	const [pricingSnapshotChoice, setPricingSnapshotChoice] = useState<
		"saved" | "current" | null
	>(null);
	const [selectedCustomerOverride, setSelectedCustomerOverride] =
		useState<DealerSalesFormCustomer | null>(null);
	const defaultTaxCodeRef = useRef<string | null>(null);
	const defaultTaxCodeCapturedRef = useRef(false);
	const taxDefaultCustomerIdRef = useRef<number | null>(null);
	const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const taxProfilesQuery = useQuery(
		trpc.dealerPortal.taxProfiles.queryOptions(),
	);
	const settingsQuery = useQuery(trpc.dealerPortal.settings.queryOptions());
	const dealerQuery = useQuery(trpc.dealerPortal.me.queryOptions());
	const internalProfileQuery = useQuery(
		trpc.dealerPortal.internalSalesProfile.queryOptions(),
	);
	const quoteQuery = useQuery(
		trpc.dealerPortal.salesDocument.queryOptions(
			{ id: editingQuoteId || 0 },
			{ enabled: Boolean(editingQuoteId) },
		),
	);
	const form = useDealerSalesFormState(initialCustomerId);
	const actions = useSalesFormActions(form);
	const capabilities = useSalesFormCapabilities();
	const permissions = useSalesFormPermissions();
	const saveQuote = useMutation(
		trpc.dealerPortal.saveQuote.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.salesDocuments.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.quotes.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.customersList.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				toast({
					title: `Quote ${result.orderId} saved.`,
					variant: "success",
				});
				const savedHref = result.orderId
					? `/quotes/${encodeURIComponent(result.orderId)}/edit`
					: onSavedHref;
				router.replace(savedHref);
				router.refresh();
			},
			onError: (error) => {
				toast({
					title: "Could not save quote.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		if (editingQuoteId && !quoteQuery.data) return;
		form.hydrateQuote(editingQuoteId ? quoteQuery.data : null);
		setPricingSnapshotChoice(null);
	}, [editingQuoteId, form.hydrateQuote, quoteQuery.data]);

	const customers = (customersQuery.data ?? []) as DealerSalesFormCustomer[];
	const profiles = (profilesQuery.data ?? []) as DealerSalesFormProfile[];
	const taxOptions = useMemo(
		() => normalizeSalesFormTaxOptions(taxProfilesQuery.data || []),
		[taxProfilesQuery.data],
	);
	const taxSelectOptions = useMemo(
		() => buildSalesFormTaxSelectOptions(taxOptions),
		[taxOptions],
	);
	const dealerDefaults = getDealerSettingsDefaults(settingsQuery.data?.meta);
	const internalProfile =
		(internalProfileQuery.data as DealerInternalSalesFormProfile | null) ||
		null;
	const dealer = dealerQuery.data;
	const dealerName =
		dealer?.companyName ||
		dealer?.dealer?.businessName ||
		dealer?.name ||
		dealer?.dealer?.name ||
		dealer?.email ||
		null;
	const record = form.record;
	const customerId = record?.form.customerId || null;
	const selectedCustomer =
		customers.find((customer) => customer.id === customerId) ||
		(selectedCustomerOverride?.id === customerId
			? selectedCustomerOverride
			: null);
	const defaultProfile =
		profiles.find(
			(profile) => profile.id === dealerDefaults.defaultCustomerProfileId,
		) ||
		profiles.find((profile) => profile.defaultProfile) ||
		profiles[0] ||
		null;
	const selectedCustomerProfile =
		profiles.find(
			(profile) => profile.id === selectedCustomer?.customerTypeId,
		) || null;
	const selectedProfile =
		profiles.find((profile) => profile.id === record?.form.customerProfileId) ||
		selectedCustomerProfile ||
		defaultProfile ||
		null;
	const loadedPricingContext =
		(
			quoteQuery.data as
				| { pricingContext?: DealerSalesFormQuotePricingContext | null }
				| undefined
		)?.pricingContext || null;
	const loadedDealerProfileId = finiteNumber(
		loadedPricingContext?.dealer?.dealerCustomerProfileId,
	);
	const selectedProfileId = finiteNumber(record?.form.customerProfileId);
	const profileChangedFromLoaded =
		Boolean(loadedDealerProfileId && selectedProfileId) &&
		loadedDealerProfileId !== selectedProfileId;
	const savedSalesCoefficient = finiteNumber(
		loadedPricingContext?.internal?.savedCoefficient,
	);
	const currentSalesCoefficient =
		finiteNumber(loadedPricingContext?.internal?.currentCoefficient) ??
		finiteNumber(internalProfile?.coefficient);
	const savedDealerSalesPercentage = finiteNumber(
		loadedPricingContext?.dealer?.savedSalesPercentage,
	);
	const currentDealerSalesPercentage =
		finiteNumber(loadedPricingContext?.dealer?.currentSalesPercentage) ??
		finiteNumber(selectedProfile?.salesPercentage);
	const hasPricingSnapshotChange =
		Boolean(editingQuoteId && !profileChangedFromLoaded) &&
		(Boolean(loadedPricingContext?.internal?.hasChanged) ||
			Boolean(loadedPricingContext?.dealer?.hasChanged) ||
			pricingChanged(savedSalesCoefficient, currentSalesCoefficient) ||
			pricingChanged(savedDealerSalesPercentage, currentDealerSalesPercentage));
	const useSavedPricingSnapshot =
		hasPricingSnapshotChange && pricingSnapshotChoice !== "current";
	const effectiveSalesCoefficient =
		useSavedPricingSnapshot && savedSalesCoefficient != null
			? savedSalesCoefficient
			: currentSalesCoefficient;
	const effectiveDealerSalesPercentage =
		useSavedPricingSnapshot && savedDealerSalesPercentage != null
			? savedDealerSalesPercentage
			: currentDealerSalesPercentage;
	const effectiveInternalProfile = useMemo(
		() =>
			internalProfile
				? {
						...internalProfile,
						coefficient:
							effectiveSalesCoefficient ?? internalProfile.coefficient ?? null,
					}
				: internalProfile,
		[effectiveSalesCoefficient, internalProfile],
	);
	const effectiveDealerProfile = useMemo(
		() =>
			selectedProfile
				? {
						...selectedProfile,
						salesPercentage:
							effectiveDealerSalesPercentage ??
							selectedProfile.salesPercentage ??
							null,
					}
				: selectedProfile,
		[effectiveDealerSalesPercentage, selectedProfile],
	);

	useEffect(() => {
		if (!record?.form.customerId || record.form.customerProfileId) return;
		const nextProfileId =
			selectedCustomer?.customerTypeId ||
			dealerDefaults.defaultCustomerProfileId ||
			defaultProfile?.id ||
			null;
		if (!nextProfileId) return;
		form.setCustomer(record.form.customerId, nextProfileId);
	}, [
		defaultProfile?.id,
		dealerDefaults.defaultCustomerProfileId,
		form.setCustomer,
		record?.form.customerId,
		record?.form.customerProfileId,
		selectedCustomer?.customerTypeId,
	]);

	const salesFormData = useDealerSalesFormData({
		customers,
		profiles,
		record,
		isLoading:
			customersQuery.isPending ||
			profilesQuery.isPending ||
			taxProfilesQuery.isPending ||
			settingsQuery.isPending ||
			internalProfileQuery.isPending,
	});
	const selectedTaxCode = record?.form.taxCode ?? null;
	const selectedTaxRate = Number(record?.summary?.taxRate || 0);

	useEffect(() => {
		if (!record || taxProfilesQuery.isPending) return;
		const nextRate = resolveSalesFormTaxRateByCode(taxOptions, selectedTaxCode);
		if (nextRate === selectedTaxRate) return;
		form.setTaxRate(nextRate);
	}, [
		form.setTaxRate,
		record,
		selectedTaxCode,
		selectedTaxRate,
		taxOptions,
		taxProfilesQuery.isPending,
	]);
	const pricing = useMemo(
		() =>
			composeDealerSalesFormQuotePricing({
				taxRate: selectedTaxRate,
				lineItems: record?.lineItems || [],
				dealerProfile: effectiveDealerProfile,
				internalProfile: effectiveInternalProfile,
			}),
		[
			effectiveDealerProfile,
			effectiveInternalProfile,
			record?.lineItems,
			selectedTaxRate,
		],
	);
	const lineTotalsByUid = useMemo(() => {
		const pricingLinesByUid = new Map(
			pricing.lines.map((line) => [line.uid, line]),
		);
		return Object.fromEntries(
			(record?.lineItems || []).map((line) => {
				const structuredLineTotal =
					resolveDealerSalesFormStructuredLineTotal(line);
				const pricingLine = pricingLinesByUid.get(line.uid);
				return [
					line.uid,
					structuredLineTotal ??
						(pricingView === "internal"
							? pricingLine?.internalLineTotal
							: pricingLine?.dealerLineTotal) ??
						Number(line.qty || 0) * Number(line.unitPrice || 0),
				];
			}),
		);
	}, [pricing.lines, pricingView, record?.lineItems]);
	const activePricing =
		pricingView === "internal"
			? pricing.internalPricing
			: pricing.dealerPricing;
	const officeCostSubtotal = useMemo(
		() => resolveDealerQuoteOfficeCostSubtotal(record?.lineItems || []),
		[record?.lineItems],
	);
	const totalBreakdownContext = {
		enabled: process.env.NODE_ENV !== "production",
		internalProfileCoefficient: effectiveSalesCoefficient,
		dealerSalesPercentage: effectiveDealerSalesPercentage,
		internalProfileLabel: effectiveInternalProfile?.title || null,
		dealerProfileLabel: effectiveDealerProfile?.title || null,
		labels: {
			priceBreakdown: dealerPricingTerms.priceBreakdown,
			costPrice: dealerPricingTerms.costView,
			dealerProfile: "Dealer profile",
			dealerProfileSalesPrice: "Dealer sales price",
			customerProfile: "Customer profile",
			customerSalesPrice: "Customer sales price",
			displayedPrice: "Displayed total",
		},
	};
	const grandTotalValue =
		process.env.NODE_ENV !== "production" ? (
			<CostPriceBreakdownHover
				breakdown={{
					costPrice: officeCostSubtotal,
					displayPrice: activePricing.grandTotal,
				}}
				context={totalBreakdownContext}
			>
				<span>{formatDealerCurrency(activePricing.grandTotal)}</span>
			</CostPriceBreakdownHover>
		) : undefined;
	const margin = useMemo(() => {
		const internalSubtotal = Number(pricing.internalPricing.subTotal || 0);
		const dealerSubtotal = Number(pricing.dealerPricing.subTotal || 0);
		const grossProfit = dealerSubtotal - internalSubtotal;
		return {
			internalSubtotal,
			dealerSubtotal,
			grossProfit,
			marginPercent: dealerSubtotal ? (grossProfit / dealerSubtotal) * 100 : 0,
			dealerSalesPercentage: Number(
				pricing.profiles.dealer.salesPercentage || 0,
			),
		};
	}, [pricing]);
	const itemOptions = useMemo(
		() =>
			(record?.lineItems || []).map((line, index) => ({
				uid: line.uid,
				label: lineItemPickerLabel(line, index),
			})),
		[record?.lineItems],
	);
	const isEditQuoteLoading =
		Boolean(editingQuoteId) &&
		(quoteQuery.isPending ||
			(quoteQuery.isSuccess &&
				Boolean(quoteQuery.data) &&
				record?.id !== editingQuoteId));
	const isInitialLoading =
		customersQuery.isPending ||
		profilesQuery.isPending ||
		taxProfilesQuery.isPending ||
		settingsQuery.isPending ||
		internalProfileQuery.isPending ||
		isEditQuoteLoading;

	useEffect(() => {
		if (defaultTaxCodeCapturedRef.current) return;
		if (!record || settingsQuery.isPending || isEditQuoteLoading) return;
		defaultTaxCodeRef.current = dealerDefaults.defaultTaxCode;
		defaultTaxCodeCapturedRef.current = true;
	}, [
		dealerDefaults.defaultTaxCode,
		isEditQuoteLoading,
		record,
		settingsQuery.isPending,
	]);

	useEffect(() => {
		if (!record || editingQuoteId || form.state.dirty) return;
		const defaultFulfillmentMode = dealerDefaults.defaultFulfillmentMode;
		if (!defaultFulfillmentMode || record.form.deliveryOption !== "pickup") {
			return;
		}
		form.setMeta({ deliveryOption: defaultFulfillmentMode });
	}, [
		dealerDefaults.defaultFulfillmentMode,
		editingQuoteId,
		form.setMeta,
		form.state.dirty,
		record,
	]);

	useEffect(() => {
		if (!record?.form.customerId || record.form.taxCode) return;
		if (taxDefaultCustomerIdRef.current === record.form.customerId) return;
		const nextTaxCode =
			selectedCustomer?.taxCode || dealerDefaults.defaultTaxCode || null;
		if (!nextTaxCode) return;
		taxDefaultCustomerIdRef.current = record.form.customerId;
		form.setMeta({ taxCode: nextTaxCode });
		form.setTaxRate(resolveSalesFormTaxRateByCode(taxOptions, nextTaxCode));
	}, [
		dealerDefaults.defaultTaxCode,
		form.setMeta,
		form.setTaxRate,
		record?.form.customerId,
		record?.form.taxCode,
		selectedCustomer?.taxCode,
		taxOptions,
	]);

	function applyTaxCode(taxCode?: string | null) {
		const nextTaxCode = taxCode || null;
		form.setMeta({ taxCode: nextTaxCode });
		form.setTaxRate(resolveSalesFormTaxRateByCode(taxOptions, nextTaxCode));
	}

	function resetComposer() {
		form.reset();
		router.push("/quotes/new");
	}

	function save() {
		if (!record?.form.customerId) {
			toast({
				title: "Select a customer first.",
				variant: "destructive",
			});
			return;
		}
		if (!selectedProfile?.id) {
			toast({
				title: "Assign the dealer customer profile first.",
				description:
					"This dealer needs a primary customer profile before quotes can be saved.",
				variant: "destructive",
			});
			return;
		}

		const payload = composeDealerSalesFormQuoteSaveInput({
			record,
			id: editingQuoteId,
			customerProfileId: selectedProfile.id,
			lineTotalsByUid,
			pricingContext: {
				salesCoefficient: effectiveSalesCoefficient,
				dealerSalesPercentage: effectiveDealerSalesPercentage,
			},
		});
		if (!payload) return;
		saveQuote.mutate(payload);
	}

	if (isInitialLoading || !record) return <DealerQuoteSkeleton />;

	return (
		<SalesFormShell
			mode={editingQuoteId ? "edit" : "create"}
			type="quote"
			record={record}
			state={form.state}
			data={salesFormData}
			actions={actions}
			grandTotal={activePricing.grandTotal}
			isSaved={Boolean(editingQuoteId)}
			isSaving={saveQuote.isPending || quoteQuery.isFetching}
			mobileSummaryOpen={form.state.editor.showMobileSummary}
			mobileSaveLabel={editingQuoteId ? "Update quote" : "Save quote"}
			surface="fixed"
			showMobileFooter
			capabilities={capabilities}
			permissions={permissions}
			onSaveDraft={save}
			onSaveFinal={save}
			onOpenSummary={() => form.setEditor({ showMobileSummary: true })}
			onCloseSummary={() => form.setEditor({ showMobileSummary: false })}
			slots={{
				MainPanel: (
					<DealerQuoteMainPanel
						record={record}
						onAddLineItem={actions.addLineItem}
						onRemoveLineItem={actions.removeLineItem}
						onUpdateLineItem={actions.updateLineItem}
						lineTotalsByUid={lineTotalsByUid}
						pricingView={pricingView}
						profileCoefficient={effectiveSalesCoefficient}
						internalProfileLabel={effectiveInternalProfile?.title || null}
						dealerSalesPercentage={effectiveDealerSalesPercentage}
						dealerProfileLabel={effectiveDealerProfile?.title || null}
					/>
				),
				SummaryPanel: (
					<DealerQuoteSummaryPanel
						dealerEmail={dealer?.email || null}
						dealerName={dealerName}
						customer={selectedCustomer}
						profiles={selectedProfile ? [selectedProfile] : profiles}
						internalProfile={internalProfile}
						customerProfileId={selectedProfile?.id ?? null}
						costSubTotal={officeCostSubtotal}
						salesCoefficient={effectiveSalesCoefficient}
						deliveryOption={record.form.deliveryOption}
						goodUntil={record.form.goodUntil}
						grandTotal={activePricing.grandTotal}
						internalSubTotal={margin.internalSubtotal}
						dealerSubTotal={margin.dealerSubtotal}
						grossProfit={margin.grossProfit}
						marginPercent={margin.marginPercent}
						dealerSalesPercentage={margin.dealerSalesPercentage}
						internalProfileLabel={effectiveInternalProfile?.title || null}
						dealerProfileLabel={effectiveDealerProfile?.title || null}
						pricingView={pricingView}
						paymentTerm={record.form.paymentTerm}
						po={record.form.po}
						showMargin={showMargin}
						taxCode={selectedTaxCode}
						taxOptions={taxSelectOptions}
						isEditing={Boolean(editingQuoteId)}
						isFetching={quoteQuery.isFetching}
						isSaving={saveQuote.isPending}
						canSave={Boolean(customerId && selectedProfile?.id)}
						showDealerProfileCard={process.env.NODE_ENV !== "production"}
						onChangeCustomer={() => setCustomerSelectorOpen(true)}
						onDeliveryOptionChange={(deliveryOption) =>
							form.setMeta({ deliveryOption })
						}
						onGoodUntilChange={(goodUntil) =>
							form.setMeta({
								goodUntil: goodUntil ? new Date(goodUntil).toISOString() : null,
							})
						}
						onPaymentTermChange={(paymentTerm) => form.setMeta({ paymentTerm })}
						onPoChange={(po) => form.setMeta({ po })}
						onProfileChange={(profileId) => {
							setPricingSnapshotChoice("current");
							form.setCustomerProfile(profileId);
						}}
						onPricingViewChange={setPricingView}
						onShowMarginChange={setShowMargin}
						onTaxCodeChange={(taxCode) => {
							form.setMeta({ taxCode });
							form.setTaxRate(
								resolveSalesFormTaxRateByCode(taxOptions, taxCode),
							);
						}}
						onSave={save}
						subTotal={activePricing.subTotal}
						taxTotal={activePricing.taxTotal}
					/>
				),
				CustomerSelectorDialog: (
					<DealerCustomerSelectorDialog
						open={customerSelectorOpen || !customerId}
						required={!customerId}
						customers={customers}
						onOpenChange={setCustomerSelectorOpen}
						onSelectCustomer={(customer) => {
							setSelectedCustomerOverride(customer);
							const customerProfile =
								profiles.find(
									(profile) => profile.id === customer.customerTypeId,
								) || defaultProfile;
							form.setCustomer(customer.id, customerProfile?.id || null);
							taxDefaultCustomerIdRef.current = customer.id;
							applyTaxCode(customer.taxCode || defaultTaxCodeRef.current);
							if (!editingQuoteId) {
								void setQuoteCustomerParams({
									selectedCustomerId: customer.id,
								});
							}
						}}
					/>
				),
				FloatingActions: (
					<SalesFormFloatingActions
						isSaved={Boolean(editingQuoteId)}
						isSaving={saveQuote.isPending || quoteQuery.isFetching}
						capabilities={capabilities}
						permissions={permissions}
						onAddItem={actions.addLineItem}
						onSaveDraft={save}
					/>
				),
				GrandTotalValue: grandTotalValue,
			}}
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
				<div>
					<p className="text-sm font-semibold">
						{editingQuoteId ? "Edit dealer quote" : "Create dealer quote"}
					</p>
					<p className="text-xs text-muted-foreground">
						{editingQuoteId
							? quoteQuery.data?.orderId || "Loading quote..."
							: "Build a customer-facing quote with dealer pricing."}
					</p>
				</div>
				{editingQuoteId ? (
					<Button
						disabled={saveQuote.isPending}
						onClick={resetComposer}
						size="sm"
						type="button"
						variant="outline"
					>
						New quote
					</Button>
				) : null}
			</div>
			<SalesFormHeaderActions
				orderId={record.orderId}
				dirty={form.state.dirty}
				isSaved={Boolean(editingQuoteId)}
				isSaving={saveQuote.isPending || quoteQuery.isFetching}
				lastSavedAt={form.state.lastSavedAt}
				statusMessage={form.state.lastSaveError}
				activeItem={
					form.state.editor.activeItem || record.lineItems[0]?.uid || null
				}
				itemOptions={itemOptions}
				onAddItem={actions.addLineItem}
				onActiveItemChange={(value) => form.setEditor({ activeItem: value })}
				onOpenMobileSummary={() =>
					form.setEditor({
						showMobileSummary: !form.state.editor.showMobileSummary,
					})
				}
				onSaveDraft={save}
				onSaveFinal={save}
				saveStatus={saveQuote.isPending ? "saving" : form.state.saveStatus}
				capabilities={capabilities}
				permissions={permissions}
				type="quote"
			/>
			<Dialog
				open={hasPricingSnapshotChange && pricingSnapshotChoice == null}
				onOpenChange={(open) => {
					if (!open) setPricingSnapshotChoice("saved");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pricing profile changed</DialogTitle>
						<DialogDescription>
							This quote was saved with older pricing values. Keep the saved
							values for this quote, or update the estimate to the current
							profile values.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 text-sm">
						{pricingChanged(savedSalesCoefficient, currentSalesCoefficient) ? (
							<div className="flex justify-between gap-4">
								<span>{dealerPricingTerms.costCoefficient}</span>
								<span className="font-medium">
									{savedSalesCoefficient} to {currentSalesCoefficient}
								</span>
							</div>
						) : null}
						{pricingChanged(
							savedDealerSalesPercentage,
							currentDealerSalesPercentage,
						) ? (
							<div className="flex justify-between gap-4">
								<span>{dealerPricingTerms.salesPriceMarkup}</span>
								<span className="font-medium">
									{savedDealerSalesPercentage}% to{" "}
									{currentDealerSalesPercentage}%
								</span>
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPricingSnapshotChoice("saved")}
						>
							Keep saved
						</Button>
						<Button
							type="button"
							onClick={() => setPricingSnapshotChoice("current")}
						>
							Update estimate
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SalesFormShell>
	);
}
