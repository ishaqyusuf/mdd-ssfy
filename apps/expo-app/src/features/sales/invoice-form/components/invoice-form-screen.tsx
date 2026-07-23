import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-color";
import {
  getDefaultSalesFormCustomerProfile,
  readSalesFormObjectMetadata,
  resolveSalesFormProfilePaymentTerm,
} from "@gnd/sales/sales-form-core";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Text as NativeText,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useInvoiceFormActions } from "../api/use-invoice-form-actions";
import { useInvoiceFormProfiles } from "../api/use-invoice-form-profiles";
import { useInvoiceFormRecord } from "../api/use-invoice-form-record";
import { useInvoiceFormResolvedCustomer } from "../api/use-invoice-form-resolved-customer";
import { useInvoiceFormTaxProfiles } from "../api/use-invoice-form-tax-profiles";
import { formatDate, formatMoney } from "../lib/format";
import {
  type InvoiceFormRecoverySnapshot,
  clearInvoiceFormRecoverySnapshot,
  createInvoiceFormPayloadFingerprint,
  getInvoiceFormRecoveryKey,
  isInvoiceFormRecoverySnapshotNewer,
  readInvoiceFormRecoverySnapshot,
  writeInvoiceFormRecoverySnapshot,
} from "../lib/local-recovery";
import {
  classifyMobileInvoiceSaveError,
  getMobileInvoiceSaveErrorMessage,
} from "../lib/mobile-save-diagnostics";
import { runMobileInvoiceSaveRequest } from "../lib/mobile-save-timeout";
import { getSalesDocumentLabels } from "../lib/sales-document-labels";
import { useInvoiceFormStore } from "../store/use-invoice-form-store";
import type {
  InvoiceCustomer,
  InvoiceFormMode,
  InvoiceFormSaveResult,
  NewSalesFormMeta,
  NewSalesFormSummary,
  NewSalesFormType,
} from "../types";
import { getCustomerContactLine } from "./customer-display";
import { CustomerStep } from "./customer-step";
import { FloatingInvoiceActionHost } from "./floating-invoice-action";
import { InvoiceFormFooter } from "./invoice-form-footer";
import { InvoiceFormHeader } from "./invoice-form-header";
import { ItemSelector } from "./item-selector";
import { type InvoiceItemNavigationEntry, ItemsStep } from "./items-step";
import {
  type WorkflowFloatingActionEntry,
  WorkflowStepSelector,
  type WorkflowStickyHeaderEntry,
} from "./workflow-step-selector";

const FORM_SCROLL_BOTTOM_PADDING = 25;
const FORM_KEYBOARD_BOTTOM_OFFSET = 160;
const INLINE_WORKFLOW_PROCEED_BUTTON_HEIGHT = 44;
const INLINE_WORKFLOW_PROCEED_BUTTON_WIDTH = 184;
const SHOW_LOCAL_RECOVERY_ALERT = false;

type FormScrollHandle = {
  scrollTo?: (options: { y?: number; animated?: boolean }) => void;
};

type FormScrollOptions = {
  animated?: boolean;
};

function getShellTitle(input: {
  type: NewSalesFormType;
  orderId?: string | null;
  salesId?: number | null;
  slug?: string | null;
}) {
  const labels = getSalesDocumentLabels(input.type);

  if (input.orderId) return input.orderId;
  if (input.salesId) return `${labels.referencePrefix}${input.salesId}`;
  if (input.slug) return input.slug;
  return labels.noun;
}

function InlineWorkflowFloatingActionFrame({
  footerOffset,
  label,
  onPress,
}: {
  footerOffset: number;
  label: string;
  onPress: () => void;
}) {
  const animatedBottom = useMemo(() => new Animated.Value(footerOffset), []);
  const colors = useColors();

  useEffect(() => {
    Animated.timing(animatedBottom, {
      toValue: footerOffset,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedBottom, footerOffset]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={
        {
          alignItems: "center",
          bottom: animatedBottom,
          elevation: 24,
          height: 56,
          justifyContent: "center",
          left: 0,
          paddingHorizontal: 16,
          position: "absolute",
          right: 0,
          zIndex: 60,
        } as any
      }
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.primary,
          borderRadius: 999,
          elevation: 10,
          height: INLINE_WORKFLOW_PROCEED_BUTTON_HEIGHT,
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
          paddingHorizontal: 24,
          shadowColor: "rgb(15, 23, 42)",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          width: INLINE_WORKFLOW_PROCEED_BUTTON_WIDTH,
        })}
      >
        <NativeText
          style={{
            color: colors.primaryForeground,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {label}
        </NativeText>
      </Pressable>
    </Animated.View>
  );
}

function FixedInvoiceItemNavigation({
  entry,
}: {
  entry: InvoiceItemNavigationEntry | null;
}) {
  if (!entry) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-1/2 z-30 h-20 -translate-y-10 flex-row items-center justify-between"
    >
      <Pressable
        onPress={entry.onPrevious}
        disabled={!entry.canGoPrevious}
        className="h-20 w-12 items-center justify-center active:opacity-60 disabled:opacity-20"
      >
        <Icon name="ChevronLeft" className="size-xl text-foreground" />
      </Pressable>
      <Pressable
        onPress={entry.onNext}
        disabled={!entry.canGoNext}
        className="h-20 w-12 items-center justify-center active:opacity-60 disabled:opacity-20"
      >
        <Icon name="ChevronRight" className="size-xl text-foreground" />
      </Pressable>
    </View>
  );
}

type InvoiceSaveSuccessState = {
  mode: InvoiceFormMode;
  type: NewSalesFormType;
  slug?: string | null;
  salesId?: number | null;
  orderId?: string | null;
};

function getSaveSuccessTitle(state: InvoiceSaveSuccessState) {
  const labels = getSalesDocumentLabels(state.type);
  if (state.mode === "create") return `${labels.noun} created`;
  return `${labels.noun} updated`;
}

function getSaveSuccessReference(state: InvoiceSaveSuccessState) {
  const labels = getSalesDocumentLabels(state.type);
  if (state.orderId) return state.orderId;
  if (state.salesId) return `${labels.referencePrefix}${state.salesId}`;
  if (state.slug) return state.slug;
  return labels.noun;
}

function getSaveSuccessOverviewRoute(state: InvoiceSaveSuccessState | null) {
  const documentNo = state?.orderId?.trim();
  if (!documentNo) return null;

  return state?.type === "quote"
    ? ({
        pathname: "/(sales)/quotes/[quoteNo]",
        params: { quoteNo: documentNo },
      } as const)
    : ({
        pathname: "/(sales)/orders/[orderNo]",
        params: { orderNo: documentNo },
      } as const);
}

function InvoiceSaveSuccessModal({
  state,
  onContinueEditing,
  onGoToOverview,
  onCreateNew,
  onGoHome,
}: {
  state: InvoiceSaveSuccessState | null;
  onContinueEditing: () => void;
  onGoToOverview: () => void;
  onCreateNew: () => void;
  onGoHome: () => void;
}) {
  const labels = getSalesDocumentLabels(state?.type || "order");
  const reference = state ? getSaveSuccessReference(state) : labels.noun;
  const canGoToOverview = Boolean(getSaveSuccessOverviewRoute(state));

  return (
    <Modal
      visible={Boolean(state)}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onContinueEditing}
    >
      <SafeArea style={{ flex: 1 }}>
        <View className="flex-1 bg-background px-5 py-6">
          <View className="flex-1 justify-center">
            <View className="items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Icon name="Check" className="text-primary" size={34} />
              </View>
              <Text className="mt-6 text-center text-3xl font-black text-foreground">
                {state ? getSaveSuccessTitle(state) : "Saved"}
              </Text>
              <Text className="mt-3 max-w-xs text-center text-sm leading-6 text-muted-foreground">
                Your {labels.lowerNoun} is saved. Choose what you want to do
                next.
              </Text>
            </View>

            <View className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Reference
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-1 max-w-56 text-lg font-black text-foreground"
                  >
                    {reference}
                  </Text>
                </View>
                <View className="rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-xs font-bold text-primary">Saved</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="gap-3 pb-2">
            <Button
              className="h-12 rounded-xl"
              disabled={!canGoToOverview}
              onPress={onGoToOverview}
            >
              <Text>Go to overview</Text>
              <Icon
                name="ReceiptText"
                className="text-primary-foreground"
                size={16}
              />
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl"
              onPress={onContinueEditing}
            >
              <Text>Continue editing</Text>
              <Icon name="Pencil" className="text-foreground" size={16} />
            </Button>
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl"
                onPress={onCreateNew}
              >
                <Icon name="Plus" className="text-foreground" size={16} />
                <Text>Create new</Text>
              </Button>
              <Button
                variant="ghost"
                className="h-12 flex-1 rounded-xl"
                onPress={onGoHome}
              >
                <Icon name="House" className="text-foreground" size={16} />
                <Text>Go home</Text>
              </Button>
            </View>
          </View>
        </View>
      </SafeArea>
    </Modal>
  );
}

export function InvoiceFormScreen({
  mode,
  skipInitialCustomerSelector = false,
  slug,
  type = "order",
}: {
  mode: InvoiceFormMode;
  skipInitialCustomerSelector?: boolean;
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
  const { saveDraft, saveFinal } = useInvoiceFormActions();
  const isSaving = saveStatus === "saving";
  const { profiles, getProfileCoefficient, isLoadingProfiles } =
    useInvoiceFormProfiles();
  const { resolveTaxRate, isLoadingTaxProfiles } = useInvoiceFormTaxProfiles();
  const resolvedCustomerQuery = useInvoiceFormResolvedCustomer({
    customerId,
    billingId: billingAddressId,
    shippingId: shippingAddressId,
  });
  const recordQuery = useInvoiceFormRecord({
    mode,
    slug,
    type,
    customerId: mode === "create" ? customerId : null,
  });
  const [openItemsSheet, setOpenItemsSheet] = useState<(() => void) | null>(
    null,
  );
  const [activeItemHeaderTitle, setActiveItemHeaderTitle] = useState<
    string | null
  >(null);
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<InvoiceFormRecoverySnapshot | null>(null);
  const [footerActionsHidden, setFooterActionsHidden] = useState(false);
  const [formScrollY, setFormScrollY] = useState(0);
  const [stickyWorkflowHeader, setStickyWorkflowHeader] =
    useState<WorkflowStickyHeaderEntry | null>(null);
  const [inlineWorkflowProceedAction, setInlineWorkflowProceedAction] =
    useState<WorkflowFloatingActionEntry | null>(null);
  const [itemNavigation, setItemNavigation] =
    useState<InvoiceItemNavigationEntry | null>(null);
  const [saveSuccess, setSaveSuccess] =
    useState<InvoiceSaveSuccessState | null>(null);
  const hydratedVersionRef = useRef<string | null>(null);
  const recoveryReadRef = useRef<string | null>(null);
  const initialCustomerRouteOpenedRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const formScrollRef = useRef<FormScrollHandle | null>(null);
  const shouldShowInitialCustomerStep =
    mode === "create" &&
    skipInitialCustomerSelector &&
    !customerId &&
    !customer;
  const noun = type === "quote" ? "quote" : "invoice";
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
    if (
      mode !== "create" ||
      skipInitialCustomerSelector ||
      initialCustomerRouteOpenedRef.current
    ) {
      return;
    }
    initialCustomerRouteOpenedRef.current = true;
    router.replace({
      pathname: "/(sales)/invoices/customer-selector",
      params: { type, source: "new" },
    } as Href);
  }, [mode, router, skipInitialCustomerSelector, type]);

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
    const profileMeta = readSalesFormObjectMetadata(defaultProfile?.meta) || {};
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
    const documentLabel = type === "quote" ? "quote" : "invoice";
    const failureMessage = getMobileInvoiceSaveErrorMessage(
      error,
      documentLabel,
    );
    if (
      message.toLowerCase().includes("out of date") ||
      classifyMobileInvoiceSaveError(error) === "conflict"
    ) {
      actions.markStale(failureMessage);
      return;
    }
    actions.markError(failureMessage);
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

  const showSaveSuccess = (result?: InvoiceFormSaveResult) => {
    setSaveSuccess({
      mode,
      type: (result?.type || type) as NewSalesFormType,
      slug: result?.slug ?? recoverySlug ?? slug ?? null,
      salesId: result?.salesId ?? recoverySalesId ?? null,
      orderId: result?.orderId ?? orderId ?? null,
    });
  };

  const navigateToSavedEditRoute = (result?: { slug?: string | null }) => {
    if (mode !== "create" || !result?.slug) return;
    router.replace({
      pathname: "/(sales)/invoices/[slug]",
      params: { slug: result.slug, type },
    });
  };

  const continueEditingSavedDocument = () => {
    const success = saveSuccess;
    setSaveSuccess(null);
    if (mode !== "create" || !success?.slug) return;
    router.replace({
      pathname: "/(sales)/invoices/[slug]",
      params: { slug: success.slug, type: success.type },
    });
  };

  const replaceSalesStack = useCallback(
    (route: Href) => {
      router.dismissAll();
      router.replace(route);
    },
    [router],
  );

  const goToOverviewAfterSave = () => {
    const route = getSaveSuccessOverviewRoute(saveSuccess);
    if (!route) return;
    setSaveSuccess(null);
    replaceSalesStack(route as Href);
  };

  const createNewAfterSave = () => {
    const nextType = saveSuccess?.type || type;
    setSaveSuccess(null);
    actions.reset();
    actions.setFormType(nextType);
    replaceSalesStack({
      pathname: "/(sales)/invoices/customer-selector",
      params: { type: nextType, source: "new" },
    } as Href);
  };

  const goHomeAfterSave = () => {
    setSaveSuccess(null);
    replaceSalesStack("/(sales)" as Href);
  };

  const handleSaveDraft = async () => {
    if (!actions.validateBeforeSave()) return;
    try {
      actions.markSaving();
      const result = await runMobileInvoiceSaveRequest(() =>
        saveDraft(actions.buildSavePayload(true)),
      );
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
      const result = await runMobileInvoiceSaveRequest(() =>
        saveFinal(actions.buildSavePayload(false)),
      );
      actions.markSaved(result);
      clearRecoveryKeys({
        slug: result.slug,
        salesId: result.salesId,
      });
      showSaveSuccess(result);
    } catch (error) {
      markSaveFailure(error);
    }
  };

  const handleItemsSheetPresenterChange = useCallback(
    (presenter: (() => void) | null) => {
      setOpenItemsSheet(presenter ? () => presenter : null);
    },
    [],
  );

  const handleFormScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = nextY - lastScrollYRef.current;
      lastScrollYRef.current = nextY;
      setFormScrollY((current) =>
        Math.abs(current - nextY) > 2 ? nextY : current,
      );

      if (nextY < 12) {
        setFooterActionsHidden(false);
        return;
      }
      if (delta > 8) {
        setFooterActionsHidden(true);
        return;
      }
      if (delta < -8) {
        setFooterActionsHidden(false);
      }
    },
    [],
  );
  const handleRequestFormScrollTo = useCallback(
    (y: number, options?: FormScrollOptions) => {
      const nextY = Math.max(0, y);
      formScrollRef.current?.scrollTo?.({
        y: nextY,
        animated: options?.animated ?? false,
      });
      lastScrollYRef.current = nextY;
      setFormScrollY(nextY);
      setFooterActionsHidden(false);
    },
    [],
  );
  const handleStickyWorkflowHeaderChange = useCallback(
    (entry: WorkflowStickyHeaderEntry | null) => {
      setStickyWorkflowHeader((current) => {
        if (!entry) return current ? null : current;
        if (current?.key === entry.key) return current;
        return entry;
      });
    },
    [],
  );
  const handleInlineWorkflowProceedActionChange = useCallback(
    (entry: WorkflowFloatingActionEntry | null) => {
      setInlineWorkflowProceedAction((current) => {
        if (!entry) return current ? null : current;
        if (
          current?.key === entry.key &&
          current.label === entry.label &&
          current.footerOffset === entry.footerOffset &&
          current.onPress === entry.onPress
        ) {
          return current;
        }
        return entry;
      });
    },
    [],
  );
  const formBottomPadding = FORM_SCROLL_BOTTOM_PADDING;

  return (
    <SafeArea>
      <FloatingInvoiceActionHost>
        <View className="flex-1 bg-background">
          <InvoiceFormHeader
            title={activeItemHeaderTitle || headerTitle}
            onOpenItemsSheet={openItemsSheet}
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
          ) : shouldShowInitialCustomerStep ? (
            <View className="flex-1">
              <CustomerStep
                type={type}
                onCustomerSelected={() => actions.setStep("items")}
              />
              <View className="px-4 pb-4 pt-3">
                <Text className="text-center text-xs text-muted-foreground">
                  Customer is required before adding {noun} items.
                </Text>
              </View>
            </View>
          ) : (
            <KeyboardAwareScrollView
              ref={(node) => {
                formScrollRef.current = node as FormScrollHandle | null;
              }}
              className="flex-1"
              bottomOffset={FORM_KEYBOARD_BOTTOM_OFFSET}
              disableScrollOnKeyboardHide
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onScroll={handleFormScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingHorizontal: 0,
                paddingTop: 4,
                paddingBottom: formBottomPadding,
              }}
            >
              {SHOW_LOCAL_RECOVERY_ALERT && recoverySnapshot ? (
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
              <ItemsStep
                onItemsSheetPresenterChange={handleItemsSheetPresenterChange}
                footerActionsHidden={footerActionsHidden}
                initialWorkflowStepPreference={
                  mode === "edit" ? "last" : undefined
                }
                onComponentScroll={handleFormScroll}
                formScrollY={formScrollY}
                onStickyWorkflowHeaderChange={handleStickyWorkflowHeaderChange}
                onInlineWorkflowProceedActionChange={
                  handleInlineWorkflowProceedActionChange
                }
                onActiveItemTitleChange={setActiveItemHeaderTitle}
                onItemNavigationChange={setItemNavigation}
                onRequestScrollTo={handleRequestFormScrollTo}
              />
            </KeyboardAwareScrollView>
          )}
          {!shouldShowInitialCustomerStep && stickyWorkflowHeader ? (
            <View className="absolute inset-x-0 top-14 z-30">
              {stickyWorkflowHeader.node}
            </View>
          ) : null}
          {!shouldShowInitialCustomerStep && inlineWorkflowProceedAction ? (
            <InlineWorkflowFloatingActionFrame
              footerOffset={inlineWorkflowProceedAction.footerOffset}
              label={inlineWorkflowProceedAction.label}
              onPress={inlineWorkflowProceedAction.onPress}
            />
          ) : null}
          {!shouldShowInitialCustomerStep ? (
            <>
              <FixedInvoiceItemNavigation entry={itemNavigation} />
              <View
                pointerEvents="box-none"
                className="absolute inset-x-0 bottom-0 z-40"
              >
                <InvoiceFormFooter
                  step="review"
                  canGoBack={false}
                  isSaving={isSaving}
                  validationError={validationError}
                  onBack={actions.prevStep}
                  onSaveDraft={handleSaveDraft}
                  onContinue={actions.nextStep}
                  onSaveFinal={handleCreateInvoice}
                  onOpenItemsSheet={openItemsSheet}
                  hidden={footerActionsHidden && !validationError}
                  finalActionLabel={
                    mode === "edit"
                      ? `Save ${type === "quote" ? "Quote" : "Invoice"}`
                      : `Create ${type === "quote" ? "Quote" : "Invoice"}`
                  }
                />
              </View>
            </>
          ) : null}
          {!shouldShowInitialCustomerStep && selectorOpen ? (
            <ItemSelector />
          ) : null}
          {!shouldShowInitialCustomerStep && workflowSelectorLine ? (
            <WorkflowStepSelector
              line={workflowSelectorLine}
              onClose={actions.closeWorkflowSelector}
              footerActionsHidden={footerActionsHidden}
              onComponentScroll={handleFormScroll}
              onStickyHeaderChange={handleStickyWorkflowHeaderChange}
            />
          ) : null}
          <InvoiceSaveSuccessModal
            state={saveSuccess}
            onContinueEditing={continueEditingSavedDocument}
            onGoToOverview={goToOverviewAfterSave}
            onCreateNew={createNewAfterSave}
            onGoHome={goHomeAfterSave}
          />
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
      </FloatingInvoiceActionHost>
    </SafeArea>
  );
}

export function CustomerSelectorScreen({
  onClose,
  onCustomerSelected,
  type: routeType,
}: {
  onClose: () => void;
  onCustomerSelected: () => void;
  type?: NewSalesFormType;
}) {
  const storeType = useInvoiceFormStore((state) => state.type);
  const type = routeType || storeType;

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
        <CustomerStep
          type={type}
          searchPlacement="bottom"
          onCustomerSelected={onCustomerSelected}
        />
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
  const labels = getSalesDocumentLabels(type);
  const createdAtLabel = type === "quote" ? "Quote date" : "Invoice date";
  const dueLabel = type === "quote" ? "Good until" : "Due date";
  const dueValue = type === "quote" ? meta.goodUntil : meta.paymentDueDate;
  const referenceValue = orderId || slug || salesId;
  const resolvedStatus = status || saveStatus || "Draft";

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="relative h-16 flex-row items-center justify-between border-b border-border px-3">
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="X" className="text-foreground" size={22} />
          </Pressable>
          <View className="pointer-events-none absolute inset-x-14 items-center">
            <Text className="text-base font-semibold text-foreground">
              {labels.detailsTitle}
            </Text>
          </View>
          <View className="h-11 w-11" />
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 }}
        >
          <DetailsSection title="Customer">
            {customer ? (
              <View>
                <Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  className="text-xl font-semibold text-foreground"
                >
                  {customer.name}
                </Text>
                <Text className="mt-1 text-sm font-medium text-muted-foreground">
                  {getCustomerContactLine(customer)}
                </Text>
                <View className="mt-5">
                  <DetailsRow label="Phone" value={customer.phone} />
                  <DetailsRow label="Email" value={customer.email} />
                  <DetailsRow
                    label="Billing"
                    value={customer.billingAddress}
                    multiline
                  />
                  <DetailsRow
                    label="Shipping"
                    value={customer.shippingAddress}
                    multiline
                  />
                </View>
              </View>
            ) : (
              <Text className="text-sm font-medium text-muted-foreground">
                No customer selected.
              </Text>
            )}
          </DetailsSection>

          <DetailsSection title={labels.detailsTitle}>
            <DetailsRow label={labels.referenceLabel} value={referenceValue} />
            <DetailsRow
              label="Status"
              value={<StatusBadge status={resolvedStatus} />}
            />
            <DetailsRow
              label={createdAtLabel}
              value={formatDate(meta.createdAt)}
            />
            <DetailsRow label={dueLabel} value={formatDate(dueValue)} />
            <DetailsRow label="Payment term" value={meta.paymentTerm} />
            <DetailsRow label="Payment method" value={meta.paymentMethod} />
            <DetailsRow label="Delivery" value={meta.deliveryOption} />
            <DetailsRow label="PO" value={meta.po} />
            <DetailsRow label="Tax code" value={meta.taxCode} />
            <DetailsRow label="Notes" value={meta.notes} multiline />
          </DetailsSection>

          <TotalsPanel summary={summary} />
        </ScrollView>
        <View className="border-t border-border bg-card px-4 pb-4 pt-3">
          <View className="rounded-2xl bg-primary/5 px-4 py-3">
            <View className="flex-row items-end justify-between gap-4">
              <Text className="text-sm font-bold text-muted-foreground">
                Grand total
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="shrink text-right text-2xl font-bold text-foreground"
              >
                {formatMoney(summary.totalWithCcc ?? summary.grandTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeArea>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-4 rounded-2xl border border-border bg-card p-4">
      <Text className="text-base font-bold text-foreground">{title}</Text>
      <View className="mt-3">{children}</View>
    </View>
  );
}

function DetailsRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: ReactNode;
  multiline?: boolean;
}) {
  const resolved =
    value == null || value === ""
      ? "-"
      : typeof value === "number"
        ? String(value)
        : value;
  return (
    <View className="border-b border-border/40 py-2.5">
      <View className="flex-row gap-4">
        <Text className="w-28 text-sm font-medium text-muted-foreground">
          {label}
        </Text>
        {typeof resolved === "string" ? (
          <Text
            numberOfLines={multiline ? undefined : 2}
            className="min-w-0 flex-1 text-right text-sm font-semibold text-foreground"
          >
            {resolved}
          </Text>
        ) : (
          <View className="min-w-0 flex-1 items-end">{resolved}</View>
        )}
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const label = status == null || status === "" ? "Draft" : status;
  return (
    <View className="rounded-full bg-muted px-3 py-1">
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
    </View>
  );
}

function TotalsPanel({ summary }: { summary: NewSalesFormSummary }) {
  return (
    <View className="mb-4 mt-4 rounded-2xl border border-border bg-card p-4">
      <Text className="text-base font-bold text-foreground">Totals</Text>
      <View className="mt-3 gap-2">
        <TotalRow label="Subtotal" value={formatMoney(summary.subTotal)} />
        <TotalRow
          label="Discount"
          value={formatMoney(-(summary.discount || 0))}
        />
        <TotalRow label="Delivery" value={formatMoney(summary.delivery || 0)} />
        <TotalRow label="Labor" value={formatMoney(summary.labor || 0)} />
        {Math.abs(Number(summary.ccc || 0)) > 0 ? (
          <TotalRow label="C.C.C" value={formatMoney(summary.ccc || 0)} />
        ) : null}
        <TotalRow label="Tax" value={formatMoney(summary.taxTotal)} />
      </View>
    </View>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-1.5">
      <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}
