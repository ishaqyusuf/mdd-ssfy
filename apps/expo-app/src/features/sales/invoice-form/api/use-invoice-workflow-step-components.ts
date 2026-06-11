import { _trpc } from "@/components/static-trpc";
import type {
  WorkflowComponentRecord,
  WorkflowRouteData,
  WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  invoiceMobileWorkflowRouteData,
  invoiceWorkflowStepComponents,
} from "../mock-data";
import { USE_MOCK_INVOICE_FORM } from "./config";

type WorkflowComponentRow = WorkflowComponentRecord & Record<string, unknown>;
type DoorSupplierRow = Record<string, unknown>;

export function useInvoiceWorkflowStepComponents(step?: WorkflowStepRecord | null) {
  const stepId = Number(step?.stepId || step?.step?.id || 0);
  const stepTitle = String(step?.step?.title || step?.title || "");
  const stepUid = String(step?.step?.uid || step?.uid || "");
  const hasStepLookup = Boolean(stepId) || Boolean(stepTitle.trim());
  const doorStep = stepTitle.trim().toLowerCase() === "door";

  const realWorkflowRoute = useQuery(
    _trpc.newSalesForm.getStepRouting.queryOptions(
      {},
      {
        enabled: !USE_MOCK_INVOICE_FORM,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const realComponents = useQuery(
    _trpc.sales.getStepComponents.queryOptions(
      {
        stepId: stepId || undefined,
        stepTitle: stepId ? undefined : stepTitle || undefined,
      },
      {
        enabled: !USE_MOCK_INVOICE_FORM && hasStepLookup,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const realDoorSuppliers = useQuery(
    _trpc.sales.getSuppliers.queryOptions(
      {},
      {
        enabled: !USE_MOCK_INVOICE_FORM && doorStep,
        refetchOnWindowFocus: false,
      },
    ),
  );

  const mockComponents = useMemo(() => {
    if (!USE_MOCK_INVOICE_FORM) return [];
    const resolvedStepUid =
      stepUid ||
      (stepTitle.trim().toLowerCase() === "item type"
        ? invoiceMobileWorkflowRouteData.rootStepUid || ""
        : "");
    return invoiceWorkflowStepComponents[resolvedStepUid] || [];
  }, [stepTitle, stepUid]);

  return {
    workflowRouteData: USE_MOCK_INVOICE_FORM
      ? invoiceMobileWorkflowRouteData
      : ((realWorkflowRoute.data as WorkflowRouteData | null | undefined) || null),
    components: USE_MOCK_INVOICE_FORM
      ? mockComponents
      : listRows<WorkflowComponentRow>(realComponents.data).map(
          mapWorkflowComponent,
        ),
    isLoadingComponents: USE_MOCK_INVOICE_FORM
      ? false
      : realWorkflowRoute.isPending || (hasStepLookup && realComponents.isPending),
    doorSuppliers: USE_MOCK_INVOICE_FORM
      ? []
      : listRows<DoorSupplierRow>(
          readStepProducts(realDoorSuppliers.data),
        ).map(mapDoorSupplier),
    isLoadingDoorSuppliers: USE_MOCK_INVOICE_FORM
      ? false
      : doorStep && realDoorSuppliers.isPending,
    stepComponentsQuery: realComponents,
    refetchStepComponents: realComponents.refetch,
  };
}

function listRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readStepProducts(value: unknown) {
  if (!value || typeof value !== "object") return [];
  return (value as { stepProducts?: unknown }).stepProducts;
}

function mapWorkflowComponent(row: WorkflowComponentRow): WorkflowComponentRecord {
  return {
    ...row,
    id: row.id == null ? null : Number(row.id || 0),
    uid: String(row.uid || row.id || ""),
    title: String(row.title || row.value || row.uid || "Component"),
    salesPrice:
      row.salesPrice == null ? null : Number(row.salesPrice || 0),
    basePrice: row.basePrice == null ? null : Number(row.basePrice || 0),
  };
}

function mapDoorSupplier(row: DoorSupplierRow) {
  return {
    id: row.id == null ? null : Number(row.id || 0),
    uid: String(row.uid || ""),
    name: String(row.name || "Supplier"),
  };
}
