import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  getDefaultSalesFormCustomerProfile,
  resolveSalesFormProfilePaymentTerm,
} from "@gnd/sales/sales-form-core";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
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
import { formatMoney } from "../lib/format";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type {
  InvoiceCustomer,
  InvoiceFormMode,
  NewSalesFormMeta,
  NewSalesFormSummary,
  NewSalesFormType,
} from "../types";
import { CustomerStep } from "./customer-step";
import { InvoiceFormFooter } from "./invoice-form-footer";
import { InvoiceFormHeader } from "./invoice-form-header";
import { ItemSelector } from "./item-selector";
import { ItemsStep } from "./items-step";
import { WorkflowStepSelector } from "./workflow-step-selector";

function getShellTitle(input: {
  type: NewSalesFormType;
  orderId?: string | null;
  salesId?: number | null;
  slug?: string | null;
}) {
  if (input.orderId) return input.orderId;
  if (input.salesId) return `Sales #${input.salesId}`;
  if (input.slug) return input.slug;
  return input.type === "quote" ? "Quote" : "Invoice";
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
  const saveStatus = useInvoiceFormStore((state) => state.saveStatus);
  const validationError = useInvoiceFormStore((state) => state.validationError);
  const selectorOpen = useInvoiceFormStore((state) => state.selectorOpen);
  const workflowSelectorLineUid = useInvoiceFormStore(
    (state) => state.workflowSelectorLineUid,
  );
  const workflowSelectorLine = useInvoiceFormStore(
    (state) =>
      state.lineItems.find((item) => item.uid === workflowSelectorLineUid) ||
      null,
  );
  const customerId = useInvoiceFormStore((state) => state.meta.customerId);
  const customer = useInvoiceFormStore((state) => state.customer);
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
  const orderId = useInvoiceFormStore((state) => state.orderId);
  const status = useInvoiceFormStore((state) => state.status);
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
  const initialCustomerRouteOpenedRef = useRef(false);

  const headerTitle = useMemo(
    () =>
      getShellTitle({
        type,
        orderId,
        salesId: recoverySalesId,
        slug: recoverySlug || slug || null,
      }),
    [orderId, recoverySalesId, recoverySlug, slug, type],
  );

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
    if (mode !== "create" || initialCustomerRouteOpenedRef.current) return;
    initialCustomerRouteOpenedRef.current = true;
    router.push("/(sales)/invoices/customer-selector" as any);
  }, [mode, router]);

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
        createInvoiceFormPayloadFingerprint(snapshot.payload) ===
          serverFingerprint
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
        paymentTerm: resolveSalesFormProfilePaymentTerm(
          profileMeta,
          paymentTerm,
        ),
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

  return (
    <SafeArea>
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <InvoiceFormHeader
          title={headerTitle}
          onOpenDetails={() =>
            router.push("/(sales)/invoices/sales-details" as any)
          }
        />
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
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 0,
              paddingTop: 4,
              paddingBottom: 112,
            }}
          >
            {recoverySnapshot ? (
              <View className="mx-4 mb-4 gap-3 bg-amber-50 p-3">
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
            <ItemsStep />
          </ScrollView>
        )}
        <InvoiceFormFooter
          step="review"
          canGoBack={false}
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
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

export function CustomerSelectorScreen({
  onClose,
  onCustomerSelected,
}: {
  onClose: () => void;
  onCustomerSelected: () => void;
}) {
  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="relative h-14 flex-row items-center justify-between px-3">
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center active:opacity-60"
          >
            <Icon name="ChevronLeft" className="text-foreground" size={24} />
          </Pressable>
          <View className="pointer-events-none absolute inset-x-14 items-center">
            <Text className="text-base font-semibold text-foreground">
              Select customer
            </Text>
          </View>
          <View className="h-11 w-11" />
        </View>
        <CustomerStep onCustomerSelected={onCustomerSelected} />
        <View className="px-4 pb-4 pt-3">
          <Text className="text-center text-xs text-muted-foreground">
            Customer is required before adding invoice items.
          </Text>
        </View>
      </View>
    </SafeArea>
  );
}

export function SalesDetailsScreen({
  onClose,
  type,
  customer,
  meta,
  summary,
  orderId,
  salesId,
  slug,
  status,
  saveStatus,
}: {
  onClose: () => void;
  type: NewSalesFormType;
  customer: InvoiceCustomer | null;
  meta: NewSalesFormMeta;
  summary: NewSalesFormSummary;
  orderId?: string | null;
  salesId?: number | null;
  slug?: string | null;
  status?: string | null;
  saveStatus?: string | null;
}) {
  const noun = type === "quote" ? "Quote" : "Invoice";
  const dueLabel = type === "quote" ? "Good until" : "Due date";
  const dueValue = type === "quote" ? meta.goodUntil : meta.paymentDueDate;

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
          <View className="relative h-14 flex-row items-center justify-between px-3">
            <Pressable
              onPress={onClose}
              className="h-11 w-11 items-center justify-center active:opacity-60"
            >
              <Icon name="X" className="text-foreground" size={22} />
            </Pressable>
            <View className="pointer-events-none absolute inset-x-14 items-center">
              <Text className="text-base font-semibold text-foreground">
                Sales details
              </Text>
            </View>
            <View className="h-11 w-11" />
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          >
            <SectionTitle title="Customer" />
            {customer ? (
              <View className="pb-5">
                <Text className="text-xl font-semibold text-foreground">
                  {customer.name}
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  {customer.contact || customer.email || customer.phone}
                </Text>
                <DetailLine label="Phone" value={customer.phone} />
                <DetailLine label="Email" value={customer.email} />
                <DetailLine label="Billing" value={customer.billingAddress} />
                <DetailLine label="Shipping" value={customer.shippingAddress} />
              </View>
            ) : (
              <Text className="pb-5 text-sm text-muted-foreground">
                No customer selected.
              </Text>
            )}

            <SectionTitle title={`${noun} details`} />
            <View className="pb-5">
              <DetailLine label="Sales #" value={orderId || slug || salesId} />
              <DetailLine
                label="Status"
                value={status || saveStatus || "Draft"}
              />
              <DetailLine label="Invoice date" value={meta.createdAt} />
              <DetailLine label={dueLabel} value={dueValue} />
              <DetailLine label="Payment term" value={meta.paymentTerm} />
              <DetailLine label="Payment method" value={meta.paymentMethod} />
              <DetailLine label="Delivery" value={meta.deliveryOption} />
              <DetailLine label="PO" value={meta.po} />
              <DetailLine label="Tax code" value={meta.taxCode} />
              <DetailLine label="Notes" value={meta.notes} multiline />
            </View>

            <SectionTitle title="Totals" />
            <View>
              <DetailLine
                label="Subtotal"
                value={formatMoney(summary.subTotal)}
              />
              <DetailLine
                label="Discount"
                value={formatMoney(-(summary.discount || 0))}
              />
              <DetailLine
                label="Delivery"
                value={formatMoney(summary.delivery || 0)}
              />
              <DetailLine
                label="Labor"
                value={formatMoney(summary.labor || 0)}
              />
              <DetailLine label="Tax" value={formatMoney(summary.taxTotal)} />
            </View>
          </ScrollView>
          <View className="bg-background px-4 pb-4 pt-3">
            <View className="flex-row items-end justify-between gap-4">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">
                Grand total
              </Text>
              <Text className="text-2xl font-bold text-foreground">
                {formatMoney(summary.grandTotal)}
              </Text>
            </View>
          </View>
      </View>
    </SafeArea>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="mb-3 mt-5 text-[11px] font-semibold uppercase text-muted-foreground">
      {title}
    </Text>
  );
}

function DetailLine({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
}) {
  const resolved = value == null || value === "" ? "-" : String(value);
  return (
    <View className="flex-row gap-4 py-2">
      <Text className="w-28 text-sm text-muted-foreground">{label}</Text>
      <Text
        numberOfLines={multiline ? undefined : 2}
        className="min-w-0 flex-1 text-right text-sm font-medium text-foreground"
      >
        {resolved}
      </Text>
    </View>
  );
}
