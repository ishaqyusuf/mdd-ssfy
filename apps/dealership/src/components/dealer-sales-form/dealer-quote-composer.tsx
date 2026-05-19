"use client";

import { useTRPC } from "@/trpc/client";
import {
	SalesFormHeaderActions,
	SalesFormShell,
	buildDualSalesFormPricingSnapshot,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useSalesFormActions } from "./adapters/use-sales-form-actions";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useDealerSalesFormData } from "./adapters/use-sales-form-data";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import { useDealerSalesFormState } from "./adapters/use-sales-form-state";
import { DealerQuoteMainPanel } from "./dealer-quote-main-panel";
import { DealerQuoteSummaryPanel } from "./dealer-quote-summary-panel";
import type {
	DealerSalesFormCustomer,
	DealerSalesFormProfile,
} from "./types";

type DealerQuoteComposerProps = {
	editingQuoteId: number | null;
	onCancelEdit: () => void;
};

export function DealerQuoteComposer({
	editingQuoteId,
	onCancelEdit,
}: DealerQuoteComposerProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
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
				onCancelEdit();
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
		isLoading: customersQuery.isPending || profilesQuery.isPending,
	});
	const pricing = buildDualSalesFormPricingSnapshot({
		taxRate: Number(record?.summary?.taxRate || 0),
		dealerProfile: selectedProfile,
		internalProfile: { coefficient: 1 },
		lineItems: (record?.lineItems || []) as any,
	});

	function resetComposer() {
		onCancelEdit();
		form.reset();
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
				lineTotal: Number(line.lineTotal || 0),
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
			surface="embedded"
			showMobileFooter={false}
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
				isSaved={false}
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
