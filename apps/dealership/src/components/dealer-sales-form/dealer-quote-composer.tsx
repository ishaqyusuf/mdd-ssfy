"use client";

import { useTRPC } from "@/trpc/client";
import {
	SalesFormHeaderActions,
	SalesFormShell,
	composeSalesFormPricingSnapshot,
	type DualPricingSnapshot,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useSalesFormActions } from "./adapters/use-sales-form-actions";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useDealerSalesFormData } from "./adapters/use-sales-form-data";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import { useDealerSalesFormState } from "./adapters/use-sales-form-state";
import { DealerQuoteMainPanel } from "./dealer-quote-main-panel";
import { DealerQuoteSummaryPanel } from "./dealer-quote-summary-panel";
import type {
	DealerSalesFormCustomer,
	DealerInternalSalesFormProfile,
	DealerSalesFormProfile,
} from "./types";

type DealerQuoteComposerProps = {
	quoteId?: number | null;
	mode?: "create" | "edit";
	onSavedHref?: string;
};

export function DealerQuoteComposer({
	quoteId = null,
	mode,
	onSavedHref = "/quotes",
}: DealerQuoteComposerProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const router = useRouter();
	const editingQuoteId = mode === "edit" ? quoteId : null;
	const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const internalProfileQuery = useQuery(
		trpc.dealerPortal.internalSalesProfile.queryOptions(),
	);
	const quoteQuery = useQuery(
		trpc.dealerPortal.salesDocument.queryOptions(
			{ id: editingQuoteId || 0 },
			{ enabled: Boolean(editingQuoteId) },
		),
	);
	const form = useDealerSalesFormState();
	const actions = useSalesFormActions(form);
	const capabilities = useSalesFormCapabilities();
	const permissions = useSalesFormPermissions();
	const saveQuote = useMutation(
		trpc.dealerPortal.saveQuote.mutationOptions({
			onSuccess: async (result) => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.salesDocuments.pathKey(),
				});
				toast({
					title: `Quote ${result.orderId} saved.`,
					variant: "success",
				});
				router.push(onSavedHref);
				router.refresh();
				form.reset();
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
	}, [editingQuoteId, form.hydrateQuote, quoteQuery.data]);

	const customers = (customersQuery.data ?? []) as DealerSalesFormCustomer[];
	const profiles = (profilesQuery.data ?? []) as DealerSalesFormProfile[];
	const internalProfile =
		(internalProfileQuery.data as DealerInternalSalesFormProfile | null) ||
		null;
	const record = form.record;
	const customerId = record?.form.customerId || null;
	const customerProfileId = record?.form.customerProfileId || null;
	const selectedCustomer = customers.find(
		(customer) => customer.id === customerId,
	);
	const selectedProfile =
		profiles.find((profile) => profile.id === customerProfileId) ||
		profiles.find(
			(profile) => profile.id === selectedCustomer?.customerTypeId,
		) ||
		null;
	const salesFormData = useDealerSalesFormData({
		customers,
		profiles,
		record,
		isLoading:
			customersQuery.isPending ||
			profilesQuery.isPending ||
			internalProfileQuery.isPending,
	});
	const pricing = composeSalesFormPricingSnapshot({
		config: {
			surface: "dealership",
			pricing: {
				mode: "percentage",
				dealerProfile: selectedProfile,
				internalProfile,
			},
		},
		taxRate: Number(record?.summary?.taxRate || 0),
		lineItems: (record?.lineItems || []) as any,
	}) as DualPricingSnapshot;
	const dealerLineTotalsByUid = useMemo(
		() =>
			Object.fromEntries(
				pricing.lines.map((line) => [line.uid, line.dealerLineTotal]),
			),
		[pricing.lines],
	);

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

		saveQuote.mutate({
			id: editingQuoteId,
			customerId: record.form.customerId,
			customerProfileId,
			taxRate: Number(record.summary?.taxRate || 0),
			lineItems: record.lineItems.map((line) => ({
				uid: line.uid,
				title: line.title,
				description: line.description,
				qty: Number(line.qty || 0),
				unitPrice: Number(line.unitPrice || 0),
				lineTotal: Number(line.qty || 0) * Number(line.unitPrice || 0),
			})),
		});
	}

	if (!record) return null;

	return (
		<SalesFormShell
			mode={editingQuoteId ? "edit" : "create"}
			type="quote"
			record={record}
			state={form.state}
			data={salesFormData}
			actions={actions}
			grandTotal={pricing.dealerPricing.grandTotal}
			isSaved={Boolean(editingQuoteId)}
			isSaving={saveQuote.isPending || quoteQuery.isFetching}
			surface="fixed"
			showMobileFooter
			capabilities={capabilities}
			permissions={permissions}
			onSaveDraft={save}
			onSaveFinal={save}
			slots={{
				MainPanel: (
					<DealerQuoteMainPanel
						customers={salesFormData.customers}
						profiles={salesFormData.profiles}
						record={record}
						onCustomerChange={form.setCustomer}
						onCustomerProfileChange={form.setCustomerProfile}
						onTaxRateChange={form.setTaxRate}
						onAddLineItem={actions.addLineItem}
						onRemoveLineItem={actions.removeLineItem}
						onUpdateLineItem={actions.updateLineItem}
						lineTotalsByUid={dealerLineTotalsByUid}
					/>
				),
				SummaryPanel: (
					<DealerQuoteSummaryPanel
						grandTotal={pricing.dealerPricing.grandTotal}
						isEditing={Boolean(editingQuoteId)}
						isFetching={quoteQuery.isFetching}
						isSaving={saveQuote.isPending}
						canSave={Boolean(customerId)}
						onSave={save}
						subTotal={pricing.dealerPricing.subTotal}
						taxTotal={pricing.dealerPricing.taxTotal}
					/>
				),
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
				dirty
				isSaved={Boolean(editingQuoteId)}
				isSaving={saveQuote.isPending || quoteQuery.isFetching}
				onAddItem={actions.addLineItem}
				onSaveDraft={save}
				onSaveFinal={save}
				saveStatus={saveQuote.isPending ? "saving" : "idle"}
				capabilities={capabilities}
				permissions={permissions}
				type="quote"
			/>
		</SalesFormShell>
	);
}
