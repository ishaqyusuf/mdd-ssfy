"use client";

import { useTRPC } from "@/trpc/client";
import {
  SalesFormHeaderActions,
  SalesFormShell,
  buildSalesFormTaxSelectOptions,
  composeDealerSalesFormQuotePricingSnapshot,
  composeDealerSalesFormQuoteSaveInput,
  normalizeSalesFormTaxOptions,
  resolveSalesFormTaxRateByCode,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useSalesFormActions } from "./adapters/use-sales-form-actions";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useDealerSalesFormData } from "./adapters/use-sales-form-data";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import { useDealerSalesFormState } from "./adapters/use-sales-form-state";
import { DealerCustomerSelectorDialog } from "./dealer-customer-selector-dialog";
import { DealerQuoteMainPanel } from "./dealer-quote-main-panel";
import { DealerQuoteSkeleton } from "./dealer-quote-skeleton";
import { DealerQuoteSummaryPanel } from "./dealer-quote-summary-panel";
import type {
  DealerInternalSalesFormProfile,
  DealerSalesFormCustomer,
  DealerSalesFormProfile,
} from "./types";

type DealerQuoteComposerProps = {
  quoteId?: number | null;
  mode?: "create" | "edit";
  onSavedHref?: string;
  initialCustomerId?: number | null;
};

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
  const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
  const [selectedCustomerOverride, setSelectedCustomerOverride] =
    useState<DealerSalesFormCustomer | null>(null);
  const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
  const profilesQuery = useQuery(
    trpc.dealerPortal.salesProfiles.queryOptions(),
  );
  const taxProfilesQuery = useQuery(
    trpc.dealerPortal.taxProfiles.queryOptions(),
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
  const form = useDealerSalesFormState(initialCustomerId);
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
  const taxOptions = useMemo(
    () => normalizeSalesFormTaxOptions(taxProfilesQuery.data || []),
    [taxProfilesQuery.data],
  );
  const taxSelectOptions = useMemo(
    () => buildSalesFormTaxSelectOptions(taxOptions),
    [taxOptions],
  );
  const internalProfile =
    (internalProfileQuery.data as DealerInternalSalesFormProfile | null) ||
    null;
  const record = form.record;
  const customerId = record?.form.customerId || null;
  const customerProfileId = record?.form.customerProfileId || null;
  const selectedCustomer =
    customers.find((customer) => customer.id === customerId) ||
    (selectedCustomerOverride?.id === customerId
      ? selectedCustomerOverride
      : null);
  const selectedProfile =
    profiles.find((profile) => profile.id === customerProfileId) ||
    profiles.find(
      (profile) => profile.id === selectedCustomer?.customerTypeId,
    ) ||
    null;

  useEffect(() => {
    if (!record?.form.customerId || record.form.customerProfileId) return;
    const defaultProfileId = selectedCustomer?.customerTypeId;
    if (!defaultProfileId) return;
    form.setCustomer(record.form.customerId, defaultProfileId);
  }, [
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
      composeDealerSalesFormQuotePricingSnapshot({
        taxRate: selectedTaxRate,
        lineItems: record?.lineItems || [],
        dealerProfile: selectedProfile,
        internalProfile,
      }),
    [internalProfile, record?.lineItems, selectedProfile, selectedTaxRate],
  );
  const dealerLineTotalsByUid = useMemo(
    () =>
      Object.fromEntries(
        pricing.lines.map((line) => [line.uid, line.dealerLineTotal]),
      ),
    [pricing.lines],
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
    internalProfileQuery.isPending ||
    isEditQuoteLoading;

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

    const payload = composeDealerSalesFormQuoteSaveInput({
      record,
      id: editingQuoteId,
      customerProfileId,
      lineTotalsByUid: dealerLineTotalsByUid,
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
      grandTotal={pricing.dealerPricing.grandTotal}
      isSaved={Boolean(editingQuoteId)}
      isSaving={saveQuote.isPending || quoteQuery.isFetching}
      mobileSaveLabel={editingQuoteId ? "Update quote" : "Save quote"}
      surface="fixed"
      showMobileFooter
      capabilities={capabilities}
      permissions={permissions}
      onSaveDraft={save}
      onSaveFinal={save}
      slots={{
        MainPanel: (
          <DealerQuoteMainPanel
            record={record}
            onAddLineItem={actions.addLineItem}
            onRemoveLineItem={actions.removeLineItem}
            onUpdateLineItem={actions.updateLineItem}
            lineTotalsByUid={dealerLineTotalsByUid}
          />
        ),
        SummaryPanel: (
          <DealerQuoteSummaryPanel
            customer={selectedCustomer}
            profiles={profiles}
            customerProfileId={customerProfileId}
            deliveryOption={record.form.deliveryOption}
            goodUntil={record.form.goodUntil}
            grandTotal={pricing.dealerPricing.grandTotal}
            paymentTerm={record.form.paymentTerm}
            po={record.form.po}
            taxCode={selectedTaxCode}
            taxOptions={taxSelectOptions}
            isEditing={Boolean(editingQuoteId)}
            isFetching={quoteQuery.isFetching}
            isSaving={saveQuote.isPending}
            canSave={Boolean(customerId)}
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
            onProfileChange={form.setCustomerProfile}
            onTaxCodeChange={(taxCode) => {
              form.setMeta({ taxCode });
              form.setTaxRate(
                resolveSalesFormTaxRateByCode(taxOptions, taxCode),
              );
            }}
            onSave={save}
            subTotal={pricing.dealerPricing.subTotal}
            taxTotal={pricing.dealerPricing.taxTotal}
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
              form.setCustomer(customer.id, customer.customerTypeId || null);
            }}
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
