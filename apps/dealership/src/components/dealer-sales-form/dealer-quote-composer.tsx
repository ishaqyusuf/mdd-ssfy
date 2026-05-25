"use client";

import { useTRPC } from "@/trpc/client";
import {
  SalesFormFloatingActions,
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
import { parseAsInteger, useQueryStates } from "nuqs";
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
  const [selectedCustomerOverride, setSelectedCustomerOverride] =
    useState<DealerSalesFormCustomer | null>(null);
  const customersQuery = useQuery(trpc.dealerPortal.customers.queryOptions());
  const profilesQuery = useQuery(
    trpc.dealerPortal.salesProfiles.queryOptions(),
  );
  const primaryProfileQuery = useQuery(
    trpc.dealerPortal.primarySalesProfile.queryOptions(),
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
  const primaryProfile =
    (primaryProfileQuery.data as DealerSalesFormProfile | null) || null;
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
  const selectedCustomer =
    customers.find((customer) => customer.id === customerId) ||
    (selectedCustomerOverride?.id === customerId
      ? selectedCustomerOverride
      : null);
  const selectedProfile = primaryProfile;

  useEffect(() => {
    if (!record?.form.customerId || record.form.customerProfileId) return;
    if (!selectedProfile?.id) return;
    form.setCustomer(record.form.customerId, selectedProfile.id);
  }, [
    form.setCustomer,
    record?.form.customerId,
    record?.form.customerProfileId,
    selectedProfile?.id,
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
  const margin = useMemo(() => {
    const internalSubtotal = Number(pricing.internalPricing.subTotal || 0);
    const dealerSubtotal = Number(pricing.dealerPricing.subTotal || 0);
    const grossProfit = dealerSubtotal - internalSubtotal;
    return {
      internalSubtotal,
      dealerSubtotal,
      grossProfit,
      marginPercent: dealerSubtotal ? (grossProfit / dealerSubtotal) * 100 : 0,
      dealerCoefficient: Number(pricing.profiles.dealer.coefficient || 1),
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
    primaryProfileQuery.isPending ||
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
            lineTotalsByUid={dealerLineTotalsByUid}
          />
        ),
        SummaryPanel: (
          <DealerQuoteSummaryPanel
            customer={selectedCustomer}
            profiles={selectedProfile ? [selectedProfile] : profiles}
            customerProfileId={selectedProfile?.id ?? null}
            deliveryOption={record.form.deliveryOption}
            goodUntil={record.form.goodUntil}
            grandTotal={pricing.dealerPricing.grandTotal}
            internalSubTotal={margin.internalSubtotal}
            dealerSubTotal={margin.dealerSubtotal}
            grossProfit={margin.grossProfit}
            marginPercent={margin.marginPercent}
            dealerCoefficient={margin.dealerCoefficient}
            paymentTerm={record.form.paymentTerm}
            po={record.form.po}
            showMargin={showMargin}
            taxCode={selectedTaxCode}
            taxOptions={taxSelectOptions}
            isEditing={Boolean(editingQuoteId)}
            isFetching={quoteQuery.isFetching}
            isSaving={saveQuote.isPending}
            canSave={Boolean(customerId && selectedProfile?.id)}
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
            onProfileChange={() => undefined}
            onShowMarginChange={setShowMargin}
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
              form.setCustomer(customer.id, selectedProfile?.id || null);
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
    </SalesFormShell>
  );
}
