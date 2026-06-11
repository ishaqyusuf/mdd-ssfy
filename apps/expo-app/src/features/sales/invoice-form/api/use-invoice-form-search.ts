import { _trpc } from "@/components/static-trpc";
import {
  buildStepComponentOverrideMap,
  profileAdjustedDoorSalesPrice,
  resolveWorkflowVisibleComponents,
  resolveWorkflowRouteStatus,
  type WorkflowComponentRecord,
  type WorkflowRouteData,
  type WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  invoiceCustomers,
  invoiceMobileWorkflowRouteData,
  invoiceSelectableItems,
} from "../mock-data";
import { USE_MOCK_INVOICE_FORM } from "./config";
import type { InvoiceCustomer, InvoiceSelectableItem, NewSalesFormType } from "../types";

type RealCustomerRow = Record<string, unknown>;
type RealProductRow = Record<string, unknown> & {
  categoryPath?: Array<Record<string, unknown> | string | number>;
};
type RealWorkflowComponentRow = WorkflowComponentRecord & Record<string, unknown>;

export function useInvoiceFormCustomerSearch(input: {
  type?: NewSalesFormType;
  query?: string;
}) {
  const customerQuery = (input.query || "").trim();
  const type = input.type || "order";
  const hasSearchText = customerQuery.length > 0;

  const recentCustomers = useQuery(
    !USE_MOCK_INVOICE_FORM
      ? _trpc.newSalesForm.searchCustomers.queryOptions(
          {
            query: "",
            recent: true,
            type,
            limit: 5,
          },
          {
            enabled: true,
          },
        )
      : {
          queryKey: ["invoice-form", "recent-customers", "mock-disabled"],
          queryFn: async () => [],
          enabled: false,
        },
  );

  const searchedCustomers = useQuery(
    !USE_MOCK_INVOICE_FORM && hasSearchText
      ? _trpc.newSalesForm.searchCustomers.queryOptions(
          {
            query: customerQuery,
            recent: false,
            type,
            limit: 10,
          },
          {
            enabled: true,
          },
        )
      : {
          queryKey: ["invoice-form", "searched-customers", "disabled"],
          queryFn: async () => [],
          enabled: false,
        },
  );

  const mockCustomers = useMemo(() => {
    const query = customerQuery.toLowerCase();
    if (!query) return invoiceCustomers;
    return invoiceCustomers.filter((customer) =>
      [
        customer.name,
        customer.businessName,
        customer.contact,
        customer.phone,
        customer.email,
        customer.billingAddress,
        customer.shippingAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customerQuery]);

  const recentRows = useMemo(
    () => listRows<RealCustomerRow>(recentCustomers.data).map(mapRealCustomer),
    [recentCustomers.data],
  );
  const searchedRows = useMemo(
    () => listRows<RealCustomerRow>(searchedCustomers.data).map(mapRealCustomer),
    [searchedCustomers.data],
  );

  return {
    customers: USE_MOCK_INVOICE_FORM
      ? mockCustomers
      : hasSearchText
        ? searchedRows
        : recentRows,
    isLoadingCustomers: USE_MOCK_INVOICE_FORM
      ? false
      : hasSearchText
        ? searchedCustomers.isPending
        : recentCustomers.isPending,
    isSearchingCustomers:
      !USE_MOCK_INVOICE_FORM && hasSearchText && searchedCustomers.isFetching,
    hasSearchText,
  };
}

export function useInvoiceFormSearch(input: {
  scope?: "customers" | "items" | "all";
  type?: NewSalesFormType;
  customerQuery?: string;
  itemQuery?: string;
  category?: string;
  selectedProductIds?: number[];
  includeCustomComponents?: boolean;
  profileCoefficient?: number | null;
}) {
  const customerQuery = (input.customerQuery || "").trim();
  const itemQuery = (input.itemQuery || "").trim();
  const scope = input.scope || "all";
  const needsCustomers = scope !== "items";
  const needsItems = scope !== "customers";
  const customerLimit = customerQuery ? 10 : 5;
  const type = input.type || "order";
  const productLimit = itemQuery ? 20 : 5;
  const selectedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          (input.selectedProductIds || [])
            .map((id) => Number(id || 0))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ),
    [input.selectedProductIds],
  );
  const includeCustomComponents = Boolean(input.includeCustomComponents);
  const profileCoefficient = Number(input.profileCoefficient || 1) || 1;

  const realCustomers = useQuery(
    needsCustomers && !USE_MOCK_INVOICE_FORM
      ? _trpc.newSalesForm.searchCustomers.queryOptions(
          {
            query: customerQuery,
            recent: !customerQuery,
            type,
            limit: customerLimit,
          },
          {
            enabled: true,
          },
        )
      : {
          queryKey: ["invoice-form", "customers", "disabled"],
          queryFn: async () => [],
          enabled: false,
        },
  );

  const realProducts = useQuery(
    needsItems && !USE_MOCK_INVOICE_FORM
      ? _trpc.newSalesForm.searchShelfProducts.queryOptions(
          {
            query: itemQuery,
            selectedIds: selectedProductIds,
            limit: productLimit,
          },
          {
            enabled: true,
          },
        )
      : {
          queryKey: ["invoice-form", "products", "disabled"],
          queryFn: async () => [],
          enabled: false,
        },
  );
  const realWorkflowRoute = useQuery(
    needsItems && !USE_MOCK_INVOICE_FORM
      ? _trpc.newSalesForm.getStepRouting.queryOptions(
          {},
          {
            enabled: true,
            refetchOnWindowFocus: false,
          },
        )
      : {
          queryKey: ["invoice-form", "workflow-route", "disabled"],
          queryFn: async () => null,
          enabled: false,
        },
  );
  const workflowRouteData = USE_MOCK_INVOICE_FORM
    ? invoiceMobileWorkflowRouteData
    : (realWorkflowRoute.data as WorkflowRouteData | null | undefined) || null;
  const rootWorkflowStep = getWorkflowRootStepRecord(workflowRouteData);
  const rootStepId = getWorkflowRootStepId(workflowRouteData);
  const rootStepTitle = String(
    rootWorkflowStep?.step?.title || rootWorkflowStep?.title || "",
  ).trim();
  const hasRootStepLookup = Boolean(rootStepId || rootStepTitle);
  const realWorkflowComponents = useQuery(
    needsItems &&
      !USE_MOCK_INVOICE_FORM &&
      Boolean(workflowRouteData) &&
      hasRootStepLookup
      ? _trpc.sales.getStepComponents.queryOptions(
          {
            stepId: rootStepId || undefined,
            stepTitle: rootStepId ? undefined : rootStepTitle || "Item Type",
          },
          {
            enabled: true,
            refetchOnWindowFocus: false,
          },
        )
      : {
          queryKey: ["invoice-form", "workflow-components", "disabled"],
          queryFn: async () => [],
          enabled: false,
        },
  );
  const rootWorkflowStatus = USE_MOCK_INVOICE_FORM
    ? null
    : resolveWorkflowRouteStatus({
        routeQuery: realWorkflowRoute,
        rootComponentsQuery: realWorkflowComponents,
        routeReady: Boolean(workflowRouteData),
        rootStepId: rootStepId || (hasRootStepLookup ? rootStepTitle : null),
        rootComponentsCount: Array.isArray(realWorkflowComponents.data)
          ? realWorkflowComponents.data.length
          : 0,
        isLoading:
          realWorkflowRoute.isPending ||
          (hasRootStepLookup && realWorkflowComponents.isPending),
      });

  const mockCustomers = useMemo(() => {
    const query = (input.customerQuery || "").trim().toLowerCase();
    if (!query) return invoiceCustomers;
    return invoiceCustomers.filter((customer) =>
      [
        customer.name,
        customer.contact,
        customer.phone,
        customer.email,
        customer.billingAddress,
        customer.shippingAddress,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [input.customerQuery]);

  const mockProducts = useMemo(() => {
    const query = (input.itemQuery || "").trim().toLowerCase();
    const category = input.category || "All";
    const configuredRootUids = new Set(
      Object.keys(invoiceMobileWorkflowRouteData.composedRouter || {}),
    );
    const rootWorkflowStep = getWorkflowRootStepRecord(invoiceMobileWorkflowRouteData);
    const workflowItems =
      rootWorkflowStep && configuredRootUids.size
        ? resolveWorkflowVisibleComponents({
            components: invoiceSelectableItems
              .filter((item) => item.source === "workflow")
              .map(mapMockWorkflowComponentRecord)
              .filter((component) =>
                configuredRootUids.has(String(component.uid || "")),
              ),
            steps: [],
            activeStep: rootWorkflowStep,
            overrides: buildStepComponentOverrideMap(rootWorkflowStep),
            includeCustomComponents,
            profileCoefficient,
          }).map(mapMockWorkflowComponent)
        : [];
    const shelfItems = invoiceSelectableItems
      .filter((item) => item.source !== "workflow")
      .filter(
        (item) =>
          !item.productId ||
          !selectedProductIds.includes(Number(item.productId || 0)),
      )
      .map((item) => applyShelfProfilePrice(item, profileCoefficient));
    return [...workflowItems, ...shelfItems].filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const queryMatch =
        !query ||
        [item.title, item.sku, item.category, item.status]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return categoryMatch && queryMatch;
    });
  }, [
    includeCustomComponents,
    input.category,
    input.itemQuery,
    profileCoefficient,
    selectedProductIds,
  ]);

  const realCustomerRows = useMemo(
    () => listRows<RealCustomerRow>(realCustomers.data).map(mapRealCustomer),
    [realCustomers.data],
  );
  const realProductRows = useMemo(() => {
    const category = input.category || "All";
    const shelfRows = listRows<RealProductRow>(realProducts.data)
      .map((row) => mapRealProduct(row, profileCoefficient))
      .filter((item) => category === "All" || item.category === category);
    const configuredRootUids = new Set(
      Object.keys(workflowRouteData?.composedRouter || {}),
    );
    const rootWorkflowStep = getWorkflowRootStepRecord(workflowRouteData);
    const componentRows =
      workflowRouteData && configuredRootUids.size && rootWorkflowStep
        ? resolveWorkflowVisibleComponents({
            components: listRows<RealWorkflowComponentRow>(
              realWorkflowComponents.data,
            )
              .map(mapRealWorkflowComponentRecord)
              .filter((component) =>
                configuredRootUids.has(String(component.uid || "")),
              ),
            steps: [],
            activeStep: rootWorkflowStep,
            overrides: buildStepComponentOverrideMap(rootWorkflowStep),
            includeCustomComponents,
            profileCoefficient,
          })
            .map(mapRealWorkflowComponent)
            .filter((item) => {
              const categoryMatch = category === "All" || item.category === category;
              const queryMatch =
                !itemQuery ||
                [item.title, item.sku, item.category, item.status]
                  .join(" ")
                  .toLowerCase()
                  .includes(itemQuery.toLowerCase());
              return categoryMatch && queryMatch;
            })
        : [];
    return [...componentRows, ...shelfRows];
  }, [
    input.category,
    includeCustomComponents,
    itemQuery,
    profileCoefficient,
    realProducts.data,
    realWorkflowComponents.data,
    workflowRouteData,
  ]);

  return {
    customers: USE_MOCK_INVOICE_FORM ? mockCustomers : realCustomerRows,
    products: USE_MOCK_INVOICE_FORM ? mockProducts : realProductRows,
    isLoadingCustomers: USE_MOCK_INVOICE_FORM ? false : realCustomers.isPending,
    isLoadingProducts: USE_MOCK_INVOICE_FORM
      ? false
      : realProducts.isPending ||
        realWorkflowRoute.isPending ||
        (Boolean(rootStepId) && realWorkflowComponents.isPending),
    workflowRouteData,
    rootWorkflowStatus,
    refetchRootWorkflow: () => {
      void realWorkflowRoute.refetch();
      void realWorkflowComponents.refetch();
    },
  };
}

function listRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapRealCustomer(row: RealCustomerRow): InvoiceCustomer {
  const id = Number(row.customerId ?? row.id ?? 0);
  return {
    id,
    profileId: row.profileId == null ? null : Number(row.profileId || 0),
    name: String(row.businessName || row.name || "Customer"),
    businessName: String(row.businessName || ""),
    contact: String(row.name || row.businessName || "Customer"),
    phone: String(row.phone || row.phoneNo || ""),
    email: String(row.email || ""),
    billingAddressId: Number(row.billingAddressId || 0),
    shippingAddressId: Number(row.shippingAddressId || row.billingAddressId || 0),
    billingAddress: String(row.billingAddress || row.shippingAddress || ""),
    shippingAddress: String(row.shippingAddress || row.billingAddress || ""),
    taxCode: String(row.taxCode || ""),
  };
}

function mapRealProduct(
  row: RealProductRow,
  profileCoefficient: number,
): InvoiceSelectableItem {
  const categoryPath = Array.isArray(row.categoryPath) ? row.categoryPath : [];
  const firstCategory = categoryPath[0];
  const categoryLabel = String(
    (typeof firstCategory === "object" && firstCategory
      ? firstCategory.name
      : firstCategory) || "Custom",
  );
  const productId = Number(row.id || 0);
  const unitPrice = Number(row.unitPrice || 0);
  const categoryIds = categoryPath
    .map((entry) =>
      Number(typeof entry === "object" && entry ? entry.id : entry),
    )
    .filter((id) => Number.isFinite(id) && id > 0);
  return applyShelfProfilePrice({
    uid: `shelf-${productId}`,
    source: "shelf",
    productId,
    title: String(row.title || "Shelf item"),
    sku: `SHELF-${productId}`,
    category: normalizeCategory(categoryLabel),
    categoryId: row.categoryId == null ? null : Number(row.categoryId || 0),
    parentCategoryId:
      row.parentCategoryId == null ? null : Number(row.parentCategoryId || 0),
    categoryIds,
    unitPrice,
    basePrice: unitPrice,
    salesPrice: unitPrice,
    taxxable: true,
    status: "Available",
  }, profileCoefficient);
}

function applyShelfProfilePrice(
  item: InvoiceSelectableItem,
  profileCoefficient: number,
): InvoiceSelectableItem {
  if (item.source !== "shelf" || !item.productId) return item;
  const basePrice = Number(item.basePrice ?? item.unitPrice ?? item.salesPrice ?? 0);
  const salesPrice = profileAdjustedDoorSalesPrice(
    item.salesPrice,
    basePrice,
    profileCoefficient,
  );
  return {
    ...item,
    basePrice,
    salesPrice,
    unitPrice: salesPrice,
  };
}

function mapRealWorkflowComponentRecord(
  row: RealWorkflowComponentRow,
): WorkflowComponentRecord {
  const componentId = row.id == null ? null : Number(row.id || 0);
  const componentUid = String(row.uid || componentId || "");
  return {
    ...row,
    id: componentId,
    uid: componentUid,
    title: String(row.title || row.value || componentUid || "Component"),
    salesPrice:
      row.salesPrice == null ? null : Number(row.salesPrice || 0),
    basePrice: row.basePrice == null ? null : Number(row.basePrice || 0),
  };
}

function mapMockWorkflowComponentRecord(
  item: InvoiceSelectableItem,
): WorkflowComponentRecord {
  return {
    ...item,
    selectableUid: item.uid,
    id: item.componentId ?? null,
    uid: item.componentUid || item.uid,
    title: item.title,
    salesPrice: item.salesPrice ?? item.unitPrice ?? null,
    basePrice: item.basePrice ?? item.unitPrice ?? null,
  };
}

function mapMockWorkflowComponent(
  row: WorkflowComponentRecord,
): InvoiceSelectableItem {
  const selectableUid = String(row.selectableUid || row.uid || "");
  const componentUid = String(row.uid || selectableUid);
  const unitPrice = Number(row.salesPrice ?? row.basePrice ?? 0);
  return {
    uid: selectableUid || componentUid,
    source: "workflow",
    componentId: row.id == null ? null : Number(row.id || 0),
    componentUid,
    title: String(row.title || componentUid || "Component"),
    sku: String(row.sku || componentUid || "Component"),
    category: "Components",
    unitPrice,
    basePrice: row.basePrice == null ? unitPrice : Number(row.basePrice || 0),
    salesPrice: unitPrice,
    taxxable: true,
    status: "Configure",
  };
}

function mapRealWorkflowComponent(row: WorkflowComponentRecord): InvoiceSelectableItem {
  const componentId = row.id == null ? null : Number(row.id || 0);
  const componentUid = String(row.uid || componentId || "");
  const unitPrice = Number(row.salesPrice ?? row.basePrice ?? 0);
  return {
    uid: `workflow-${componentUid}`,
    source: "workflow",
    componentId,
    componentUid,
    title: String(row.title || row.value || componentUid || "Component"),
    sku: componentUid || `COMP-${componentId || "NEW"}`,
    category: "Components",
    unitPrice,
    basePrice: row.basePrice == null ? unitPrice : Number(row.basePrice || 0),
    salesPrice: unitPrice,
    taxxable: true,
    status: "Configure",
  };
}

function getWorkflowRootStepId(routeData?: WorkflowRouteData | null) {
  const step = getWorkflowRouteRootStep(routeData);
  const id = Number(step?.id || 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getWorkflowRootStepRecord(
  routeData?: WorkflowRouteData | null,
): WorkflowStepRecord | null {
  const step = getWorkflowRouteRootStep(routeData);
  if (!step) return null;
  return {
    stepId: step.id == null ? null : Number(step.id || 0),
    uid: step.uid || null,
    title: step.title || null,
    step,
  } as WorkflowStepRecord;
}

function getWorkflowRouteRootStep(routeData?: WorkflowRouteData | null) {
  const rootUid = routeData?.rootStepUid;
  if (rootUid && routeData?.stepsByUid?.[rootUid]) {
    return routeData.stepsByUid[rootUid];
  }

  const routeSteps = Object.values(routeData?.stepsByUid || {}).filter(Boolean);
  return (
    routeSteps.find((step) => normalizeRouteTitle(step?.title) === "item type") ||
    routeSteps.find((step) => Number(step?.id || 0) === 1) ||
    null
  );
}

function normalizeRouteTitle(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeCategory(value: string): InvoiceSelectableItem["category"] {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("door")) return "Doors";
  if (normalized.includes("mould") || normalized.includes("mold")) return "Moulding";
  if (normalized.includes("labor") || normalized.includes("service")) return "Labor";
  if (normalized.includes("hardware")) return "Hardware";
  return "Custom";
}
