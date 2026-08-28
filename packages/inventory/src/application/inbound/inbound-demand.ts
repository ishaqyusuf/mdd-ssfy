import type { Db, TransactionClient } from "@gnd/db";
import {
  ACTIVE_INBOUND_DEMAND_STATUSES,
  ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES,
} from "./inbound-demand-policy";
import type { OrderInboundStatus } from "./inbound-demand-policy";
export {
  ACTIVE_INBOUND_DEMAND_STATUSES,
  ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES,
  canOrderInboundPromptMutateDemand,
  resolveOrderInboundDemandStatus,
} from "./inbound-demand-policy";
export type {
  CanOrderInboundPromptMutateDemandInput,
  OrderInboundStatus,
  ResolveOrderInboundDemandStatusInput,
} from "./inbound-demand-policy";

type DbLike = Db | TransactionClient;
type InboundDemandQueueStatus =
  | "pending"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";
export const NEW_INBOUND_SHIPMENT_STATUSES = [
  "pending",
  "in_progress",
] as const;
export type NewInboundShipmentStatus =
  (typeof NEW_INBOUND_SHIPMENT_STATUSES)[number];

export type CreateInboundShipmentFromDemandsInput = {
  supplierId?: number | null;
  demandIds: number[];
  reference?: string | null;
  expectedAt?: Date | null;
  status?: NewInboundShipmentStatus;
};

export type InboundDemandQuantitySelection = {
  demandIds: number[];
  qty: number;
};

export type CreateInboundShipmentInput = {
  supplierId?: number | null;
  reference?: string | null;
  expectedAt?: Date | null;
  status?: NewInboundShipmentStatus;
};

export type CreateInboundShipmentFromDemandsResult = {
  inboundId: number;
  createdItemCount: number;
  linkedDemandCount: number;
  linkedDemandIds: number[];
};

export type AssignInboundDemandsToShipmentResult = {
  inboundId: number;
  linkedDemandCount: number;
  linkedDemandIds: number[];
};

export type ReleaseCancelledInboundShipmentDemandResult = {
  inboundId: number;
  releasedDemandCount: number;
  recomputedComponentCount: number;
};

export type ReduceInboundShipmentDemandInput = {
	inboundId: number;
	demandId: number;
	targetQty: number;
};

export type ReduceInboundShipmentDemandResult = {
	inboundId: number;
	demandId: number;
	inboundShipmentItemId: number | null;
	lineItemComponentId: number;
	salesOrderId: number | null;
	orderId: string | null;
	lineTitle: string;
	previousQty: number;
	targetQty: number;
	receivedQty: number;
	previousItemQty: number;
	targetItemQty: number;
	removed: boolean;
	changed: boolean;
};

export type SalesAdjustmentInboundDisposition =
	| "CANCEL_OPEN_INBOUND"
	| "KEEP_IN_WAREHOUSE";

export class SalesAdjustmentInboundSnapshotConflictError extends Error {
	constructor(demandId: number) {
		super(
			`Inbound demand #${demandId} changed after approval. Review the sales adjustment again.`,
		);
		this.name = "SalesAdjustmentInboundSnapshotConflictError";
	}
}

export type ReconcileSalesAdjustmentInboundDemandsInput = {
	adjustmentId: string;
	disposition: SalesAdjustmentInboundDisposition;
	lines: Array<{
		beforeQty: number;
		proposedQty: number;
		inboundDemands: Array<{
			id: number;
			qty: number;
			qtyReceived: number;
			status: string;
			inboundShipmentItemId: number | null;
			inboundId: number | null;
			inboundStatus: string | null;
			inboundShipmentItemQty: number;
			inboundShipmentItemReceivedQty: number;
		}>;
	}>;
};

export type ReconcileSalesAdjustmentInboundDemandsResult = {
	adjustedDemandCount: number;
	affectedInboundIds: number[];
	cancelledOpenQty: number;
	keptWarehouseQty: number;
	inboundEffects: Array<{
		inboundId: number;
		cancelledOpenQty: number;
		keptWarehouseQty: number;
	}>;
};

export type InboundDemandQueueInput = {
  status?: InboundDemandQueueStatus[];
  supplierId?: number | null;
  saleId?: number | null;
};

export type InboundStatusDemandReconciliationInput = {
  take?: number | null;
};

export type ApplyOrderInboundStatusToInventoryDemandInput = {
  saleId: number;
  status: OrderInboundStatus;
  demandIds?: number[] | null;
};

export type ApplyOrderInboundStatusToInventoryDemandResult = {
  saleId: number;
  status: OrderInboundStatus;
  updatedDemandCount: number;
  recomputedComponentCount?: number;
  skipped: boolean;
  reason?:
    | "available_status_does_not_mutate_shortage_demand"
    | "selected_demand_ids_invalid";
};

export type SupplierReorderSuggestionDemandLike = {
  id?: number | null;
  qty?: number | null;
  qtyReceived?: number | null;
  inventoryVariantId: number;
  inventoryVariant?: {
    id?: number | null;
    sku?: string | null;
    uid?: string | null;
    inventory?: {
      id?: number | null;
      name?: string | null;
      defaultSupplier?: {
        id?: number | null;
        name?: string | null;
      } | null;
    } | null;
    supplierVariants?: Array<{
      supplierId?: number | null;
      supplier?: {
        id?: number | null;
        name?: string | null;
      } | null;
      supplierSku?: string | null;
      minOrderQty?: number | null;
      leadTimeDays?: number | null;
      preferred?: boolean | null;
      active?: boolean | null;
    }> | null;
  } | null;
  inboundShipmentItem?: {
    inbound?: {
      supplierId?: number | null;
      supplier?: {
        id?: number | null;
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

export type SupplierReorderSuggestion = {
  supplierId: number | null;
  supplierName: string;
  inventoryVariantId: number;
  inventoryName: string | null;
  sku: string | null;
  supplierSku: string | null;
  openDemandQty: number;
  suggestedOrderQty: number;
  minOrderQty: number | null;
  leadTimeDays: number | null;
  demandCount: number;
  demandIds: number[];
};

export type SupplierReorderSuggestionsSummary = {
  suggestionCount: number;
  supplierCount: number;
  openDemandQty: number;
  suggestedOrderQty: number;
};

export type SupplierReorderSuggestionsResult = {
  summary: SupplierReorderSuggestionsSummary;
  suggestions: SupplierReorderSuggestion[];
};

export type InboundStatusDemandReconciliationInputRow = {
  id: number;
  orderId?: string | null;
  slug?: string | null;
  inventoryStatus?: string | null;
  lineItems?: Array<{
    id: number;
    title?: string | null;
    components?: Array<{
      id: number;
      qtyInbound?: number | null;
      status?: string | null;
      inventoryVariant?: {
        id?: number | null;
        sku?: string | null;
        uid?: string | null;
        inventory?: {
          id?: number | null;
          name?: string | null;
        } | null;
      } | null;
      inboundDemands?: Array<{
        id: number;
        qty?: number | null;
        qtyReceived?: number | null;
        status?: string | null;
        inboundShipmentItemId?: number | null;
      }> | null;
    }> | null;
  }> | null;
};

export type InboundStatusDemandReconciliationRow = {
  saleId: number;
  orderId: string | null;
  slug: string | null;
  inventoryStatus: OrderInboundStatus;
  openDemandCount: number;
  openDemandQty: number;
  orderedDemandCount: number;
  issue:
    | "order_status_without_inventory_demand"
    | "available_status_with_open_inventory_demand"
    | "pending_order_has_ordered_inventory_demand";
  severity: "warning" | "critical";
  demandPreview: Array<{
    demandId: number;
    lineItemId: number;
    lineTitle: string | null;
    inventoryName: string | null;
    sku: string | null;
    qtyOpen: number;
    status: string | null;
  }>;
};

export type InboundStatusDemandReconciliationResult = {
  summary: {
    reviewedOrderCount: number;
    issueCount: number;
    orderStatusWithoutDemandCount: number;
    availableWithDemandCount: number;
    pendingOrderWithOrderedDemandCount: number;
    openDemandQty: number;
  };
  rows: InboundStatusDemandReconciliationRow[];
};

export type InboundShipmentDetailInput = {
  inboundId: number;
};

export type InboundShipmentListInput = {
  status?: Array<
    "pending" | "in_progress" | "completed" | "issue_open" | "closed" | "cancelled"
  >;
  supplierId?: number | null;
};

export type AssignInboundDemandsToShipmentInput = {
  inboundId: number;
  demandIds: number[];
};

export type ReceiveInboundShipmentInput = {
  inboundId: number;
  authorName?: string | null;
  receivedAt?: Date | null;
  items?: Array<{
    inboundShipmentItemId: number;
    qtyReceived?: number | null;
    qtyGood?: number | null;
    qtyIssue?: number | null;
    unitPrice?: number | null;
    issueType?:
      | "damaged"
      | "missing"
      | "wrong_item"
      | "over_received"
      | "quality_hold"
      | null;
    issueNotes?: string | null;
  }>;
};

export type ReceiveInboundShipmentResult = {
  inboundId: number;
  shipmentStatus:
    | "pending"
    | "in_progress"
    | "completed"
    | "issue_open"
    | "closed"
    | "cancelled";
  receivedItemCount: number;
  stockMovementCount: number;
  issueCount: number;
  skippedItemCount: number;
  newlyReceivedQty: number;
  alreadyReceivedQty: number;
  lineItemComponentIds: number[];
  inventoryVariantIds: number[];
};

export type InboundNeedsApplicationOperation = "apply" | "unapply";

export type InboundNeedsApplicationResult = {
  inboundId: number;
  operation: InboundNeedsApplicationOperation;
  changed: boolean;
  updatedDemandCount: number;
  recomputedComponentCount: number;
  affectedSalesOrderIds: number[];
  applicationEventId: number | null;
};

export type InboundNeedsApplicationState = {
  state: "not_received" | "not_applicable" | "not_applied" | "applied";
  canApply: boolean;
  canUnapply: boolean;
  linkedDemandCount: number;
  appliedDemandQty: number;
  openDemandQty: number;
  activeApplicationEventId: number | null;
};

type InboundNeedsApplicationSnapshot = {
  version: 1;
  inboundId: number;
  items: Array<{
    id: number;
    qtyGood: number;
    qtyIssue: number;
  }>;
  demands: Array<{
    id: number;
    lineItemComponentId: number;
    salesOrderId: number | null;
    orderId: string | null;
    beforeQtyReceived: number;
    beforeStatus: InboundDemandQueueStatus;
    afterQtyReceived: number;
    afterStatus: InboundDemandQueueStatus;
  }>;
};

const INBOUND_NEEDS_APPLIED_EVENT = "inventory_inbound_needs_applied";
const INBOUND_NEEDS_UNAPPLIED_EVENT = "inventory_inbound_needs_unapplied";
const INBOUND_NEEDS_APPLICATION_EVENT_TYPES = [
  INBOUND_NEEDS_APPLIED_EVENT,
  INBOUND_NEEDS_UNAPPLIED_EVENT,
] as const;

export type PlanInboundReceiptDeltaInput = {
  plannedQty?: number | null;
  previousGoodQty?: number | null;
  previousIssueQty?: number | null;
  qtyReceived?: number | null;
  qtyGood?: number | null;
  qtyIssue?: number | null;
};

export type PlannedInboundReceiptDelta = {
  targetGoodQty: number;
  targetIssueQty: number;
  targetReceivedQty: number;
  deltaGoodQty: number;
  deltaIssueQty: number;
  deltaReceivedQty: number;
  duplicate: boolean;
};

function positiveNumber(value?: number | null) {
  return Math.max(0, Number(value || 0));
}

function isOrderInboundStatus(
  status?: string | null,
): status is OrderInboundStatus {
  return (
    status === "AVAILABLE" ||
    status === "ORDERED" ||
    status === "PENDING ORDER"
  );
}

function isOpenDemandStatus(status?: string | null) {
  return ACTIVE_INBOUND_DEMAND_STATUSES.includes(
    status as (typeof ACTIVE_INBOUND_DEMAND_STATUSES)[number],
  );
}

function normalizeDemandIds(demandIds?: number[] | null) {
  if (!demandIds?.length) return [];

  return Array.from(
    new Set(
      demandIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

export function buildInboundStatusDemandReconciliation(
  orders: InboundStatusDemandReconciliationInputRow[],
): InboundStatusDemandReconciliationResult {
  const rows: InboundStatusDemandReconciliationRow[] = [];

  for (const order of orders) {
    if (!isOrderInboundStatus(order.inventoryStatus)) continue;

    const demandPreview: InboundStatusDemandReconciliationRow["demandPreview"] =
      [];
    let openDemandCount = 0;
    let openDemandQty = 0;
    let orderedDemandCount = 0;

    for (const lineItem of order.lineItems || []) {
      for (const component of lineItem.components || []) {
        for (const demand of component.inboundDemands || []) {
          if (!isOpenDemandStatus(demand.status)) continue;

          const qtyOpen = Math.max(
            0,
            positiveNumber(demand.qty) - positiveNumber(demand.qtyReceived),
          );
          if (qtyOpen <= 0) continue;

          openDemandCount += 1;
          openDemandQty += qtyOpen;
          if (demand.status === "ordered" || demand.inboundShipmentItemId) {
            orderedDemandCount += 1;
          }

          if (demandPreview.length < 3) {
            demandPreview.push({
              demandId: demand.id,
              lineItemId: lineItem.id,
              lineTitle: lineItem.title ?? null,
              inventoryName:
                component.inventoryVariant?.inventory?.name ?? null,
              sku:
                component.inventoryVariant?.sku ||
                component.inventoryVariant?.uid ||
                null,
              qtyOpen,
              status: demand.status ?? null,
            });
          }
        }
      }
    }

    const hasOpenDemand = openDemandCount > 0;
    const issue =
      (order.inventoryStatus === "PENDING ORDER" ||
        order.inventoryStatus === "ORDERED") &&
      !hasOpenDemand
        ? "order_status_without_inventory_demand"
        : order.inventoryStatus === "AVAILABLE" && hasOpenDemand
          ? "available_status_with_open_inventory_demand"
          : order.inventoryStatus === "PENDING ORDER" && orderedDemandCount > 0
            ? "pending_order_has_ordered_inventory_demand"
            : null;

    if (!issue) continue;

    rows.push({
      saleId: order.id,
      orderId: order.orderId ?? null,
      slug: order.slug ?? null,
      inventoryStatus: order.inventoryStatus,
      openDemandCount,
      openDemandQty,
      orderedDemandCount,
      issue,
      severity:
        issue === "available_status_with_open_inventory_demand"
          ? "critical"
          : "warning",
      demandPreview,
    });
  }

  return {
    summary: {
      reviewedOrderCount: orders.length,
      issueCount: rows.length,
      orderStatusWithoutDemandCount: rows.filter(
        (row) => row.issue === "order_status_without_inventory_demand",
      ).length,
      availableWithDemandCount: rows.filter(
        (row) => row.issue === "available_status_with_open_inventory_demand",
      ).length,
      pendingOrderWithOrderedDemandCount: rows.filter(
        (row) => row.issue === "pending_order_has_ordered_inventory_demand",
      ).length,
      openDemandQty: rows.reduce(
        (sum, row) => sum + Number(row.openDemandQty || 0),
        0,
      ),
    },
    rows,
  };
}

export async function applyOrderInboundStatusToInventoryDemand(
  db: DbLike,
  input: ApplyOrderInboundStatusToInventoryDemandInput,
): Promise<ApplyOrderInboundStatusToInventoryDemandResult> {
  const selectedDemandIds = normalizeDemandIds(input.demandIds);
  const selectedDemandScopeRequested = Boolean(input.demandIds?.length);
  if (selectedDemandScopeRequested && !selectedDemandIds.length) {
    return {
      saleId: input.saleId,
      status: input.status,
      updatedDemandCount: 0,
      skipped: true,
      reason: "selected_demand_ids_invalid",
    };
  }
  const selectedDemandFilter = selectedDemandIds.length
    ? {
        id: {
          in: selectedDemandIds,
        },
      }
    : {};

  if (input.status === "AVAILABLE") {
    if (selectedDemandIds.length) {
      const mutableDemandWhere = {
        deletedAt: null,
        status: {
          in: [...ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES],
        },
        ...selectedDemandFilter,
        qtyReceived: 0,
        inboundShipmentItemId: null,
        lineItemComponent: {
          parent: {
            saleId: input.saleId,
            deletedAt: null,
          },
        },
      };
      const candidateDemands = await db.inboundDemand.findMany({
        where: mutableDemandWhere,
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          lineItemComponentId: true,
        },
      });

      let updatedDemandCount = 0;
      const componentIds = new Set<number>();
      for (const demand of candidateDemands) {
        const result = await db.inboundDemand.updateMany({
          where: {
            ...mutableDemandWhere,
            id: demand.id,
          },
          data: {
            status: "cancelled",
            notes: "Order inbound prompt: AVAILABLE",
          },
        });
        if (result.count > 0) {
          updatedDemandCount += result.count;
          componentIds.add(demand.lineItemComponentId);
        }
      }

      let recomputedComponentCount = 0;
      for (const componentId of componentIds.values()) {
        const recomputed = await recomputeLineItemComponentDemandState(
          db,
          componentId,
        );
        if (recomputed) recomputedComponentCount += 1;
      }

      return {
        saleId: input.saleId,
        status: input.status,
        updatedDemandCount,
        recomputedComponentCount,
        skipped: false,
      };
    }

    return {
      saleId: input.saleId,
      status: input.status,
      updatedDemandCount: 0,
      skipped: true,
      reason: "available_status_does_not_mutate_shortage_demand",
    };
  }

  const demandStatus = input.status === "ORDERED" ? "ordered" : "pending";
  const result = await db.inboundDemand.updateMany({
    where: {
      deletedAt: null,
      status: {
        in: [...ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES],
      },
      ...selectedDemandFilter,
      qtyReceived: 0,
      inboundShipmentItemId: null,
      lineItemComponent: {
        parent: {
          saleId: input.saleId,
          deletedAt: null,
        },
      },
    },
    data: {
      status: demandStatus,
      notes: `Order inbound prompt: ${input.status}`,
    },
  });

  return {
    saleId: input.saleId,
    status: input.status,
    updatedDemandCount: result.count,
    skipped: false,
  };
}

function getPreferredSupplierVariant(
  demand: SupplierReorderSuggestionDemandLike,
) {
  const variants = demand.inventoryVariant?.supplierVariants || [];
  return (
    variants.find((variant) => variant.active !== false && variant.preferred) ||
    variants.find((variant) => variant.active !== false) ||
    variants[0] ||
    null
  );
}

function getSuggestionSupplier(demand: SupplierReorderSuggestionDemandLike) {
  const inboundSupplier = demand.inboundShipmentItem?.inbound?.supplier;
  if (inboundSupplier?.id) {
    return {
      id: inboundSupplier.id,
      name: inboundSupplier.name || "Assigned supplier",
    };
  }

  const supplierVariant = getPreferredSupplierVariant(demand);
  if (supplierVariant?.supplierId || supplierVariant?.supplier?.id) {
    return {
      id: supplierVariant.supplierId ?? supplierVariant.supplier?.id ?? null,
      name: supplierVariant.supplier?.name || "Preferred supplier",
    };
  }

  const defaultSupplier = demand.inventoryVariant?.inventory?.defaultSupplier;
  if (defaultSupplier?.id) {
    return {
      id: defaultSupplier.id,
      name: defaultSupplier.name || "Default supplier",
    };
  }

  return {
    id: null,
    name: "Unassigned supplier",
  };
}

export function buildSupplierReorderSuggestions(
  demands: SupplierReorderSuggestionDemandLike[],
): SupplierReorderSuggestionsResult {
  const groups = new Map<
    string,
    SupplierReorderSuggestion & {
      _minOrderQtyCandidates: number[];
      _leadTimeDaysCandidates: number[];
    }
  >();

  for (const demand of demands) {
    const openDemandQty = Math.max(
      0,
      positiveNumber(demand.qty) - positiveNumber(demand.qtyReceived),
    );
    if (openDemandQty <= 0) continue;

    const supplier = getSuggestionSupplier(demand);
    const supplierVariant = getPreferredSupplierVariant(demand);
    const key = `${supplier.id ?? "unassigned"}:${demand.inventoryVariantId}`;
    const current =
      groups.get(key) ||
      ({
        supplierId: supplier.id,
        supplierName: supplier.name,
        inventoryVariantId: demand.inventoryVariantId,
        inventoryName: demand.inventoryVariant?.inventory?.name ?? null,
        sku:
          demand.inventoryVariant?.sku ||
          demand.inventoryVariant?.uid ||
          null,
        supplierSku: supplierVariant?.supplierSku ?? null,
        openDemandQty: 0,
        suggestedOrderQty: 0,
        minOrderQty: null,
        leadTimeDays: null,
        demandCount: 0,
        demandIds: [],
        _minOrderQtyCandidates: [],
        _leadTimeDaysCandidates: [],
      } satisfies SupplierReorderSuggestion & {
        _minOrderQtyCandidates: number[];
        _leadTimeDaysCandidates: number[];
      });

    current.openDemandQty += openDemandQty;
    current.demandCount += 1;
    if (demand.id != null) current.demandIds.push(demand.id);
    if (supplierVariant?.minOrderQty) {
      current._minOrderQtyCandidates.push(Number(supplierVariant.minOrderQty));
    }
    if (supplierVariant?.leadTimeDays) {
      current._leadTimeDaysCandidates.push(Number(supplierVariant.leadTimeDays));
    }
    groups.set(key, current);
  }

  const suggestions = Array.from(groups.values()).map((group) => {
    const minOrderQty = group._minOrderQtyCandidates.length
      ? Math.max(...group._minOrderQtyCandidates)
      : null;
    const leadTimeDays = group._leadTimeDaysCandidates.length
      ? Math.max(...group._leadTimeDaysCandidates)
      : null;
    const suggestedOrderQty = Math.max(group.openDemandQty, minOrderQty || 0);

    return {
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      inventoryVariantId: group.inventoryVariantId,
      inventoryName: group.inventoryName,
      sku: group.sku,
      supplierSku: group.supplierSku,
      openDemandQty: group.openDemandQty,
      suggestedOrderQty,
      minOrderQty,
      leadTimeDays,
      demandCount: group.demandCount,
      demandIds: group.demandIds,
    };
  });

  suggestions.sort((a, b) => {
    if (a.supplierName !== b.supplierName) {
      return a.supplierName.localeCompare(b.supplierName);
    }
    return (a.inventoryName || a.sku || "").localeCompare(
      b.inventoryName || b.sku || "",
    );
  });

  return {
    summary: {
      suggestionCount: suggestions.length,
      supplierCount: new Set(suggestions.map((row) => row.supplierId)).size,
      openDemandQty: suggestions.reduce(
        (total, row) => total + row.openDemandQty,
        0,
      ),
      suggestedOrderQty: suggestions.reduce(
        (total, row) => total + row.suggestedOrderQty,
        0,
      ),
    },
    suggestions,
  };
}

export async function getSupplierReorderSuggestions(
  db: DbLike,
): Promise<SupplierReorderSuggestionsResult> {
  const demands = await db.inboundDemand.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      qty: true,
      qtyReceived: true,
      inventoryVariantId: true,
      inventoryVariant: {
        select: {
          id: true,
          sku: true,
          uid: true,
          inventory: {
            select: {
              id: true,
              name: true,
              defaultSupplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplierVariants: {
            where: {
              active: true,
            },
            select: {
              supplierId: true,
              supplierSku: true,
              minOrderQty: true,
              leadTimeDays: true,
              preferred: true,
              active: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [
              {
                preferred: "desc",
              },
              {
                id: "asc",
              },
            ],
          },
        },
      },
      inboundShipmentItem: {
        select: {
          inbound: {
            select: {
              supplierId: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return buildSupplierReorderSuggestions(demands);
}

export async function getInboundDemandQueue(
  db: DbLike,
  input: InboundDemandQueueInput = {},
) {
  const statuses: InboundDemandQueueStatus[] = input.status?.length
    ? input.status
    : [...ACTIVE_INBOUND_DEMAND_STATUSES];

  return db.inboundDemand.findMany({
    where: {
      deletedAt: null,
      status: {
        in: statuses,
      },
      lineItemComponent: {
        is: {
          ...(input.saleId
            ? {
                parent: {
                  saleId: input.saleId,
                  deletedAt: null,
                },
              }
            : {}),
        },
      },
      ...(input.supplierId
        ? {
            inboundShipmentItem: {
              inbound: {
                supplierId: input.supplierId,
                deletedAt: null,
              },
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      qty: true,
      qtyReceived: true,
      status: true,
      inboundShipmentItemId: true,
      createdAt: true,
      inventoryVariantId: true,
      inventoryVariant: {
        select: {
          id: true,
          sku: true,
          uid: true,
          inventoryId: true,
          inventory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      lineItemComponentId: true,
      lineItemComponent: {
        select: {
          id: true,
          qty: true,
          qtyAllocated: true,
          qtyInbound: true,
          qtyReceived: true,
          status: true,
          parent: {
            select: {
              id: true,
              title: true,
              saleId: true,
              sale: {
                select: {
                  id: true,
                  orderId: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      inboundShipmentItem: {
        select: {
          id: true,
          inboundId: true,
          inbound: {
            select: {
              id: true,
              supplierId: true,
              reference: true,
              expectedAt: true,
              receivedAt: true,
              status: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getInboundStatusDemandReconciliation(
  db: DbLike,
  input: InboundStatusDemandReconciliationInput = {},
) {
  const take = Math.min(Math.max(Number(input.take || 50), 1), 200);
  const orders = await db.salesOrders.findMany({
    where: {
      type: "order",
      deletedAt: null,
      inventoryStatus: {
        in: ["AVAILABLE", "ORDERED", "PENDING ORDER"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take,
    select: {
      id: true,
      orderId: true,
      slug: true,
      inventoryStatus: true,
      lineItems: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          components: {
            select: {
              id: true,
              qtyInbound: true,
              status: true,
              inventoryVariant: {
                select: {
                  id: true,
                  sku: true,
                  uid: true,
                  inventory: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              inboundDemands: {
                where: {
                  deletedAt: null,
                  status: {
                    in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
                  },
                },
                select: {
                  id: true,
                  qty: true,
                  qtyReceived: true,
                  status: true,
                  inboundShipmentItemId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return buildInboundStatusDemandReconciliation(orders);
}

export async function listInboundShipments(
  db: DbLike,
  input: InboundShipmentListInput = {},
) {
  return db.inboundShipment.findMany({
    where: {
      deletedAt: null,
      ...(input.status?.length
        ? {
            status: {
              in: input.status,
            },
          }
        : {}),
      ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      supplierId: true,
      status: true,
      expectedAt: true,
      receivedAt: true,
      reference: true,
      progress: true,
      createdAt: true,
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
      extractions: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

export async function createInboundShipment(
  db: DbLike,
  input: CreateInboundShipmentInput,
) {
  return db.inboundShipment.create({
    data: {
      supplierId: input.supplierId ?? null,
      reference: input.reference ?? null,
      expectedAt: input.expectedAt ?? null,
      status: input.status ?? "pending",
      progress: 0,
    },
    select: {
      id: true,
      supplierId: true,
      status: true,
      reference: true,
      expectedAt: true,
    },
  });
}

function outstandingInboundDemandQty(demand: {
  qty?: number | null;
  qtyReceived?: number | null;
}) {
  return Math.max(
    0,
    Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
  );
}

export async function assignInboundDemandsToShipment(
  db: DbLike,
  input: AssignInboundDemandsToShipmentInput,
): Promise<AssignInboundDemandsToShipmentResult> {
  const demandIds = Array.from(new Set(input.demandIds.filter(Boolean)));
  if (!demandIds.length) {
    throw new Error("At least one inbound demand is required.");
  }

  const shipment = await db.inboundShipment.findUniqueOrThrow({
    where: {
      id: input.inboundId,
    },
    select: {
      id: true,
      status: true,
      deletedAt: true,
    },
  });
  if (
    shipment.deletedAt ||
    shipment.status === "closed" ||
    shipment.status === "cancelled"
  ) {
    const reason = shipment.deletedAt ? "deleted" : `${shipment.status} status`;
    throw new Error(
      `Inbound shipment #${shipment.id} is not assignable in ${reason}.`,
    );
  }

  const demands = await db.inboundDemand.findMany({
    where: {
      id: {
        in: demandIds,
      },
      deletedAt: null,
      status: {
        in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
      },
    },
    select: {
      id: true,
      qty: true,
      qtyReceived: true,
      inboundShipmentItemId: true,
      inventoryVariantId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!demands.length) {
    throw new Error("No eligible inbound demand rows were found.");
  }

  const unlinkedDemands = demands.filter(
    (demand) => !demand.inboundShipmentItemId,
  );
  if (!unlinkedDemands.length) {
    throw new Error("No unassigned inbound demand rows were found.");
  }

  const existingItems = await db.inboundShipmentItem.findMany({
    where: {
      inboundId: shipment.id,
      deletedAt: null,
    },
    select: {
      id: true,
      inventoryVariantId: true,
      qty: true,
    },
  });

  const existingItemsByVariant = new Map(
    existingItems.map((item) => [item.inventoryVariantId, item]),
  );

  let linkedDemandCount = 0;
  const linkedDemandIds: number[] = [];

  const groupedByVariant = new Map<number, typeof unlinkedDemands>();
  for (const demand of unlinkedDemands) {
    const rows = groupedByVariant.get(demand.inventoryVariantId) || [];
    rows.push(demand);
    groupedByVariant.set(demand.inventoryVariantId, rows);
  }

  for (const [inventoryVariantId, variantDemands] of groupedByVariant.entries()) {
    const plannedQty = variantDemands.reduce((sum, demand) => {
      const outstanding = outstandingInboundDemandQty(demand);
      return sum + outstanding;
    }, 0);

    if (plannedQty <= 0) continue;

    const existingItem = existingItemsByVariant.get(inventoryVariantId);
    const inboundItem = existingItem
      ? { id: existingItem.id }
      : await db.inboundShipmentItem.create({
          data: {
            inboundId: shipment.id,
            inventoryVariantId,
            qty: 0,
          },
          select: {
            id: true,
          },
        });

    let confirmedLinkedQty = 0;
    for (const demand of variantDemands) {
      const linked = await db.inboundDemand.updateMany({
        where: {
          id: demand.id,
          deletedAt: null,
          status: {
            in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
          },
          qtyReceived: demand.qtyReceived,
          inboundShipmentItemId: null,
        },
        data: {
          inboundShipmentItemId: inboundItem.id,
          status: "ordered",
        },
      });
      if (linked.count > 0) {
        linkedDemandCount += 1;
        linkedDemandIds.push(demand.id);
        confirmedLinkedQty += outstandingInboundDemandQty(demand);
      }
    }

    if (confirmedLinkedQty > 0) {
      const committedItemQty = await db.inboundShipmentItem.updateMany({
        where: {
          id: inboundItem.id,
          inboundId: shipment.id,
          deletedAt: null,
          inbound: {
            deletedAt: null,
            status: {
              notIn: ["closed", "cancelled"],
            },
          },
        },
        data: {
          qty: existingItem
            ? {
                increment: confirmedLinkedQty,
              }
            : confirmedLinkedQty,
        },
      });
      if (committedItemQty.count <= 0) {
        throw new Error(
          `Inbound shipment #${shipment.id} changed before demand assignment could be committed.`,
        );
      }
    } else if (!existingItem) {
      const cleanedEmptyItem = await db.inboundShipmentItem.updateMany({
        where: {
          id: inboundItem.id,
          inboundId: shipment.id,
          deletedAt: null,
          inbound: {
            deletedAt: null,
            status: {
              notIn: ["closed", "cancelled"],
            },
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
      if (cleanedEmptyItem.count <= 0) {
        throw new Error(
          `Inbound shipment #${shipment.id} changed before empty item cleanup could be committed.`,
        );
      }
    }
  }

  if (!linkedDemandCount) {
    throw new Error("No unassigned inbound demand rows were linked.");
  }

  return {
    inboundId: shipment.id,
    linkedDemandCount,
    linkedDemandIds,
  };
}

export async function getInboundShipmentDetail(
  db: DbLike,
  input: InboundShipmentDetailInput,
) {
  const shipmentPromise = db.inboundShipment.findUniqueOrThrow({
    where: {
      id: input.inboundId,
    },
    select: {
      id: true,
      supplierId: true,
      status: true,
      expectedAt: true,
      receivedAt: true,
      reference: true,
      totalValue: true,
      progress: true,
      createdAt: true,
      supplier: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          qtyGood: true,
          qtyIssue: true,
          inventoryVariantId: true,
          inventoryVariant: {
            select: {
              id: true,
              sku: true,
              uid: true,
              inventoryId: true,
              inventory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          issues: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              issueType: true,
              status: true,
              resolutionType: true,
              reportedQty: true,
              resolvedQty: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          inboundDemands: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              qty: true,
              qtyReceived: true,
              status: true,
              lineItemComponentId: true,
              lineItemComponent: {
                select: {
                  id: true,
                  qty: true,
                  qtyAllocated: true,
                  qtyInbound: true,
                  qtyReceived: true,
                  status: true,
                  parent: {
                    select: {
                      id: true,
                      title: true,
                      saleId: true,
                      sale: {
                        select: {
                          id: true,
                          orderId: true,
                          slug: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const latestApplicationEventPromise = findLatestInboundNeedsApplicationEvent(
    db,
    input.inboundId,
  );
  const [shipment, latestApplicationEvent] = await Promise.all([
    shipmentPromise,
    latestApplicationEventPromise,
  ]);

  return {
    ...shipment,
    needsApplication: projectInboundNeedsApplicationState(
      shipment,
      latestApplicationEvent,
    ),
  };
}

type DemandState = {
  qtyAllocated: number;
  qtyInbound: number;
  qtyReceived: number;
  status:
    | "pending"
    | "allocated"
    | "partially_allocated"
    | "inbound_required"
    | "partially_received"
    | "fulfilled"
    | "cancelled";
};

function asPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export function planInboundReceiptDelta(
  input: PlanInboundReceiptDeltaInput,
): PlannedInboundReceiptDelta {
  const plannedQty = positiveNumber(input.plannedQty);
  const previousGoodQty = positiveNumber(input.previousGoodQty);
  const previousIssueQty = positiveNumber(input.previousIssueQty);
  const previousReceivedQty = previousGoodQty + previousIssueQty;
  const maxTargetReceivedQty = Math.max(plannedQty, previousReceivedQty);
  const targetIssueCandidate =
    input.qtyIssue == null ? previousIssueQty : positiveNumber(input.qtyIssue);
  const targetIssueQty = Math.min(
    Math.max(previousIssueQty, targetIssueCandidate),
    Math.max(previousIssueQty, maxTargetReceivedQty - previousGoodQty),
  );
  const targetGoodCandidate =
    input.qtyGood == null
      ? Math.max(
          0,
          (input.qtyReceived == null
            ? plannedQty
            : positiveNumber(input.qtyReceived)) - targetIssueCandidate,
        )
      : positiveNumber(input.qtyGood);
  const targetGoodQty = Math.min(
    Math.max(previousGoodQty, targetGoodCandidate),
    Math.max(previousGoodQty, maxTargetReceivedQty - targetIssueQty),
  );
  const deltaGoodQty = Math.max(0, targetGoodQty - previousGoodQty);
  const deltaIssueQty = Math.max(0, targetIssueQty - previousIssueQty);
  const deltaReceivedQty = deltaGoodQty + deltaIssueQty;

  return {
    targetGoodQty,
    targetIssueQty,
    targetReceivedQty: targetGoodQty + targetIssueQty,
    deltaGoodQty,
    deltaIssueQty,
    deltaReceivedQty,
    duplicate:
      targetGoodQty + targetIssueQty > 0 &&
      deltaGoodQty <= 0 &&
      deltaIssueQty <= 0,
  };
}

function computeLineItemComponentDemandState(input: {
  qtyRequired: number;
  qtyAllocated: number;
  qtyInbound: number;
  qtyReceived: number;
}): DemandState {
  const qtyRequired = Math.max(0, input.qtyRequired);
  const qtyAllocated = Math.max(0, input.qtyAllocated);
  const qtyInbound = Math.max(0, input.qtyInbound);
  const qtyReceived = Math.max(0, input.qtyReceived);

  let status: DemandState["status"] = "pending";
  if (qtyRequired <= 0) {
    status = "cancelled";
  } else if (qtyReceived >= qtyInbound && qtyInbound > 0) {
    status =
      qtyAllocated + qtyReceived >= qtyRequired ? "fulfilled" : "partially_received";
  } else if (qtyReceived > 0) {
    status = "partially_received";
  } else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
    status = "allocated";
  } else if (qtyAllocated > 0 && qtyInbound > 0) {
    status = "partially_allocated";
  } else if (qtyInbound > 0) {
    status = "inbound_required";
  }

  return {
    qtyAllocated,
    qtyInbound,
    qtyReceived,
    status,
  };
}

async function recomputeLineItemComponentDemandState(
  db: DbLike,
  lineItemComponentId: number,
) {
  const component = await db.lineItemComponents.findFirst({
    where: {
      id: lineItemComponentId,
      deletedAt: null,
    },
    select: {
      id: true,
      qty: true,
      stockAllocations: {
        where: {
          deletedAt: null,
          status: {
            in: ["approved", "reserved", "picked", "consumed"],
          },
        },
        select: {
          qty: true,
        },
      },
      inboundDemands: {
        where: {
          deletedAt: null,
          status: {
            not: "cancelled",
          },
        },
        select: {
          qty: true,
          qtyReceived: true,
        },
      },
    },
  });

  if (!component) return null;

  const qtyAllocated = component.stockAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.qty || 0),
    0,
  );
  const qtyInbound = component.inboundDemands.reduce(
    (sum, demand) => sum + Number(demand.qty || 0),
    0,
  );
  const qtyReceived = component.inboundDemands.reduce(
    (sum, demand) => sum + Number(demand.qtyReceived || 0),
    0,
  );

  const nextState = computeLineItemComponentDemandState({
    qtyRequired: Number(component.qty || 0),
    qtyAllocated,
    qtyInbound,
    qtyReceived,
  });

  const updatedComponent = await db.lineItemComponents.updateMany({
    where: {
      id: component.id,
      deletedAt: null,
    },
    data: nextState,
  });
  if (updatedComponent.count <= 0) return null;

  return nextState;
}

type InboundNeedsApplicationShipment = {
  id: number;
  status: string;
  items: Array<{
    id: number;
    qty?: number | null;
    qtyGood?: number | null;
    qtyIssue?: number | null;
    inboundDemands: Array<{
      id: number;
      qty?: number | null;
      qtyReceived?: number | null;
      status: string;
      lineItemComponentId: number;
      lineItemComponent?: {
        parent?: {
          sale?: {
            id: number;
            orderId: string;
          } | null;
        } | null;
      } | null;
    }>;
  }>;
};

type InboundNeedsApplicationEvent = {
  id: number;
  type: string;
  data: unknown;
};

const inboundNeedsApplicationShipmentSelect = {
  id: true,
  status: true,
  items: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      qty: true,
      qtyGood: true,
      qtyIssue: true,
      inboundDemands: {
        where: {
          deletedAt: null,
          status: { not: "cancelled" as const },
          lineItemComponent: {
            parent: {
              deletedAt: null,
              sale: { deletedAt: null },
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          qty: true,
          qtyReceived: true,
          status: true,
          lineItemComponentId: true,
          lineItemComponent: {
            select: {
              parent: {
                select: {
                  sale: {
                    select: {
                      id: true,
                      orderId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

async function findLatestInboundNeedsApplicationEvent(
  db: DbLike,
  inboundId: number,
): Promise<InboundNeedsApplicationEvent | null> {
  return db.event.findFirst({
    where: {
      type: { in: [...INBOUND_NEEDS_APPLICATION_EVENT_TYPES] },
      deletedAt: null,
      data: {
        path: "$.inboundId",
        equals: inboundId,
      },
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      type: true,
      data: true,
    },
  }) as Promise<InboundNeedsApplicationEvent | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInboundNeedsApplicationSnapshot(
  event: InboundNeedsApplicationEvent | null,
): InboundNeedsApplicationSnapshot | null {
  if (!event || event.type !== INBOUND_NEEDS_APPLIED_EVENT) return null;
  if (!isRecord(event.data)) return null;
  const data = event.data;
  if (data.version !== 1 || !isPositiveInteger(data.inboundId)) {
    return null;
  }
  if (
    !Array.isArray(data.items) ||
    data.items.length === 0 ||
    !data.items.every(isInboundNeedsApplicationSnapshotItem) ||
    !hasUniqueSnapshotIds(data.items) ||
    !Array.isArray(data.demands) ||
    data.demands.length === 0 ||
    !data.demands.every(isInboundNeedsApplicationSnapshotDemand) ||
    !hasUniqueSnapshotIds(data.demands)
  ) {
    return null;
  }

  return {
    version: 1,
    inboundId: data.inboundId,
    items: data.items,
    demands: data.demands,
  };
}

function hasUniqueSnapshotIds(values: Array<{ id: number }>) {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isInboundDemandQueueStatus(
  value: unknown,
): value is InboundDemandQueueStatus {
  return (
    value === "pending" ||
    value === "ordered" ||
    value === "partially_received" ||
    value === "received" ||
    value === "cancelled"
  );
}

function isInboundNeedsApplicationSnapshotItem(
  value: unknown,
): value is InboundNeedsApplicationSnapshot["items"][number] {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    isNonNegativeFiniteNumber(value.qtyGood) &&
    isNonNegativeFiniteNumber(value.qtyIssue)
  );
}

function isInboundNeedsApplicationSnapshotDemand(
  value: unknown,
): value is InboundNeedsApplicationSnapshot["demands"][number] {
  return (
    isRecord(value) &&
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.lineItemComponentId) &&
    (value.salesOrderId === null || isPositiveInteger(value.salesOrderId)) &&
    (value.orderId === null || typeof value.orderId === "string") &&
    isNonNegativeFiniteNumber(value.beforeQtyReceived) &&
    isInboundDemandQueueStatus(value.beforeStatus) &&
    isNonNegativeFiniteNumber(value.afterQtyReceived) &&
    isInboundDemandQueueStatus(value.afterStatus)
  );
}

function summarizeInboundNeedsApplicationItem(
  item: InboundNeedsApplicationShipment["items"][number],
) {
  const linkedDemandQty = item.inboundDemands.reduce(
    (sum, demand) => sum + positiveNumber(demand.qty),
    0,
  );
  const appliedDemandQty = item.inboundDemands.reduce(
    (sum, demand) =>
      sum + Math.min(positiveNumber(demand.qty), positiveNumber(demand.qtyReceived)),
    0,
  );
  const applicationCapacityQty = Math.min(
    positiveNumber(item.qty),
    linkedDemandQty,
  );

  return {
    applicationCapacityQty,
    openApplicationQty: Math.max(0, applicationCapacityQty - appliedDemandQty),
  };
}

function demandStatusForReceivedQty(
  qtyReceived: number,
  demandQty: number,
): InboundDemandQueueStatus {
  if (qtyReceived <= 0) return "ordered";
  return qtyReceived >= demandQty ? "received" : "partially_received";
}

function buildExistingInboundNeedsApplicationSnapshot(
  shipment: InboundNeedsApplicationShipment,
): InboundNeedsApplicationSnapshot | null {
  const demands: InboundNeedsApplicationSnapshot["demands"] = [];

  for (const item of shipment.items) {
    let remainingAppliedQty = summarizeInboundNeedsApplicationItem(
      item,
    ).applicationCapacityQty;
    for (const demand of item.inboundDemands) {
      if (remainingAppliedQty <= 0) break;
      const afterQtyReceived = positiveNumber(demand.qtyReceived);
      const demandQty = positiveNumber(demand.qty);
      const appliedQty = Math.min(
        afterQtyReceived,
        demandQty,
        remainingAppliedQty,
      );
      if (appliedQty <= 0) continue;
      const beforeQtyReceived = afterQtyReceived - appliedQty;
      const sale = demand.lineItemComponent?.parent?.sale ?? null;
      demands.push({
        id: demand.id,
        lineItemComponentId: demand.lineItemComponentId,
        salesOrderId: sale?.id ?? null,
        orderId: sale?.orderId ?? null,
        beforeQtyReceived,
        beforeStatus: demandStatusForReceivedQty(beforeQtyReceived, demandQty),
        afterQtyReceived,
        afterStatus: demand.status as InboundDemandQueueStatus,
      });
      remainingAppliedQty -= appliedQty;
    }
    if (remainingAppliedQty > 0) return null;
  }

  if (!demands.length) return null;
  return {
    version: 1,
    inboundId: shipment.id,
    items: shipment.items.map((item) => ({
      id: item.id,
      qtyGood: positiveNumber(item.qtyGood),
      qtyIssue: positiveNumber(item.qtyIssue),
    })),
    demands,
  };
}

function inboundNeedsApplicationSnapshotIsReversible(
  shipment: InboundNeedsApplicationShipment,
  snapshot: InboundNeedsApplicationSnapshot,
) {
  if (shipment.id !== snapshot.inboundId) return false;
  if (shipment.items.length !== snapshot.items.length) return false;
  const itemsById = new Map(shipment.items.map((item) => [item.id, item]));
  for (const baseline of snapshot.items) {
    const item = itemsById.get(baseline.id);
    if (!item) return false;
    if (
      positiveNumber(item.qtyGood) !== baseline.qtyGood ||
      positiveNumber(item.qtyIssue) !== baseline.qtyIssue
    ) {
      return false;
    }
  }

  const demandsById = new Map(
    shipment.items.flatMap((item) => item.inboundDemands).map((demand) => [demand.id, demand]),
  );
  return snapshot.demands.every((baseline) => {
    const demand = demandsById.get(baseline.id);
    return (
      demand != null &&
      Number(demand.qtyReceived || 0) === baseline.afterQtyReceived &&
      demand.status === baseline.afterStatus
    );
  });
}

function inboundNeedsApplicationSnapshotMatchesShipment(
  shipment: InboundNeedsApplicationShipment,
  snapshot: InboundNeedsApplicationSnapshot | null,
): snapshot is InboundNeedsApplicationSnapshot {
  if (!snapshot || shipment.id !== snapshot.inboundId) return false;
  if (shipment.items.length !== snapshot.items.length) return false;
  const shipmentItemIds = new Set(shipment.items.map((item) => item.id));
  return snapshot.items.every((item) => shipmentItemIds.has(item.id));
}

function projectInboundNeedsApplicationState(
  shipment: InboundNeedsApplicationShipment,
  latestEvent: InboundNeedsApplicationEvent | null,
): InboundNeedsApplicationState {
  const demands = shipment.items.flatMap((item) => item.inboundDemands);
  const linkedDemandCount = demands.length;
  const appliedDemandQty = demands.reduce(
    (sum, demand) =>
      sum + Math.min(positiveNumber(demand.qty), positiveNumber(demand.qtyReceived)),
    0,
  );
  const openDemandQty = demands.reduce(
    (sum, demand) =>
      sum + Math.max(0, positiveNumber(demand.qty) - positiveNumber(demand.qtyReceived)),
    0,
  );
  const applicationSummary = shipment.items.reduce(
    (summary, item) => {
      const itemSummary = summarizeInboundNeedsApplicationItem(item);
      summary.capacityQty += itemSummary.applicationCapacityQty;
      summary.openQty += itemSummary.openApplicationQty;
      return summary;
    },
    { capacityQty: 0, openQty: 0 },
  );
  const parsedSnapshot = parseInboundNeedsApplicationSnapshot(latestEvent);
  const activeSnapshot = inboundNeedsApplicationSnapshotMatchesShipment(
    shipment,
    parsedSnapshot,
  )
    ? parsedSnapshot
    : null;
  const hasFullyAppliedInbound =
    applicationSummary.capacityQty > 0 && applicationSummary.openQty <= 0;
  const canUnapply = activeSnapshot
    ? inboundNeedsApplicationSnapshotIsReversible(shipment, activeSnapshot)
    : shipment.status === "completed" && hasFullyAppliedInbound;

  const state: InboundNeedsApplicationState["state"] =
    linkedDemandCount === 0 || applicationSummary.capacityQty <= 0
      ? "not_applicable"
      : activeSnapshot || hasFullyAppliedInbound
        ? "applied"
        : shipment.status === "completed"
          ? "not_applied"
          : "not_received";

  return {
    state,
    canApply:
      shipment.status === "completed" &&
      linkedDemandCount > 0 &&
      activeSnapshot == null &&
      applicationSummary.openQty > 0,
    canUnapply,
    linkedDemandCount,
    appliedDemandQty,
    openDemandQty,
    activeApplicationEventId: activeSnapshot ? latestEvent?.id ?? null : null,
  };
}

export async function applyInboundShipmentToNeeds(
  db: DbLike,
  input: {
    inboundId: number;
    actorUserId?: number | null;
  },
): Promise<InboundNeedsApplicationResult> {
  const [latestEvent, shipment] = await Promise.all([
    findLatestInboundNeedsApplicationEvent(db, input.inboundId),
    db.inboundShipment.findFirstOrThrow({
      where: { id: input.inboundId, deletedAt: null },
      select: inboundNeedsApplicationShipmentSelect,
    }) as Promise<InboundNeedsApplicationShipment>,
  ]);
  const parsedSnapshot = parseInboundNeedsApplicationSnapshot(latestEvent);
  const activeSnapshot = inboundNeedsApplicationSnapshotMatchesShipment(
    shipment,
    parsedSnapshot,
  )
    ? parsedSnapshot
    : null;
  if (activeSnapshot) {
    return {
      inboundId: input.inboundId,
      operation: "apply",
      changed: false,
      updatedDemandCount: 0,
      recomputedComponentCount: 0,
      affectedSalesOrderIds: Array.from(
        new Set(
          activeSnapshot.demands
            .map((demand) => demand.salesOrderId)
            .filter((id): id is number => Number.isInteger(id)),
        ),
      ),
      applicationEventId: latestEvent?.id ?? null,
    };
  }

  if (shipment.status !== "completed") {
    throw new Error(
      `Inbound shipment #${shipment.id} must be marked Received before it can be applied to material needs.`,
    );
  }

  const snapshot: InboundNeedsApplicationSnapshot = {
    version: 1,
    inboundId: shipment.id,
    items: shipment.items.map((item) => ({
      id: item.id,
      qtyGood: positiveNumber(item.qtyGood),
      qtyIssue: positiveNumber(item.qtyIssue),
    })),
    demands: [],
  };
  const touchedComponentIds = new Set<number>();
  const affectedSalesOrderIds = new Set<number>();

  for (const item of shipment.items) {
    const alreadyAppliedQty = item.inboundDemands.reduce(
      (sum, demand) =>
        sum + Math.min(positiveNumber(demand.qty), positiveNumber(demand.qtyReceived)),
      0,
    );
    let remainingQty = Math.max(0, positiveNumber(item.qty) - alreadyAppliedQty);
    for (const demand of item.inboundDemands) {
      if (remainingQty <= 0) break;
      const beforeQtyReceived = positiveNumber(demand.qtyReceived);
      const demandQty = positiveNumber(demand.qty);
      const outstandingQty = Math.max(0, demandQty - beforeQtyReceived);
      if (outstandingQty <= 0) continue;
      const appliedQty = Math.min(outstandingQty, remainingQty);
      const afterQtyReceived = beforeQtyReceived + appliedQty;
      const afterStatus: InboundDemandQueueStatus =
        afterQtyReceived >= demandQty ? "received" : "partially_received";
      const committed = await db.inboundDemand.updateMany({
        where: {
          id: demand.id,
          deletedAt: null,
          qtyReceived: demand.qtyReceived,
          status: demand.status as InboundDemandQueueStatus,
          lineItemComponent: {
            parent: {
              deletedAt: null,
              sale: { deletedAt: null },
            },
          },
          inboundShipmentItem: {
            inboundId: shipment.id,
            deletedAt: null,
            inbound: { deletedAt: null, status: "completed" },
          },
        },
        data: {
          qtyReceived: afterQtyReceived,
          status: afterStatus,
        },
      });
      if (committed.count <= 0) {
        throw new Error(
          `Inbound demand #${demand.id} changed before it could be applied to material needs.`,
        );
      }

      const sale = demand.lineItemComponent?.parent?.sale ?? null;
      snapshot.demands.push({
        id: demand.id,
        lineItemComponentId: demand.lineItemComponentId,
        salesOrderId: sale?.id ?? null,
        orderId: sale?.orderId ?? null,
        beforeQtyReceived,
        beforeStatus: demand.status as InboundDemandQueueStatus,
        afterQtyReceived,
        afterStatus,
      });
      touchedComponentIds.add(demand.lineItemComponentId);
      if (sale?.id) affectedSalesOrderIds.add(sale.id);
      remainingQty -= appliedQty;
    }
  }

  let recomputedComponentCount = 0;
  for (const componentId of touchedComponentIds) {
    const recomputed = await recomputeLineItemComponentDemandState(db, componentId);
    if (recomputed) recomputedComponentCount += 1;
  }

  if (!snapshot.demands.length) {
    return {
      inboundId: shipment.id,
      operation: "apply",
      changed: false,
      updatedDemandCount: 0,
      recomputedComponentCount,
      affectedSalesOrderIds: Array.from(affectedSalesOrderIds),
      applicationEventId: null,
    };
  }

  const applicationEvent = await db.event.create({
    data: {
      type: INBOUND_NEEDS_APPLIED_EVENT,
      data: snapshot as never,
      userId: input.actorUserId ?? null,
    },
    select: { id: true },
  });

  return {
    inboundId: shipment.id,
    operation: "apply",
    changed: true,
    updatedDemandCount: snapshot.demands.length,
    recomputedComponentCount,
    affectedSalesOrderIds: Array.from(affectedSalesOrderIds),
    applicationEventId: applicationEvent.id,
  };
}

export async function unapplyInboundShipmentFromNeeds(
  db: DbLike,
  input: {
    inboundId: number;
    actorUserId?: number | null;
  },
): Promise<InboundNeedsApplicationResult> {
  const latestEvent = await findLatestInboundNeedsApplicationEvent(
    db,
    input.inboundId,
  );
  const shipment = (await db.inboundShipment.findFirstOrThrow({
    where: { id: input.inboundId, deletedAt: null },
    select: inboundNeedsApplicationShipmentSelect,
  })) as InboundNeedsApplicationShipment;
  const parsedSnapshot = parseInboundNeedsApplicationSnapshot(latestEvent);
  const activeSnapshot = inboundNeedsApplicationSnapshotMatchesShipment(
    shipment,
    parsedSnapshot,
  )
    ? parsedSnapshot
    : null;
  const applicationSummary = shipment.items.reduce(
    (summary, item) => {
      const itemSummary = summarizeInboundNeedsApplicationItem(item);
      summary.capacityQty += itemSummary.applicationCapacityQty;
      summary.openQty += itemSummary.openApplicationQty;
      return summary;
    },
    { capacityQty: 0, openQty: 0 },
  );
  const hasFullyAppliedInbound =
    applicationSummary.capacityQty > 0 && applicationSummary.openQty <= 0;
  const snapshot: InboundNeedsApplicationSnapshot | null = activeSnapshot ??
    (shipment.status === "completed" && hasFullyAppliedInbound
      ? buildExistingInboundNeedsApplicationSnapshot(shipment)
      : null);
  if (!snapshot) {
    throw new Error(
      `Inbound shipment #${input.inboundId} has no applied material needs to unapply.`,
    );
  }
  if (!inboundNeedsApplicationSnapshotIsReversible(shipment, snapshot)) {
    throw new Error(
      `Inbound shipment #${input.inboundId} changed or was physically received after it was applied. Review it before unapplying material needs.`,
    );
  }

  const currentDemandsById = new Map(
    shipment.items.flatMap((item) => item.inboundDemands).map((demand) => [demand.id, demand]),
  );
  const touchedComponentIds = new Set<number>();
  const affectedSalesOrderIds = new Set<number>();
  for (const baseline of snapshot.demands) {
    const current = currentDemandsById.get(baseline.id);
    if (!current) {
      throw new Error(
        `Inbound demand #${baseline.id} is no longer available to unapply.`,
      );
    }
    const committed = await db.inboundDemand.updateMany({
      where: {
        id: baseline.id,
        deletedAt: null,
        qtyReceived: baseline.afterQtyReceived,
        status: baseline.afterStatus,
        inboundShipmentItem: {
          inboundId: shipment.id,
          deletedAt: null,
          inbound: { deletedAt: null },
        },
      },
      data: {
        qtyReceived: baseline.beforeQtyReceived,
        status: baseline.beforeStatus,
      },
    });
    if (committed.count <= 0) {
      throw new Error(
        `Inbound demand #${baseline.id} changed before it could be unapplied.`,
      );
    }
    touchedComponentIds.add(baseline.lineItemComponentId);
    if (baseline.salesOrderId) affectedSalesOrderIds.add(baseline.salesOrderId);
  }

  let recomputedComponentCount = 0;
  for (const componentId of touchedComponentIds) {
    const recomputed = await recomputeLineItemComponentDemandState(db, componentId);
    if (recomputed) recomputedComponentCount += 1;
  }

  const applicationEvent = await db.event.create({
    data: {
      type: INBOUND_NEEDS_UNAPPLIED_EVENT,
      data: {
        version: 1,
        inboundId: shipment.id,
        appliedEventId: activeSnapshot ? latestEvent?.id ?? null : null,
        source: activeSnapshot ? "needs_application" : "existing_receipt",
        demandIds: snapshot.demands.map((demand) => demand.id),
      },
      userId: input.actorUserId ?? null,
    },
    select: { id: true },
  });

  return {
    inboundId: shipment.id,
    operation: "unapply",
    changed: snapshot.demands.length > 0,
    updatedDemandCount: snapshot.demands.length,
    recomputedComponentCount,
    affectedSalesOrderIds: Array.from(affectedSalesOrderIds),
    applicationEventId: applicationEvent.id,
  };
}

export async function reduceInboundShipmentDemand(
	db: DbLike,
	input: ReduceInboundShipmentDemandInput,
): Promise<ReduceInboundShipmentDemandResult> {
	const targetQty = Number(input.targetQty);
	if (!Number.isFinite(targetQty) || targetQty < 0) {
		throw new Error("Inbound demand quantity must be zero or greater.");
	}

	const demand = await db.inboundDemand.findFirstOrThrow({
		where: {
			id: input.demandId,
			deletedAt: null,
			inboundShipmentItem: {
				inboundId: input.inboundId,
				deletedAt: null,
			},
		},
		select: {
			id: true,
			qty: true,
			qtyReceived: true,
			status: true,
			lineItemComponentId: true,
			inboundShipmentItemId: true,
			inboundShipmentItem: {
				select: {
					id: true,
					qty: true,
					qtyGood: true,
					qtyIssue: true,
					inbound: {
						select: {
							id: true,
							status: true,
						},
					},
				},
			},
			lineItemComponent: {
				select: {
					parent: {
						select: {
							title: true,
							sale: {
								select: {
									id: true,
									orderId: true,
								},
							},
						},
					},
				},
			},
		},
	});
	const inboundItem = demand.inboundShipmentItem;
	if (!inboundItem) {
		throw new Error("Inbound demand is no longer assigned to this shipment.");
	}

	if (
		["completed", "closed", "cancelled"].includes(inboundItem.inbound.status)
	) {
		throw new Error(
			"Completed, closed, or cancelled inbound shipments cannot be edited.",
		);
	}

	const previousQty = Number(demand.qty || 0);
	const receivedQty = Number(demand.qtyReceived || 0);
	if (targetQty > previousQty) {
		throw new Error(
			"Use inbound assignment to increase an inbound demand quantity.",
		);
	}
	if (targetQty < receivedQty) {
		throw new Error(
			`Inbound demand cannot be reduced below ${receivedQty}; that quantity is already received.`,
		);
	}

	const removed = targetQty === 0;
	if (targetQty === previousQty) {
		return {
			inboundId: input.inboundId,
			demandId: demand.id,
			inboundShipmentItemId: inboundItem.id,
			lineItemComponentId: demand.lineItemComponentId,
			salesOrderId: demand.lineItemComponent.parent.sale?.id ?? null,
			orderId: demand.lineItemComponent.parent.sale?.orderId ?? null,
			lineTitle: demand.lineItemComponent.parent.title || "Line item",
			previousQty,
			targetQty,
			receivedQty,
			previousItemQty: Number(inboundItem.qty || 0),
			targetItemQty: Number(inboundItem.qty || 0),
			removed,
			changed: false,
		};
	}
	const demandStatus = removed
		? "pending"
		: receivedQty >= targetQty
			? "received"
			: receivedQty > 0
				? "partially_received"
				: "ordered";
	const updatedDemand = await db.inboundDemand.updateMany({
		where: {
			id: demand.id,
			deletedAt: null,
			qty: demand.qty,
			qtyReceived: demand.qtyReceived,
			inboundShipmentItemId: demand.inboundShipmentItemId,
		},
		data: removed
			? {
					inboundShipmentItemId: null,
					status: demandStatus,
					notes: `Removed from inbound shipment #${input.inboundId}`,
				}
			: {
					qty: targetQty,
					status: demandStatus,
				},
	});
	if (updatedDemand.count <= 0) {
		throw new Error(
			"Inbound demand changed before the reduction could be applied.",
		);
	}

	const previousItemQty = Number(inboundItem.qty || 0);
	const receivedItemQty =
		Number(inboundItem.qtyGood || 0) + Number(inboundItem.qtyIssue || 0);
	const targetItemQty = Math.max(
		receivedItemQty,
		previousItemQty - (previousQty - targetQty),
	);
	const updatedItem = await db.inboundShipmentItem.updateMany({
		where: {
			id: inboundItem.id,
			inboundId: input.inboundId,
			deletedAt: null,
			qty: inboundItem.qty,
		},
		data:
			targetItemQty <= 0
				? { qty: 0, deletedAt: new Date() }
				: { qty: targetItemQty },
	});
	if (updatedItem.count <= 0) {
		throw new Error(
			"Inbound item changed before the reduction could be applied.",
		);
	}

	await recomputeLineItemComponentDemandState(db, demand.lineItemComponentId);

	return {
		inboundId: input.inboundId,
		demandId: demand.id,
		inboundShipmentItemId: inboundItem.id,
		lineItemComponentId: demand.lineItemComponentId,
		salesOrderId: demand.lineItemComponent.parent.sale?.id ?? null,
		orderId: demand.lineItemComponent.parent.sale?.orderId ?? null,
		lineTitle: demand.lineItemComponent.parent.title || "Line item",
		previousQty,
		targetQty,
		receivedQty,
		previousItemQty,
		targetItemQty,
		removed,
		changed: true,
	};
}

export async function reconcileSalesAdjustmentInboundDemands(
	db: DbLike,
	input: ReconcileSalesAdjustmentInboundDemandsInput,
): Promise<ReconcileSalesAdjustmentInboundDemandsResult> {
	let adjustedDemandCount = 0;
	let cancelledOpenQty = 0;
	let keptWarehouseQty = 0;
	const affectedInboundIds = new Set<number>();
	const inboundEffects = new Map<
		number,
		{ cancelledOpenQty: number; keptWarehouseQty: number }
	>();
	const componentIds = new Set<number>();
	const itemQtyAfterAdjustment = new Map<number, number>();
	const reconciliationNote = `Reconciled by sales adjustment ${input.adjustmentId}`;
	const recordEffect = (
		inboundId: number | null,
		openReductionQty: number,
	) => {
		if (inboundId == null) return;
		affectedInboundIds.add(inboundId);
		if (!inboundEffects.has(inboundId)) {
			inboundEffects.set(inboundId, {
				cancelledOpenQty: 0,
				keptWarehouseQty: 0,
			});
		}
		const effect = inboundEffects.get(inboundId);
		if (!effect) return;
		if (input.disposition === "KEEP_IN_WAREHOUSE") {
			keptWarehouseQty += openReductionQty;
			effect.keptWarehouseQty += openReductionQty;
			return;
		}
		cancelledOpenQty += openReductionQty;
		effect.cancelledOpenQty += openReductionQty;
	};

	for (const line of input.lines) {
		const beforeQty = Math.max(0, Number(line.beforeQty || 0));
		const proposedQty = Math.max(0, Number(line.proposedQty || 0));
		if (beforeQty <= 0 || proposedQty >= beforeQty) continue;
		const retainedRatio = proposedQty / beforeQty;

		for (const snapshot of line.inboundDemands) {
			const snapshotQty = Math.max(0, Number(snapshot.qty || 0));
			const receivedQty = Math.max(0, Number(snapshot.qtyReceived || 0));
			const targetQty = Math.max(receivedQty, snapshotQty * retainedRatio);
			const openReductionQty = Math.max(0, snapshotQty - targetQty);
			if (openReductionQty <= 0) continue;

			const live = await db.inboundDemand.findFirst({
				where: { id: snapshot.id },
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					status: true,
					notes: true,
					deletedAt: true,
					lineItemComponentId: true,
					inboundShipmentItemId: true,
					inboundShipmentItem: {
						select: {
							id: true,
							qty: true,
							qtyGood: true,
							qtyIssue: true,
							inboundId: true,
							inbound: { select: { status: true } },
						},
					},
				},
			});
			if (!live) {
				throw new SalesAdjustmentInboundSnapshotConflictError(snapshot.id);
			}
			if (live.notes === reconciliationNote) {
				adjustedDemandCount += 1;
				recordEffect(snapshot.inboundId, openReductionQty);
				continue;
			}
			const item = live.inboundShipmentItem;
			const expectedItemQty =
				snapshot.inboundShipmentItemId == null
					? null
					: itemQtyAfterAdjustment.get(snapshot.inboundShipmentItemId) ??
						snapshot.inboundShipmentItemQty;
			if (
				live.deletedAt != null ||
				Number(live.qty || 0) !== Number(snapshot.qty || 0) ||
				Number(live.qtyReceived || 0) !==
					Number(snapshot.qtyReceived || 0) ||
				live.status !== snapshot.status ||
				live.inboundShipmentItemId !== snapshot.inboundShipmentItemId ||
				(item?.inboundId ?? null) !== snapshot.inboundId ||
				(item?.inbound.status ?? null) !== snapshot.inboundStatus ||
				(item == null ? null : Number(item.qty || 0)) !== expectedItemQty ||
				(item == null
					? 0
					: Number(item.qtyGood || 0) + Number(item.qtyIssue || 0)) !==
					snapshot.inboundShipmentItemReceivedQty
			) {
				throw new SalesAdjustmentInboundSnapshotConflictError(snapshot.id);
			}

			const removed = targetQty <= 0;
			const nextStatus = removed
				? "cancelled"
				: receivedQty >= targetQty
					? "received"
					: receivedQty > 0
						? "partially_received"
						: live.inboundShipmentItemId
							? "ordered"
							: "pending";
			const changed = await db.inboundDemand.updateMany({
				where: {
					id: live.id,
					deletedAt: null,
					qty: live.qty,
					qtyReceived: live.qtyReceived,
					inboundShipmentItemId: live.inboundShipmentItemId,
				},
				data: {
					qty: targetQty,
					status: nextStatus,
					notes: reconciliationNote,
					...(removed
						? {
								inboundShipmentItemId: null,
								deletedAt: new Date(),
							}
						: {}),
				},
			});
			if (changed.count <= 0) {
				throw new Error(
					`Inbound demand #${live.id} changed before sales adjustment reconciliation could be applied.`,
				);
			}

			adjustedDemandCount += changed.count;
			componentIds.add(live.lineItemComponentId);
			recordEffect(snapshot.inboundId, openReductionQty);

			if (input.disposition === "KEEP_IN_WAREHOUSE") {
				continue;
			}

			if (
				!item ||
				["completed", "closed", "cancelled"].includes(item.inbound.status)
			) {
				continue;
			}
			const previousItemQty = Number(item.qty || 0);
			const receivedItemQty =
				Number(item.qtyGood || 0) + Number(item.qtyIssue || 0);
			const targetItemQty = Math.max(
				receivedItemQty,
				previousItemQty - openReductionQty,
			);
			const itemChanged = await db.inboundShipmentItem.updateMany({
				where: {
					id: item.id,
					deletedAt: null,
					qty: item.qty,
				},
				data:
					targetItemQty <= 0
						? { qty: 0, deletedAt: new Date() }
						: { qty: targetItemQty },
			});
			if (itemChanged.count <= 0) {
				throw new Error(
					`Inbound item #${item.id} changed before sales adjustment reconciliation could be applied.`,
				);
			}
			itemQtyAfterAdjustment.set(item.id, targetItemQty);
		}
	}

	for (const componentId of componentIds) {
		await recomputeLineItemComponentDemandState(db, componentId);
	}

	return {
		adjustedDemandCount,
		affectedInboundIds: Array.from(affectedInboundIds).sort((a, b) => a - b),
		cancelledOpenQty,
		keptWarehouseQty,
		inboundEffects: Array.from(inboundEffects.entries())
			.map(([inboundId, effect]) => ({ inboundId, ...effect }))
			.sort((a, b) => a.inboundId - b.inboundId),
	};
}

export async function releaseCancelledInboundShipmentDemand(
  db: DbLike,
  inboundId: number,
): Promise<ReleaseCancelledInboundShipmentDemandResult> {
  const linkedDemands = await db.inboundDemand.findMany({
    where: {
      deletedAt: null,
      qtyReceived: 0,
      status: {
        in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
      },
      inboundShipmentItem: {
        inboundId,
        deletedAt: null,
        inbound: {
          status: "cancelled",
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      lineItemComponentId: true,
    },
  });

  if (!linkedDemands.length) {
    return {
      inboundId,
      releasedDemandCount: 0,
      recomputedComponentCount: 0,
    };
  }

  let releasedDemandCount = 0;
  const componentIds = new Set<number>();

  for (const demand of linkedDemands) {
    const released = await db.inboundDemand.updateMany({
      where: {
        id: demand.id,
        deletedAt: null,
        qtyReceived: 0,
        status: {
          in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
        },
        inboundShipmentItem: {
          inboundId,
          deletedAt: null,
          inbound: {
            status: "cancelled",
            deletedAt: null,
          },
        },
      },
      data: {
        inboundShipmentItemId: null,
        status: "pending",
        notes: `Released from cancelled inbound shipment #${inboundId}`,
      },
    });

    if (released.count > 0) {
      releasedDemandCount += released.count;
      componentIds.add(demand.lineItemComponentId);
    }
  }

  if (releasedDemandCount <= 0) {
    return {
      inboundId,
      releasedDemandCount: 0,
      recomputedComponentCount: 0,
    };
  }

  let recomputedComponentCount = 0;
  for (const componentId of componentIds.values()) {
    const recomputed = await recomputeLineItemComponentDemandState(
      db,
      componentId,
    );
    if (recomputed) recomputedComponentCount += 1;
  }

  return {
    inboundId,
    releasedDemandCount,
    recomputedComponentCount,
  };
}

export async function createInboundShipmentFromDemands(
  db: DbLike,
  input: CreateInboundShipmentFromDemandsInput,
): Promise<CreateInboundShipmentFromDemandsResult> {
  const demandIds = Array.from(new Set(input.demandIds.filter(Boolean)));
  if (!demandIds.length) {
    throw new Error("At least one inbound demand is required.");
  }

  const demands = await db.inboundDemand.findMany({
    where: {
      id: {
        in: demandIds,
      },
      deletedAt: null,
      status: {
        in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
      },
    },
    select: {
      id: true,
      qty: true,
      qtyReceived: true,
      inboundShipmentItemId: true,
      inventoryVariantId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!demands.length) {
    throw new Error("No eligible inbound demand rows were found.");
  }

  const unlinkedDemands = demands.filter(
    (demand) => !demand.inboundShipmentItemId,
  );
  if (!unlinkedDemands.length) {
    throw new Error("No unassigned inbound demand rows were found.");
  }

  const shipment = await db.inboundShipment.create({
    data: {
      supplierId: input.supplierId ?? null,
      reference: input.reference ?? null,
      expectedAt: input.expectedAt ?? null,
      status: input.status ?? "pending",
      progress: 0,
    },
    select: {
      id: true,
    },
  });

  const groupedByVariant = new Map<number, typeof unlinkedDemands>();
  for (const demand of unlinkedDemands) {
    const rows = groupedByVariant.get(demand.inventoryVariantId) || [];
    rows.push(demand);
    groupedByVariant.set(demand.inventoryVariantId, rows);
  }

  let createdItemCount = 0;
  let linkedDemandCount = 0;
  const linkedDemandIds: number[] = [];

  for (const [inventoryVariantId, variantDemands] of groupedByVariant.entries()) {
    const plannedQty = variantDemands.reduce((sum, demand) => {
      const outstanding = outstandingInboundDemandQty(demand);
      return sum + outstanding;
    }, 0);

    if (plannedQty <= 0) continue;

    const inboundItem = await db.inboundShipmentItem.create({
      data: {
        inboundId: shipment.id,
        inventoryVariantId,
        qty: 0,
      },
      select: {
        id: true,
      },
    });
    let confirmedLinkedQty = 0;

    for (const demand of variantDemands) {
      const linked = await db.inboundDemand.updateMany({
        where: {
          id: demand.id,
          deletedAt: null,
          status: {
            in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
          },
          qtyReceived: demand.qtyReceived,
          inboundShipmentItemId: null,
        },
        data: {
          inboundShipmentItemId: inboundItem.id,
          status: "ordered",
        },
      });
      if (linked.count > 0) {
        linkedDemandCount += 1;
        linkedDemandIds.push(demand.id);
        confirmedLinkedQty += outstandingInboundDemandQty(demand);
      }
    }

    if (confirmedLinkedQty > 0) {
      const committedItemQty = await db.inboundShipmentItem.updateMany({
        where: {
          id: inboundItem.id,
          inboundId: shipment.id,
          deletedAt: null,
          inbound: {
            deletedAt: null,
            status: {
              notIn: ["closed", "cancelled"],
            },
          },
        },
        data: {
          qty: confirmedLinkedQty,
        },
      });
      if (committedItemQty.count <= 0) {
        throw new Error(
          `Inbound shipment #${shipment.id} changed before demand assignment could be committed.`,
        );
      }
      createdItemCount += 1;
    } else {
      const cleanedEmptyItem = await db.inboundShipmentItem.updateMany({
        where: {
          id: inboundItem.id,
          inboundId: shipment.id,
          deletedAt: null,
          inbound: {
            deletedAt: null,
            status: {
              notIn: ["closed", "cancelled"],
            },
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
      if (cleanedEmptyItem.count <= 0) {
        throw new Error(
          `Inbound shipment #${shipment.id} changed before empty item cleanup could be committed.`,
        );
      }
    }
  }

  if (!linkedDemandCount) {
    const cleanedEmptyShipment = await db.inboundShipment.updateMany({
      where: {
        id: shipment.id,
        deletedAt: null,
        status: {
          notIn: ["closed", "cancelled"],
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    if (cleanedEmptyShipment.count <= 0) {
      throw new Error(
        `Inbound shipment #${shipment.id} changed before empty shipment cleanup could be committed.`,
      );
    }
    throw new Error("No unassigned inbound demand rows were linked.");
  }

  return {
    inboundId: shipment.id,
    createdItemCount,
    linkedDemandCount,
    linkedDemandIds,
  };
}

export async function ensureSelectedInboundDemandQuantities(
  db: DbLike,
  selections: InboundDemandQuantitySelection[],
) {
  const normalizedSelections = selections
    .map((selection) => ({
      demandIds: Array.from(
        new Set(selection.demandIds.filter((id) => Number.isFinite(id))),
      ),
      qty: Math.max(0, Number(selection.qty || 0)),
    }))
    .filter((selection) => selection.demandIds.length && selection.qty > 0);
  const demandIds = Array.from(
    new Set(normalizedSelections.flatMap((selection) => selection.demandIds)),
  );
  if (!demandIds.length) return [];

  const demands = await db.inboundDemand.findMany({
    where: {
      id: { in: demandIds },
      deletedAt: null,
      inboundShipmentItemId: null,
      status: { in: [...ACTIVE_INBOUND_DEMAND_STATUSES] },
    },
    select: {
      id: true,
      lineItemComponentId: true,
      inventoryVariantId: true,
      qty: true,
      qtyReceived: true,
      status: true,
      inboundShipmentItemId: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const demandsById = new Map(demands.map((demand) => [demand.id, demand]));
  const selectedDemandIds: number[] = [];

  for (const selection of normalizedSelections) {
    let remainingQty = selection.qty;
    for (const demandId of selection.demandIds) {
      if (remainingQty <= 0) break;
      const demand = demandsById.get(demandId);
      if (!demand) continue;
      const outstandingQty = outstandingInboundDemandQty(demand);
      if (outstandingQty <= 0) continue;
      const selectedQty = Math.min(remainingQty, outstandingQty);
      if (selectedQty >= outstandingQty) {
        selectedDemandIds.push(demand.id);
        remainingQty -= outstandingQty;
        continue;
      }

      const reduced = await db.inboundDemand.updateMany({
        where: {
          id: demand.id,
          deletedAt: null,
          inboundShipmentItemId: null,
          qty: demand.qty,
          qtyReceived: demand.qtyReceived,
          status: demand.status,
        },
        data: {
          qty: Number(demand.qty || 0) - selectedQty,
        },
      });
      if (reduced.count <= 0) continue;
      const splitDemand = await db.inboundDemand.create({
        data: {
          lineItemComponentId: demand.lineItemComponentId,
          inventoryVariantId: demand.inventoryVariantId,
          qty: selectedQty,
          status: "pending",
        },
        select: { id: true },
      });
      selectedDemandIds.push(splitDemand.id);
      remainingQty -= selectedQty;
    }
  }

  return selectedDemandIds;
}

export async function markSalesOrdersAvailableWhenInboundDemandResolved(
  db: DbLike,
  salesOrderIds: number[],
) {
  const ids = Array.from(
    new Set(salesOrderIds.filter((id) => Number.isFinite(id))),
  );
  if (!ids.length) return 0;

  const updated = await db.salesOrders.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      lineItems: {
        none: {
          deletedAt: null,
          components: {
            some: {
              inboundDemands: {
                some: {
                  deletedAt: null,
                  status: { in: [...ACTIVE_INBOUND_DEMAND_STATUSES] },
                },
              },
            },
          },
        },
      },
    },
    data: { inventoryStatus: "AVAILABLE" },
  });

  return updated.count;
}

export async function receiveInboundShipment(
  db: DbLike,
  input: ReceiveInboundShipmentInput,
): Promise<ReceiveInboundShipmentResult> {
  const shipment = await db.inboundShipment.findUniqueOrThrow({
    where: {
      id: input.inboundId,
    },
    select: {
      id: true,
      supplierId: true,
      reference: true,
      receivedAt: true,
      status: true,
      deletedAt: true,
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          qtyGood: true,
          qtyIssue: true,
          inventoryVariantId: true,
          inventoryVariant: {
            select: {
              inventoryId: true,
            },
          },
          issues: {
            where: {
              deletedAt: null,
              status: "open",
            },
            select: {
              id: true,
            },
          },
          inboundDemands: {
            where: {
              deletedAt: null,
              status: {
                not: "cancelled",
              },
            },
            select: {
              id: true,
              qty: true,
              qtyReceived: true,
              lineItemComponentId: true,
              lineItemComponent: {
                select: {
                  parent: {
                    select: { saleId: true },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });
  if (
    shipment.deletedAt ||
    shipment.status === "closed" ||
    shipment.status === "cancelled"
  ) {
    throw new Error(
      `Inbound shipment #${shipment.id} is not receivable in ${shipment.status} status.`,
    );
  }

  const hasExplicitItems = Array.isArray(input.items);
  const explicitReceiveItems = input.items || [];
  if (hasExplicitItems) {
    const seenItemIds = new Set<number>();
    for (const item of explicitReceiveItems) {
      if (seenItemIds.has(item.inboundShipmentItemId)) {
        throw new Error(
          `Inbound shipment item ${item.inboundShipmentItemId} was provided more than once.`,
        );
      }
      seenItemIds.add(item.inboundShipmentItemId);
    }
  }
  const receivedQtyByItemId = new Map(
    explicitReceiveItems.map((item) => [
      item.inboundShipmentItemId,
      {
        qtyReceived: asPositiveNumber(item.qtyReceived, 0),
        qtyGood:
          item.qtyGood == null ? null : asPositiveNumber(item.qtyGood, 0),
        qtyIssue:
          item.qtyIssue == null ? null : asPositiveNumber(item.qtyIssue, 0),
        unitPrice:
          item.unitPrice == null ? null : Number(item.unitPrice || 0),
        issueType: item.issueType ?? null,
        issueNotes: item.issueNotes ?? null,
      },
    ]),
  );
  if (hasExplicitItems) {
    const shipmentItemIds = new Set(shipment.items.map((item) => item.id));
    const invalidItemIds = Array.from(receivedQtyByItemId.keys()).filter(
      (itemId) => !shipmentItemIds.has(itemId),
    );
    if (invalidItemIds.length) {
      throw new Error(
        `Inbound shipment item ${invalidItemIds[0]} was not found on shipment #${shipment.id}.`,
      );
    }
  }

  let receivedItemCount = 0;
  let stockMovementCount = 0;
  let issueCount = 0;
  let skippedItemCount = 0;
  let newlyReceivedQty = 0;
  let alreadyReceivedQty = 0;
  let totalPlannedQty = 0;
  let totalReceivedQty = 0;
  let hasOpenIssues = false;
  const touchedLineItemComponentIds = new Set<number>();
  const touchedInventoryVariantIds = new Set<number>();
  const touchedSalesOrderIds = new Set<number>();

  for (const item of shipment.items) {
    if (item.issues.length > 0) {
      hasOpenIssues = true;
    }

    const override = receivedQtyByItemId.get(item.id);
    if (hasExplicitItems && !override) {
      const previouslyReceivedQty =
        positiveNumber(item.qtyGood) + positiveNumber(item.qtyIssue);
      totalPlannedQty += Number(item.qty || 0);
      totalReceivedQty += previouslyReceivedQty;
      alreadyReceivedQty += previouslyReceivedQty;
      continue;
    }

    const plannedQty = Number(item.qty || 0);
    const previousReceivedQty =
      positiveNumber(item.qtyGood) + positiveNumber(item.qtyIssue);
    const receipt = planInboundReceiptDelta({
      plannedQty,
      previousGoodQty: item.qtyGood,
      previousIssueQty: item.qtyIssue,
      qtyReceived: override?.qtyReceived,
      qtyGood: override?.qtyGood,
      qtyIssue: override?.qtyIssue,
    });
    const qtyGood = receipt.deltaGoodQty;
    const qtyIssue = receipt.deltaIssueQty;
    const unitPrice =
      override?.unitPrice == null
        ? item.unitPrice == null
          ? null
          : Number(item.unitPrice || 0)
        : override.unitPrice;

    totalPlannedQty += plannedQty;

    if (receipt.duplicate) {
      skippedItemCount += 1;
    }

    if (receipt.deltaReceivedQty > 0) {
      const committedReceipt = await db.inboundShipmentItem.updateMany({
        where: {
          id: item.id,
          deletedAt: null,
          qtyGood: item.qtyGood,
          qtyIssue: item.qtyIssue,
        },
        data: {
          qtyGood: receipt.targetGoodQty,
          qtyIssue: receipt.targetIssueQty,
          unitPrice,
        },
      });
      if (committedReceipt.count <= 0) {
        skippedItemCount += 1;
        totalReceivedQty += previousReceivedQty;
        alreadyReceivedQty += previousReceivedQty;
        continue;
      }
    }

    totalReceivedQty += receipt.targetReceivedQty;
    newlyReceivedQty += receipt.deltaReceivedQty;
    alreadyReceivedQty += previousReceivedQty;

    if (receipt.targetReceivedQty <= 0) continue;

    if (receipt.deltaReceivedQty > 0) {
      receivedItemCount += 1;
    }
    touchedInventoryVariantIds.add(item.inventoryVariantId);

    let stock: { id: number; qty?: number | null } | null = null;
    if (qtyGood > 0) {
      const existingStock = await db.inventoryStock.findFirst({
        where: {
          inventoryVariantId: item.inventoryVariantId,
          supplierId: shipment.supplierId,
          deletedAt: null,
        },
        select: {
          id: true,
          qty: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      let prevQty = Number(existingStock?.qty || 0);
      let currentQty = prevQty + qtyGood;

      if (existingStock) {
        const committedStock = await db.inventoryStock.updateMany({
          where: {
            id: existingStock.id,
            inventoryVariantId: item.inventoryVariantId,
            supplierId: shipment.supplierId,
            deletedAt: null,
          },
          data: {
            qty: {
              increment: qtyGood,
            },
            price: unitPrice,
          },
        });
        if (committedStock.count <= 0) {
          throw new Error(
            `Inventory stock #${existingStock.id} changed before inbound receipt could be committed.`,
          );
        }
        stock = await db.inventoryStock.findFirst({
          where: {
            id: existingStock.id,
            deletedAt: null,
          },
          select: {
            id: true,
            qty: true,
          },
        });
        if (!stock) {
          throw new Error(
            `Inventory stock #${existingStock.id} changed before inbound receipt could be committed.`,
          );
        }
      } else {
        stock = await db.inventoryStock.create({
          data: {
            inventoryVariantId: item.inventoryVariantId,
            supplierId: shipment.supplierId,
            qty: qtyGood,
            price: unitPrice,
          },
          select: {
            id: true,
            qty: true,
          },
        });
      }
      currentQty = Number(stock.qty || currentQty);
      prevQty = currentQty - qtyGood;

      await db.stockMovement.create({
        data: {
          inventoryVariantId: item.inventoryVariantId,
          prevQty,
          currentQty,
          changeQty: qtyGood,
          type: "stock_in",
          status: "completed",
          reference: shipment.reference || `inbound-${shipment.id}`,
          notes: `Inbound receipt for shipment #${shipment.id}`,
          authorName: input.authorName ?? null,
          inboundStockItemId: item.id,
        },
      });
      stockMovementCount += 1;
    }

    let remainingQty = qtyGood;
    const touchedComponentIds = new Set<number>();

    for (const demand of item.inboundDemands) {
      if (remainingQty <= 0) break;

      const outstanding = Math.max(
        0,
        Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
      );
      if (outstanding <= 0) continue;

      const appliedQty = Math.min(outstanding, remainingQty);
      const nextQtyReceived = Number(demand.qtyReceived || 0) + appliedQty;

      const receivedDemand = await db.inboundDemand.updateMany({
        where: {
          id: demand.id,
          deletedAt: null,
          qtyReceived: demand.qtyReceived,
          status: {
            in: [...ACTIVE_INBOUND_DEMAND_STATUSES],
          },
        },
        data: {
          qtyReceived: nextQtyReceived,
          status:
            nextQtyReceived >= Number(demand.qty || 0)
              ? "received"
              : "partially_received",
        },
      });
      if (receivedDemand.count <= 0) continue;

      remainingQty -= appliedQty;
      touchedComponentIds.add(demand.lineItemComponentId);
      touchedLineItemComponentIds.add(demand.lineItemComponentId);
      const salesOrderId = demand.lineItemComponent.parent.saleId;
      if (salesOrderId) touchedSalesOrderIds.add(salesOrderId);
    }

    if (qtyGood > 0 && stock) {
      await db.inventoryLog.create({
        data: {
          action: "inbound-received",
          qty: qtyGood,
          costPrice: unitPrice,
          inventoryVariantId: item.inventoryVariantId,
          inventoryId: item.inventoryVariant.inventoryId,
          inventoryStockId: stock.id,
          createdBy: input.authorName ?? null,
          notes: `Inbound shipment #${shipment.id} received`,
        },
      });
    }

    if (qtyIssue > 0) {
      hasOpenIssues = true;
      issueCount += 1;
      await db.inboundShipmentItemIssue.create({
        data: {
          inboundShipmentItemId: item.id,
          issueType: override?.issueType || "damaged",
          reportedQty: qtyIssue,
          notes: override?.issueNotes || null,
          status: "open",
        },
      });
    }

    for (const componentId of touchedComponentIds) {
      await recomputeLineItemComponentDemandState(db, componentId);
    }
  }

  const progress =
    totalPlannedQty > 0 ? Math.min(100, (totalReceivedQty / totalPlannedQty) * 100) : 0;
  const shipmentStatus =
    progress <= 0
      ? "pending"
      : hasOpenIssues
        ? "issue_open"
        : progress >= 100
        ? "completed"
        : "in_progress";

  const committedShipmentStatus = await db.inboundShipment.updateMany({
    where: {
      id: shipment.id,
      deletedAt: null,
      status: {
        notIn: ["closed", "cancelled"],
      },
    },
    data: {
      receivedAt:
        shipmentStatus === "completed"
          ? shipment.receivedAt || input.receivedAt || new Date()
          : null,
      progress,
      status: shipmentStatus,
    },
  });
  if (committedShipmentStatus.count <= 0) {
    throw new Error(
      `Inbound shipment #${shipment.id} is no longer receivable.`,
    );
  }

  await markSalesOrdersAvailableWhenInboundDemandResolved(
    db,
    Array.from(touchedSalesOrderIds),
  );

  return {
    inboundId: shipment.id,
    shipmentStatus,
    receivedItemCount,
    stockMovementCount,
    issueCount,
    skippedItemCount,
    newlyReceivedQty,
    alreadyReceivedQty,
    lineItemComponentIds: Array.from(touchedLineItemComponentIds),
    inventoryVariantIds: Array.from(touchedInventoryVariantIds),
  };
}
