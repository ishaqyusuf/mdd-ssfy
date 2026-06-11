import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  getDefaultSalesFormCustomerProfile,
  resolveSalesFormProfilePaymentTerm,
} from "@gnd/sales/sales-form-core";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useInvoiceFormActions } from "../api/use-invoice-form-actions";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceFormRecord } from "../api/use-invoice-form-record";
import { useInvoiceFormResolvedCustomer } from "../api/use-invoice-form-resolved-customer";
import { useInvoiceFormTaxProfiles } from "../api/use-invoice-form-tax-profiles";
import {
  clearInvoiceFormRecoverySnapshot,
  createInvoiceFormPayloadFingerprint,
  getInvoiceFormRecoveryKey,
  isInvoiceFormRecoverySnapshotNewer,
  readInvoiceFormRecoverySnapshot,
  type InvoiceFormRecoverySnapshot,
  writeInvoiceFormRecoverySnapshot,
} from "../lib/local-recovery";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type { InvoiceFormMode, InvoiceFormStep, NewSalesFormType } from "../types";
import { CostsStep } from "./costs-step";
import { CustomerStep } from "./customer-step";
import { DetailsStep } from "./details-step";
import { InvoiceFormFooter } from "./invoice-form-footer";
import { InvoiceFormHeader } from "./invoice-form-header";
import { InvoiceStepTrack } from "./invoice-step-track";
import { ItemSelector } from "./item-selector";
import { ItemsStep } from "./items-step";
import { ReviewStep } from "./review-step";
import { WorkflowStepSelector } from "./workflow-step-selector";

function getHeaderCopy(
  step: InvoiceFormStep,
  type: NewSalesFormType,
): { title: string; subtitle: string } {
  const noun = type === "quote" ? "Quote" : "Invoice";
  const lowerNoun = noun.toLowerCase();
  const title = step === "review" ? `Review ${lowerNoun}` : `New ${noun}`;
  const subtitles: Record<InvoiceFormStep, string> = {
    customer: "Customer",
    details: `${noun} details`,
    items: "Line items",
    costs: "Costs and totals",
    review: "Final check before creating",
  };
  return { title, subtitle: subtitles[step] };
}

export function InvoiceFormScreen({
  mode,
  slug,
  type = "order",
}: {
  mode: InvoiceFormMode;
  slug?: string;
  type?: NewSalesFormType;
}) {
  const step = useInvoiceFormStore((state) => state.step);
  const saveStatus = useInvoiceFormStore((state) => state.saveStatus);
  const validationError = useInvoiceFormStore((state) => state.validationError);
  const selectorOpen = useInvoiceFormStore((state) => state.selectorOpen);
  const workflowSelectorLineUid = useInvoiceFormStore(
    (state) => state.workflowSelectorLineUid,
  );
  const workflowSelectorLine = useInvoiceFormStore(
    (state) =>
      state.lineItems.find((item) => item.uid === workflowSelectorLineUid) || null,
  );
  const customerId = useInvoiceFormStore((state) => state.meta.customerId);
  const customerProfileId = useInvoiceFormStore(
    (state) => state.meta.customerProfileId,
  );
  const billingAddressId = useInvoiceFormStore(
    (state) => state.meta.billingAddressId,
  );
  const shippingAddressId = useInvoiceFormStore(
    (state) => state.meta.shippingAddressId,
  );
  const taxCode = useInvoiceFormStore((state) => state.meta.taxCode);
  const paymentTerm = useInvoiceFormStore((state) => state.meta.paymentTerm);
  const taxRate = useInvoiceFormStore((state) => state.taxRate);
  const recoveryDirty = useInvoiceFormStore((state) => state.dirty);
  const recoveryType = useInvoiceFormStore((state) => state.type);
  const recoverySlug = useInvoiceFormStore((state) => state.slug);
  const recoverySalesId = useInvoiceFormStore((state) => state.salesId);
  const recoverySettings = useInvoiceFormStore((state) => state.settings);
  const recoveryMeta = useInvoiceFormStore((state) => state.meta);
  const recoveryLineItems = useInvoiceFormStore((state) => state.lineItems);
  const recoveryExtraCosts = useInvoiceFormStore((state) => state.extraCosts);
  const recoverySummary = useInvoiceFormStore((state) => state.summary);
  const recoveryInventoryStatus = useInvoiceFormStore(
    (state) => state.inventoryStatus,
  );
  const recoveryVersion = useInvoiceFormStore((state) => state.version);
  const actions = useInvoiceFormStore((state) => state.actions);
  const router = useRouter();
  const { saveDraft, saveFinal, isSaving } = useInvoiceFormActions();
  const { profiles, getProfileCoefficient, isLoadingProfiles } =
    useInvoiceFormProfiles();
  const { resolveTaxRate, isLoadingTaxProfiles } = useInvoiceFormTaxProfiles();
  const resolvedCustomerQuery = useInvoiceFormResolvedCustomer({
    customerId,
    billingId: billingAddressId,
    shippingId: shippingAddressId,
  });
  const recordQuery = useInvoiceFormRecord({ mode, slug, type });
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<InvoiceFormRecoverySnapshot | null>(null);
  const hydratedVersionRef = useRef<string | null>(null);
  const recoveryReadRef = useRef<string | null>(null);

  const headerCopy = useMemo(() => {
    const current = getHeaderCopy(step, type);
    if (mode !== "edit") return current;
    const noun = type === "quote" ? "Quote" : "Invoice";
    return {
      ...current,
      title: step === "review" ? `Review ${noun.toLowerCase()}` : `Edit ${noun}`,
      subtitle: slug ? `Editing ${slug}` : current.subtitle,
    };
  }, [mode, slug, step, type]);

  const recoverySavedAt = useMemo(() => {
    if (!recoverySnapshot?.savedAt) return "";
    const date = new Date(recoverySnapshot.savedAt);
    if (Number.isNaN(date.getTime())) return recoverySnapshot.savedAt;
    return date.toLocaleString();
  }, [recoverySnapshot?.savedAt]);

  const recoveryKey = useMemo(
    () =>
      getInvoiceFormRecoveryKey({
        type,
        slug: recoverySlug || slug || null,
        salesId: recoverySalesId,
      }),
    [recoverySalesId, recoverySlug, slug, type],
  );

  const draftRecoveryKey = useMemo(
    () =>
      getInvoiceFormRecoveryKey({
        type,
      }),
    [type],
  );

  const clearRecoveryKeys = useCallback(
    (next?: { slug?: string | null; salesId?: string | number | null }) => {
      const keys = new Set([recoveryKey, draftRecoveryKey]);
      if (next?.slug || next?.salesId) {
        keys.add(
          getInvoiceFormRecoveryKey({
            type,
            slug: next.slug || null,
            salesId: next.salesId || null,
          }),
        );
      }
      keys.forEach((key) => {
        void clearInvoiceFormRecoverySnapshot(key);
      });
      setRecoverySnapshot(null);
    },
    [draftRecoveryKey, recoveryKey, type],
  );

  const recoveryReadKey = `${recoveryKey}:${draftRecoveryKey}`;

  useEffect(() => {
    if (recoveryType === type) return;
    actions.setFormType(type);
  }, [actions, recoveryType, type]);

  useEffect(() => {
    const record = recordQuery.data;
    if (!record) return;
    const identity = `${record.slug || "new"}:${record.version || record.updatedAt || "draft"}`;
    if (hydratedVersionRef.current === identity) return;
    hydratedVersionRef.current = identity;
    actions.hydrateFromRecord(record);
  }, [actions, recordQuery.data]);

  useEffect(() => {
    if (recordQuery.isPending) return;
    if (recoveryReadRef.current === recoveryReadKey) return;
    recoveryReadRef.current = recoveryReadKey;
    let cancelled = false;
    void Promise.all([
      readInvoiceFormRecoverySnapshot(recoveryKey),
      recoveryKey !== draftRecoveryKey
        ? readInvoiceFormRecoverySnapshot(draftRecoveryKey)
        : Promise.resolve(null),
    ]).then(([currentSnapshot, draftSnapshot]) => {
      if (cancelled) return;
      const snapshot = currentSnapshot || draftSnapshot;
      if (!snapshot) {
        setRecoverySnapshot(null);
        return;
      }
      if (snapshot.payload.type !== type) {
        setRecoverySnapshot(null);
        return;
      }
      const shouldRestore =
        mode === "create" ||
        isInvoiceFormRecoverySnapshotNewer(
          snapshot,
          recordQuery.data?.updatedAt ?? null,
        );
      if (!shouldRestore) {
        clearRecoveryKeys();
        setRecoverySnapshot(null);
        return;
      }
      const record = recordQuery.data;
      const serverFingerprint = record
        ? createInvoiceFormPayloadFingerprint({
            type: record.type,
            slug: record.slug,
            salesId: record.salesId,
            inventoryStatus: record.inventoryStatus,
            version: record.version,
            autosave: true,
            meta: record.form,
            lineItems: record.lineItems,
            extraCosts: record.extraCosts,
            summary: record.summary,
          })
        : "";
      if (
        serverFingerprint &&
        createInvoiceFormPayloadFingerprint(snapshot.payload) === serverFingerprint
      ) {
        setRecoverySnapshot(null);
        return;
      }
      setRecoverySnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [
    clearRecoveryKeys,
    mode,
    draftRecoveryKey,
    recoveryKey,
    recoveryReadKey,
    recordQuery.data,
    recordQuery.data?.updatedAt,
    recordQuery.isPending,
    type,
  ]);

  useEffect(() => {
    if (!recoveryDirty) return;
    const payload = actions.buildSavePayload(true);
    void writeInvoiceFormRecoverySnapshot(
      recoveryKey,
      payload,
      recoverySettings,
    );
  }, [
    actions,
    recoveryKey,
    recoveryDirty,
    recoveryExtraCosts,
    recoveryInventoryStatus,
    recoveryLineItems,
    recoveryMeta,
    recoverySettings,
    recoverySummary,
    recoveryVersion,
  ]);

  useEffect(() => {
    if (isLoadingTaxProfiles) return;
    const nextRate = resolveTaxRate(taxCode);
    if (Number(taxRate || 0) === Number(nextRate || 0)) return;
    actions.setTaxRate(nextRate);
  }, [actions, isLoadingTaxProfiles, resolveTaxRate, taxCode, taxRate]);

  useEffect(() => {
    if (isLoadingProfiles) return;
    const data = resolvedCustomerQuery.data;
    if (!data || !customerId) return;
    actions.applyResolvedCustomer(data, {
      previousProfileCoefficient: getProfileCoefficient(customerProfileId),
      nextProfileCoefficient: getProfileCoefficient(data.profileId),
    });
  }, [
    actions,
    customerId,
    customerProfileId,
    getProfileCoefficient,
    isLoadingProfiles,
    resolvedCustomerQuery.data,
  ]);

  useEffect(() => {
    if (isLoadingProfiles) return;
    if (!customerId || customerProfileId != null) return;
    const defaultProfile = getDefaultSalesFormCustomerProfile(profiles);
    const nextProfileId = Number(defaultProfile?.id || 0);
    if (!nextProfileId) return;
    const profileMeta = defaultProfile?.meta || {};
    actions.applyCustomerProfileMeta(
      {
        customerProfileId: nextProfileId,
        paymentTerm: resolveSalesFormProfilePaymentTerm(profileMeta, paymentTerm),
      },
      {
        previousProfileCoefficient: null,
        nextProfileCoefficient: getProfileCoefficient(nextProfileId),
      },
    );
  }, [
    actions,
    customerId,
    customerProfileId,
    getProfileCoefficient,
    isLoadingProfiles,
    paymentTerm,
    profiles,
  ]);

  const markSaveFailure = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    if (message.toLowerCase().includes("out of date")) {
      actions.markStale();
      return;
    }
    actions.markError();
  };

  const dismissRecoverySnapshot = () => {
    clearRecoveryKeys();
  };

  const applyRecoverySnapshot = () => {
    if (!recoverySnapshot) return;
    const record = recordQuery.data;
    actions.restoreRecoverySnapshot({
      ...recoverySnapshot,
      payload: {
        ...recoverySnapshot.payload,
        salesId: recoverySnapshot.payload.salesId ?? record?.salesId ?? null,
        slug: recoverySnapshot.payload.slug ?? record?.slug ?? slug ?? null,
        inventoryStatus:
          recoverySnapshot.payload.inventoryStatus ??
          record?.inventoryStatus ??
          null,
        version: record?.version ?? recoverySnapshot.payload.version ?? null,
      },
      settings: recoverySnapshot.settings ?? record?.settings ?? null,
    });
    setRecoverySnapshot(null);
  };

  const navigateToSavedEditRoute = (result?: { slug?: string | null }) => {
    if (mode !== "create" || !result?.slug) return;
    router.replace({
      pathname: "/(sales)/invoices/[slug]",
      params: { slug: result.slug, type },
    });
  };

  const handleSaveDraft = async () => {
    if (!actions.validateBeforeSave()) return;
    try {
      actions.markSaving();
      const result = await saveDraft(actions.buildSavePayload(true));
      actions.markSaved(result);
      clearRecoveryKeys({
        slug: result.slug,
        salesId: result.salesId,
      });
      navigateToSavedEditRoute(result);
    } catch (error) {
      markSaveFailure(error);
    }
  };

  const handleCreateInvoice = async () => {
    if (!actions.validateBeforeSave()) return;
    try {
      actions.markSaving();
      const result = await saveFinal(actions.buildSavePayload(false));
      actions.markSaved(result);
      clearRecoveryKeys({
        slug: result.slug,
        salesId: result.salesId,
      });
      navigateToSavedEditRoute(result);
    } catch (error) {
      markSaveFailure(error);
    }
  };

  const renderedStep = (() => {
    if (step === "customer") return <CustomerStep />;
    if (step === "details") return <DetailsStep />;
    if (step === "items") return <ItemsStep />;
    if (step === "costs") return <CostsStep />;
    return <ReviewStep />;
  })();

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <InvoiceFormHeader
          title={headerCopy.title}
          subtitle={headerCopy.subtitle}
          status={step === "review" && saveStatus === "saved" ? "ready" : saveStatus}
        />
        <InvoiceStepTrack step={step} />
        {recordQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="mt-2 text-xs text-muted-foreground">
              Loading {type === "quote" ? "quote" : "invoice"}...
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              step === "items"
                ? { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 28 }
                : { padding: 16, paddingBottom: 28 }
            }
          >
            {recoverySnapshot ? (
              <View className="mb-4 gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <Text className="text-sm font-semibold text-amber-950">
                  Unsaved local edits were found
                </Text>
                <Text className="text-xs text-amber-900">
                  {recoverySavedAt
                    ? `Saved on this device from ${recoverySavedAt}.`
                    : "Saved on this device."}
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-amber-300 bg-white"
                    onPress={dismissRecoverySnapshot}
                  >
                    <Text>Dismiss</Text>
                  </Button>
                  <Button
                    className="h-10 flex-1 rounded-xl"
                    onPress={applyRecoverySnapshot}
                  >
                    <Text>Restore</Text>
                  </Button>
                </View>
              </View>
            ) : null}
            {renderedStep}
          </ScrollView>
        )}
        <InvoiceFormFooter
          step={step}
          canGoBack={step !== "customer"}
          isSaving={isSaving}
          validationError={validationError}
          onBack={actions.prevStep}
          onSaveDraft={handleSaveDraft}
          onContinue={actions.nextStep}
          onSaveFinal={handleCreateInvoice}
          finalActionLabel={
            mode === "edit"
              ? `Save ${type === "quote" ? "Quote" : "Invoice"}`
              : `Create ${type === "quote" ? "Quote" : "Invoice"}`
          }
        />
        {selectorOpen ? <ItemSelector /> : null}
        {workflowSelectorLine ? (
          <WorkflowStepSelector
            line={workflowSelectorLine}
            onClose={actions.closeWorkflowSelector}
          />
        ) : null}
        {isSaving ? (
          <View className="absolute inset-0 items-center justify-center bg-background/30">
            <View className="items-center gap-2 rounded-2xl border border-border bg-card p-4">
              <ActivityIndicator />
              <Text className="text-xs text-muted-foreground">
                Saving {type === "quote" ? "quote" : "invoice"}...
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeArea>
  );
}
