import type { Db } from "./types";
import {
  getSalesProductionPlan,
  type SalesProductionPlan,
  type SalesProductionPlanComponent,
  type SalesProductionReadiness,
} from "./sales-fulfillment-plan";
import { syncSalesInventoryLineItems } from "./sync-sales-inventory-line-items";

const READY_READINESSES = new Set<SalesProductionReadiness>([
  "ready_for_production",
  "fulfilled",
]);

export type ProductionReadinessBlocker = {
  lineItemId: number | null;
  salesItemId: number | null;
  lineTitle: string | null;
  componentId: number | null;
  componentName: string | null;
  readiness: SalesProductionReadiness | "not_synced";
  stockStatus: string | null;
  reason:
    | "missing_inventory_components"
    | "awaiting_inbound"
    | "allocation_review"
    | "blocked";
};

export type ProductionReadinessGateResult = {
  allowed: boolean;
  readiness: SalesProductionReadiness | "not_synced";
  blockers: ProductionReadinessBlocker[];
};

export class ProductionReadinessGateError extends Error {
  blockers: ProductionReadinessBlocker[];
  readiness: ProductionReadinessGateResult["readiness"];

  constructor(result: ProductionReadinessGateResult) {
    super("Production cannot start until required inventory is ready.");
    this.name = "ProductionReadinessGateError";
    this.blockers = result.blockers;
    this.readiness = result.readiness;
  }
}

function blockerReason(
  readiness: SalesProductionReadiness,
): ProductionReadinessBlocker["reason"] {
  if (readiness === "awaiting_inbound") return "awaiting_inbound";
  if (readiness === "allocation_review") return "allocation_review";
  return "blocked";
}

function componentBlocker(
  component: SalesProductionPlanComponent,
): ProductionReadinessBlocker {
  return {
    lineItemId: component.lineItemId,
    salesItemId: component.salesItemId,
    lineTitle: component.lineTitle,
    componentId: component.componentId,
    componentName: component.componentName,
    readiness: component.readiness,
    stockStatus: component.stockStatus,
    reason: blockerReason(component.readiness),
  };
}

export function evaluateProductionReadinessGate(
  plan: SalesProductionPlan,
): ProductionReadinessGateResult {
  if (!plan.components.length) {
    return {
      allowed: false,
      readiness: "not_synced",
      blockers: [
        {
          lineItemId: null,
          salesItemId: null,
          lineTitle: null,
          componentId: null,
          componentName: null,
          readiness: "not_synced",
          stockStatus: null,
          reason: "missing_inventory_components",
        },
      ],
    };
  }

  const blockers = plan.components
    .filter((component) => !READY_READINESSES.has(component.readiness))
    .map(componentBlocker);

  return {
    allowed: blockers.length === 0,
    readiness: plan.summary.readiness,
    blockers,
  };
}

export async function assertProductionReadinessForSale(
  db: Db,
  input: {
    salesOrderId: number;
    lineItemUids?: string[] | null;
    triggeredByUserId?: number | null;
  },
) {
  await syncSalesInventoryLineItems(db as any, {
    salesOrderId: input.salesOrderId,
    source: "repair",
    triggeredByUserId: input.triggeredByUserId ?? null,
  });

  const plan = await getSalesProductionPlan(db, {
    salesOrderId: input.salesOrderId,
    lineItemUids: input.lineItemUids,
  });
  const result = evaluateProductionReadinessGate(plan);

  if (!result.allowed) {
    throw new ProductionReadinessGateError(result);
  }

  return result;
}
