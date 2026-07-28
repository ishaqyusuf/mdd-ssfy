import { _trpc } from "@/components/static-trpc";
import type {
  WorkflowComponentRecord,
  WorkflowRouteData,
  WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { getWorkflowSelectableTitle } from "./workflow-selectable-copy";

type WorkflowComponentRow = WorkflowComponentRecord & Record<string, unknown>;
type DoorSupplierRow = Record<string, unknown>;

export function useInvoiceWorkflowStepComponents(step?: WorkflowStepRecord | null) {
  const stepId = Number(step?.stepId || step?.step?.id || 0);
  const stepTitle = String(step?.step?.title || step?.title || "");
  const hasStepLookup = Boolean(stepId) || Boolean(stepTitle.trim());
  const doorStep = stepTitle.trim().toLowerCase() === "door";

  const realWorkflowRoute = useQuery(
    _trpc.newSalesForm.getStepRouting.queryOptions(
      {},
      {
        enabled: true,
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
        enabled: hasStepLookup,
        refetchOnWindowFocus: false,
      },
    ),
  );
  const realDoorSuppliers = useQuery(
    _trpc.sales.getSuppliers.queryOptions(
      {},
      {
        enabled: doorStep,
        refetchOnWindowFocus: false,
      },
    ),
  );

  return {
    workflowRouteData:
      (realWorkflowRoute.data as WorkflowRouteData | null | undefined) || null,
    components: listRows<WorkflowComponentRow>(realComponents.data).map(
      mapWorkflowComponent,
    ),
    isLoadingComponents:
      realWorkflowRoute.isPending || (hasStepLookup && realComponents.isPending),
    doorSuppliers: listRows<DoorSupplierRow>(
      readStepProducts(realDoorSuppliers.data),
    ).map(mapDoorSupplier),
    isLoadingDoorSuppliers: doorStep && realDoorSuppliers.isPending,
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
    title: getWorkflowSelectableTitle(row),
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
