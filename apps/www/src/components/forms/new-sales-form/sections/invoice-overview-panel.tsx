"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { endFlow, logStage, startFlow } from "@/lib/dev-flow-logger";
import {
	SalesFormCreditLimitMeter,
	SalesFormCustomerOverviewCard,
	SalesFormDealerProfileCard,
	SalesFormInvoiceDetailsPanel,
	SalesFormPricingOverview,
	buildSalesFormProfileSelectOptions,
	buildSalesFormSelectOptions,
	buildSalesFormTaxSelectOptions,
	getDefaultSalesFormCustomerProfile,
	hasSalesFormSummaryDrift,
	normalizeSalesFormPaymentTerm,
	normalizeSalesFormTaxOptions,
	resolveSalesFormProfilePaymentTerm,
	resolveSalesFormTaxRateByCode,
	salesFormDeliveryOptions,
	salesFormPaymentMethods,
	salesFormPaymentTerms,
	type SalesFormSelectOption,
} from "@gnd/sales/sales-form";
import {
	useCustomerProfilesQuery,
	useCustomerTaxProfilesQuery,
	useNewSalesFormResolveCustomerQuery,
} from "../api";
import { useNewSalesFormStore } from "../store";
import { computeSummary, repriceLineItemsByProfile } from "../mappers";
import { CustomerSelectorDialog } from "./customer-selector-dialog";

interface Props {
	mode: "create" | "edit";
	type: "order" | "quote";
}

function formDateValue(value: string | null) {
	return value ? new Date(value).toISOString() : null;
}

export function InvoiceOverviewPanel(props: Props) {
	const record = useNewSalesFormStore((s) => s.record);
	const setMeta = useNewSalesFormStore((s) => s.setMeta);
	const setCustomerProfileMeta = useNewSalesFormStore(
		(s) => s.setCustomerProfileMeta,
	);
	const setTaxRate = useNewSalesFormStore((s) => s.setTaxRate);
	const setSummary = useNewSalesFormStore((s) => s.setSummary);
	const upsertExtraCost = useNewSalesFormStore((s) => s.upsertExtraCost);
	const lastProfileCoefficientRef = useRef<number | null | undefined>(
		undefined,
	);
	const lastProfileIdRef = useRef<number | null | undefined>(undefined);
	const pendingProfileRepriceRef = useRef(false);

	const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
	const customerProfiles = useCustomerProfilesQuery(true);
	const customerTaxProfiles = useCustomerTaxProfilesQuery(true);
	const profileOptions = useMemo(
		() => customerProfiles.data || [],
		[customerProfiles.data],
	);
	const taxOptions = useMemo(
		() => normalizeSalesFormTaxOptions(customerTaxProfiles.data || []),
		[customerTaxProfiles.data],
	);
	const resolvedCustomer = useNewSalesFormResolveCustomerQuery(
		{
			customerId: Number(record?.form.customerId || 0),
			billingId: record?.form.billingAddressId || undefined,
			shippingId: record?.form.shippingAddressId || undefined,
		},
		!!record?.form.customerId,
	);
	const customerId = record?.form.customerId ?? null;
	const customerProfileId = record?.form.customerProfileId ?? null;
	const billingAddressId = record?.form.billingAddressId ?? null;
	const shippingAddressId = record?.form.shippingAddressId ?? null;
	const paymentTerm = record?.form.paymentTerm ?? "None";
	const taxCode = record?.form.taxCode ?? null;
	const summaryTaxRate = Number(record?.summary?.taxRate || 0);
	const billingLines = ((resolvedCustomer.data as any)?.billing?.lines ||
		[]) as string[];
	const shippingLines = ((resolvedCustomer.data as any)?.shipping?.lines ||
		[]) as string[];

	function getProfileCoefficient(profileId?: number | null) {
		if (profileId == null) return null;
		const profile = profileOptions.find(
			(option: any) => Number(option?.id) === Number(profileId),
		) as any;
		const coefficient = Number(profile?.coefficient);
		return Number.isFinite(coefficient) ? coefficient : null;
	}

	function applyCustomerProfileMeta(
		patch: Partial<NonNullable<typeof record>["form"]>,
		nextProfileId?: number | null,
	) {
		const currentProfileId = customerProfileId
			? Number(customerProfileId)
			: null;
		const previousCoefficient =
			lastProfileCoefficientRef.current === undefined
				? getProfileCoefficient(currentProfileId)
				: lastProfileCoefficientRef.current;
		const normalizedNextProfileId = nextProfileId ? Number(nextProfileId) : null;
		const nextCoefficient = getProfileCoefficient(normalizedNextProfileId);
		setCustomerProfileMeta(patch, previousCoefficient, nextCoefficient);
		lastProfileCoefficientRef.current = nextCoefficient;
		lastProfileIdRef.current = normalizedNextProfileId;
		pendingProfileRepriceRef.current =
			nextCoefficient == null && previousCoefficient != null;
	}

	useEffect(() => {
		const data = resolvedCustomer.data as any;
		if (!record || !data || !customerId) return;
		const nextMeta = {
			customerId: Number(data.customerId || customerId || 0) || null,
			customerProfileId: data.profileId ?? customerProfileId,
			billingAddressId: data.billing?.id ?? data.billingId ?? null,
			shippingAddressId: data.shipping?.id ?? data.shippingId ?? null,
			paymentTerm: normalizeSalesFormPaymentTerm(data.netTerm, paymentTerm),
			taxCode: (data.taxCode as string) || null,
		};
		const changed =
			nextMeta.customerId !== customerId ||
			nextMeta.customerProfileId !== customerProfileId ||
			nextMeta.billingAddressId !== billingAddressId ||
			nextMeta.shippingAddressId !== shippingAddressId ||
			nextMeta.paymentTerm !== paymentTerm ||
			nextMeta.taxCode !== taxCode;
		if (!changed) return;
		if (nextMeta.customerProfileId !== customerProfileId) {
			applyCustomerProfileMeta(nextMeta, nextMeta.customerProfileId);
			return;
		}
		setMeta(nextMeta);
	}, [
		billingAddressId,
		customerId,
		customerProfileId,
		paymentTerm,
		resolvedCustomer.data,
		shippingAddressId,
		setCustomerProfileMeta,
		setMeta,
		taxCode,
	]);

	const customerMeta = (record?.customer as any)?.meta || {};
	const creditLimit = Number(
		customerMeta.creditLimit ??
			customerMeta.limit ??
			customerMeta.credit_limit ??
			0,
	);

	const laborIndex = (record?.extraCosts || []).findIndex(
		(cost) => cost.type === "Labor",
	);
	const laborCost =
		laborIndex >= 0 ? Number(record?.extraCosts?.[laborIndex]?.amount || 0) : 0;
	const addOnTotal = (record?.extraCosts || [])
		.filter(
			(cost) =>
				!["Labor", "Discount", "DiscountPercentage"].includes(cost.type),
		)
		.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
	const cccPercentage = Number((record as any)?.settings?.cccPercentage ?? 3.5);
	const showCcc =
		String(record?.form.paymentMethod || "")
			.trim()
			.toLowerCase() === "credit card";
	const liveSummary = useMemo(
		() =>
			computeSummary(
				record?.lineItems || [],
				Number(record?.summary?.taxRate || 0),
				record?.extraCosts || [],
				record?.form.paymentMethod || null,
				cccPercentage,
			),
		[
			cccPercentage,
			record?.extraCosts,
			record?.form.paymentMethod,
			record?.lineItems,
			record?.summary?.taxRate,
		],
	);

	useEffect(() => {
		if (!record) return;
		const flow = startFlow({
			feature: "new-sales-form/invoice-summary",
			threadContext: "summary-render",
			tags: ["debug", "dev-only", "shelf", "summary"],
			inputs: {
				lineCount: record?.lineItems?.length || 0,
			},
		});
		logStage(flow, {
			stage: "derive",
			eventType: "response.received",
			outputs: {
				summary: liveSummary,
				shelfLines: (record?.lineItems || [])
					.filter(
						(line: any) =>
							Array.isArray(line?.shelfItems) && line.shelfItems.length,
					)
					.map((line: any) => ({
						uid: line.uid,
						qty: line.qty,
						unitPrice: line.unitPrice,
						lineTotal: line.lineTotal,
						shelfItems: (line.shelfItems || []).map((row: any) => ({
							productId: row?.productId,
							qty: row?.qty,
							unitPrice: row?.unitPrice,
							totalPrice: row?.totalPrice,
						})),
					})),
			},
		});
		endFlow(flow, {
			subTotal: liveSummary?.subTotal,
			taxTotal: liveSummary?.taxTotal,
			grandTotal: liveSummary?.grandTotal,
		});
	}, [liveSummary, record?.lineItems]);

	useEffect(() => {
		if (!record) return;
		if (!hasSalesFormSummaryDrift(record.summary, liveSummary)) return;
		setSummary({
			...record.summary,
			...liveSummary,
		});
	}, [
		liveSummary,
		record,
		setSummary,
	]);

	const creditUsed = Number(liveSummary.grandTotal || 0);
	const paymentMethodOptions: SalesFormSelectOption[] = buildSalesFormSelectOptions(
		salesFormPaymentMethods,
	);
	const paymentTermOptions: SalesFormSelectOption[] = buildSalesFormSelectOptions(
		salesFormPaymentTerms,
	);
	const deliveryOptions: SalesFormSelectOption[] = buildSalesFormSelectOptions(
		salesFormDeliveryOptions,
	);
	const profileSelectOptions: SalesFormSelectOption[] =
		buildSalesFormProfileSelectOptions(profileOptions);
	const taxSelectOptions: SalesFormSelectOption[] =
		buildSalesFormTaxSelectOptions(taxOptions);

	useEffect(() => {
		if (!record) return;
		const currentProfile = profileOptions.find(
			(profile: any) => Number(profile?.id) === Number(customerProfileId || 0),
		) as any;
		const currentCoefficient = Number(currentProfile?.coefficient);
		const normalizedCurrent = Number.isFinite(currentCoefficient)
			? currentCoefficient
			: null;
		const currentProfileId = customerProfileId
			? Number(customerProfileId)
			: null;
		if (lastProfileCoefficientRef.current === undefined) {
			lastProfileCoefficientRef.current = normalizedCurrent;
			lastProfileIdRef.current = currentProfileId;
			return;
		}
		if (
			lastProfileIdRef.current === currentProfileId &&
			lastProfileCoefficientRef.current == null &&
			normalizedCurrent != null &&
			!pendingProfileRepriceRef.current
		) {
			// The form may hydrate before profile options arrive. When the matching
			// profile coefficient resolves later, seed the refs without repricing so
			// existing saved sales prices are not mistaken for base prices on load.
			lastProfileCoefficientRef.current = normalizedCurrent;
			lastProfileIdRef.current = currentProfileId;
			return;
		}
		const profileChanged = lastProfileIdRef.current !== currentProfileId;
		if (
			lastProfileCoefficientRef.current === normalizedCurrent &&
			!profileChanged
		) {
			return;
		}
		setCustomerProfileMeta(
			{ customerProfileId: currentProfileId },
			lastProfileCoefficientRef.current ?? null,
			normalizedCurrent,
		);
		lastProfileCoefficientRef.current = normalizedCurrent;
		lastProfileIdRef.current = currentProfileId;
		pendingProfileRepriceRef.current = false;
	}, [
		customerProfileId,
		profileOptions,
		record,
		setCustomerProfileMeta,
	]);

	useEffect(() => {
		if (!record) return;
		if (customerProfileId != null) return;
		const defaultProfile = getDefaultSalesFormCustomerProfile(profileOptions);
		if (!defaultProfile?.id) return;
		const profileMeta = (defaultProfile?.meta || {}) as Record<string, any>;
		const nextProfileId = Number(defaultProfile.id);
		applyCustomerProfileMeta({
			customerProfileId: nextProfileId,
			paymentTerm: resolveSalesFormProfilePaymentTerm(profileMeta, paymentTerm),
		}, nextProfileId);
	}, [
		customerProfileId,
		paymentTerm,
		profileOptions,
		record,
		setCustomerProfileMeta,
	]);

	useEffect(() => {
		if (!record) return;
		const nextRate = resolveSalesFormTaxRateByCode(taxOptions, taxCode);
		if (summaryTaxRate !== Number(nextRate || 0)) {
			setTaxRate(nextRate);
		}
	}, [setTaxRate, summaryTaxRate, taxCode, taxOptions]);

	function applyCustomerProfile(value: string) {
		if (value === "none") {
			if (customerProfileId == null) return;
			applyCustomerProfileMeta({ customerProfileId: null }, null);
			return;
		}
		const selectedId = Number(value);
		if (selectedId === Number(customerProfileId || 0)) return;
		const profile = profileOptions.find(
			(p: any) => Number(p.id) === selectedId,
		) as any;
		const profileMeta = profile?.meta || {};
		applyCustomerProfileMeta({
			customerProfileId: selectedId,
			paymentTerm: resolveSalesFormProfilePaymentTerm(profileMeta, paymentTerm),
		}, selectedId);
	}

	if (!record) return null;
	const dealerProfileCard = (record as any).dealerProfileCard || null;

	return (
		<section className="space-y-6">
			<CustomerSelectorDialog
				mode={props.mode}
				open={isCustomerSelectorOpen}
				onOpenChange={setIsCustomerSelectorOpen}
				type={props.type}
			/>
			{dealerProfileCard ? (
				<SalesFormDealerProfileCard
					dealerEmail={dealerProfileCard.email}
					dealerName={dealerProfileCard.dealerName}
					profile={dealerProfileCard.profile}
				/>
			) : null}
			<SalesFormCustomerOverviewCard
				accountNumber={record.form.customerId}
				billingFallback={`Billing Address ID: ${record.form.billingAddressId ?? "N/A"}`}
				billingLines={billingLines}
				customerName={
					record.customer?.name ||
					record.customer?.businessName ||
					"Not selected"
				}
				onChangeCustomer={() => setIsCustomerSelectorOpen(true)}
				onProfileChange={applyCustomerProfile}
				profileOptions={profileSelectOptions}
				profileValue={
					record.form.customerProfileId
						? String(record.form.customerProfileId)
						: "none"
				}
				shippingFallback={`Shipping Address ID: ${record.form.shippingAddressId ?? "N/A"}`}
				shippingLines={shippingLines}
			/>

			<SalesFormInvoiceDetailsPanel
				type={props.type}
				createdAt={record.form.createdAt}
				deliveryOption={record.form.deliveryOption || "pickup"}
				deliveryOptions={deliveryOptions}
				goodUntil={record.form.goodUntil}
				paymentDueDate={record.form.paymentDueDate}
				prodDueDate={record.form.prodDueDate}
				onCreatedAtChange={(value) =>
					setMeta({
						createdAt: formDateValue(value),
					})
				}
				onDeliveryOptionChange={(value) => setMeta({ deliveryOption: value })}
				onGoodUntilChange={(value) =>
					setMeta({
						goodUntil: formDateValue(value),
					})
				}
				onPaymentDueDateChange={(value) =>
					setMeta({
						paymentDueDate: formDateValue(value),
					})
				}
				onPaymentTermChange={(value) => setMeta({ paymentTerm: value })}
				onPoChange={(value) => setMeta({ po: value })}
				onProdDueDateChange={(value) =>
					setMeta({
						prodDueDate: formDateValue(value),
					})
				}
				paymentTerm={record.form.paymentTerm || "None"}
				paymentTerms={paymentTermOptions}
				po={record.form.po}
			/>

			<SalesFormPricingOverview
				addOnTotal={addOnTotal}
				ccc={liveSummary.ccc}
				cccPercentage={cccPercentage}
				grandTotal={liveSummary.grandTotal}
				laborCost={laborCost}
				onAddGlobalCost={() =>
					upsertExtraCost({
						label: "Custom Add-on",
						type: "CustomNonTaxxable",
						amount: 0,
						taxxable: false,
					})
				}
				onLaborCostChange={(amount) => {
					if (laborIndex >= 0)
						upsertExtraCost(
							{ ...record.extraCosts[laborIndex], amount },
							laborIndex,
						);
					else
						upsertExtraCost({
							label: "Labor",
							type: "Labor",
							amount,
							taxxable: false,
						});
				}}
				onPaymentMethodChange={(value) =>
					setMeta({
						paymentMethod: value === "None" ? null : value,
					})
				}
				onTaxCodeChange={(value) => {
					const nextTaxCode = value === "none" ? null : value;
					setMeta({ taxCode: nextTaxCode });
					setTaxRate(resolveSalesFormTaxRateByCode(taxOptions, nextTaxCode));
				}}
				paymentMethod={record.form.paymentMethod || "None"}
				paymentMethods={paymentMethodOptions}
				showCcc={showCcc}
				showGrandTotal={false}
				subTotal={liveSummary.subTotal}
				taxCode={record.form.taxCode || "none"}
				taxOptions={taxSelectOptions}
				taxTotal={liveSummary.taxTotal}
			/>

			<SalesFormCreditLimitMeter
				creditLimit={creditLimit}
				creditUsed={creditUsed}
			/>
		</section>
	);
}
