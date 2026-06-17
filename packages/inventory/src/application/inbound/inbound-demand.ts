import { type Db, type TransactionClient } from "@gnd/db";
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

export type CreateInboundShipmentFromDemandsInput = {
  supplierId: number;
  demandIds: number[];
  reference?: string | null;
  expectedAt?: Date | null;
};

export type CreateInboundShipmentInput = {
  supplierId: number;
  reference?: string | null;
  expectedAt?: Date | null;
};

export type CreateInboundShipmentFromDemandsResult = {
  inboundId: number;
  createdItemCount: number;
  linkedDemandCount: number;
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
      const result = await db.inboundDemand.updateMany({
        where: {
          deletedAt: null,
          status: {
            in: [...ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES],
          },
          ...selectedDemandFilter,
          lineItemComponent: {
            parent: {
              saleId: input.saleId,
              deletedAt: null,
            },
          },
        },
        data: {
          status: "cancelled",
          notes: "Order inbound prompt: AVAILABLE",
        },
      });

      return {
        saleId: input.saleId,
        status: input.status,
        updatedDemandCount: result.count,
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
  const shouldOnlyUpdateUnassignedDemand = input.status === "PENDING ORDER";
  const result = await db.inboundDemand.updateMany({
    where: {
      deletedAt: null,
      status: {
        in: [...ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES],
      },
      ...selectedDemandFilter,
      ...(shouldOnlyUpdateUnassignedDemand
        ? {
            inboundShipmentItemId: null,
          }
        : {}),
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
      supplierId: input.supplierId,
      reference: input.reference ?? null,
      expectedAt: input.expectedAt ?? null,
      status: "pending",
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

export async function assignInboundDemandsToShipment(
  db: DbLike,
  input: AssignInboundDemandsToShipmentInput,
) {
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
    },
  });

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

  const groupedByVariant = new Map<number, typeof demands>();
  for (const demand of demands) {
    const rows = groupedByVariant.get(demand.inventoryVariantId) || [];
    rows.push(demand);
    groupedByVariant.set(demand.inventoryVariantId, rows);
  }

  for (const [inventoryVariantId, variantDemands] of groupedByVariant.entries()) {
    const plannedQty = variantDemands.reduce((sum, demand) => {
      const outstanding = Math.max(
        0,
        Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
      );
      return sum + outstanding;
    }, 0);

    if (plannedQty <= 0) continue;

    const existingItem = existingItemsByVariant.get(inventoryVariantId);
    const inboundItem = existingItem
      ? await db.inboundShipmentItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            qty: Number(existingItem.qty || 0) + plannedQty,
          },
          select: {
            id: true,
          },
        })
      : await db.inboundShipmentItem.create({
          data: {
            inboundId: shipment.id,
            inventoryVariantId,
            qty: plannedQty,
          },
          select: {
            id: true,
          },
        });

    const linkableDemandIds = variantDemands.map((demand) => demand.id);
    await db.inboundDemand.updateMany({
      where: {
        id: {
          in: linkableDemandIds,
        },
      },
      data: {
        inboundShipmentItemId: inboundItem.id,
        status: "ordered",
      },
    });
    linkedDemandCount += linkableDemandIds.length;
  }

  return {
    inboundId: shipment.id,
    linkedDemandCount,
  };
}

export async function getInboundShipmentDetail(
  db: DbLike,
  input: InboundShipmentDetailInput,
) {
  return db.inboundShipment.findUniqueOrThrow({
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
  const targetIssueCandidate =
    input.qtyIssue == null ? previousIssueQty : positiveNumber(input.qtyIssue);
  const targetGoodCandidate =
    input.qtyGood == null
      ? Math.max(
          0,
          (input.qtyReceived == null
            ? plannedQty
            : positiveNumber(input.qtyReceived)) - targetIssueCandidate,
        )
      : positiveNumber(input.qtyGood);
  const targetGoodQty = Math.max(previousGoodQty, targetGoodCandidate);
  const targetIssueQty = Math.max(previousIssueQty, targetIssueCandidate);
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
  const component = await db.lineItemComponents.findUnique({
    where: {
      id: lineItemComponentId,
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

  await db.lineItemComponents.update({
    where: {
      id: component.id,
    },
    data: nextState,
  });

  return nextState;
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

  const shipment = await db.inboundShipment.create({
    data: {
      supplierId: input.supplierId,
      reference: input.reference ?? null,
      expectedAt: input.expectedAt ?? null,
      status: "pending",
      progress: 0,
    },
    select: {
      id: true,
    },
  });

  const groupedByVariant = new Map<number, typeof demands>();
  for (const demand of demands) {
    const rows = groupedByVariant.get(demand.inventoryVariantId) || [];
    rows.push(demand);
    groupedByVariant.set(demand.inventoryVariantId, rows);
  }

  let createdItemCount = 0;
  let linkedDemandCount = 0;

  for (const [inventoryVariantId, variantDemands] of groupedByVariant.entries()) {
    const plannedQty = variantDemands.reduce((sum, demand) => {
      const outstanding = Math.max(
        0,
        Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
      );
      return sum + outstanding;
    }, 0);

    if (plannedQty <= 0) continue;

    const inboundItem = await db.inboundShipmentItem.create({
      data: {
        inboundId: shipment.id,
        inventoryVariantId,
        qty: plannedQty,
      },
      select: {
        id: true,
      },
    });
    createdItemCount += 1;

    const linkableDemandIds = variantDemands
      .filter((demand) => !demand.inboundShipmentItemId)
      .map((demand) => demand.id);

    if (linkableDemandIds.length) {
      await db.inboundDemand.updateMany({
        where: {
          id: {
            in: linkableDemandIds,
          },
        },
        data: {
          inboundShipmentItemId: inboundItem.id,
          status: "ordered",
        },
      });
      linkedDemandCount += linkableDemandIds.length;
    }
  }

  return {
    inboundId: shipment.id,
    createdItemCount,
    linkedDemandCount,
  };
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
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  const receivedQtyByItemId = new Map(
    (input.items || []).map((item) => [
      item.inboundShipmentItemId,
      {
        qtyReceived: asPositiveNumber(item.qtyReceived, 0),
        qtyGood: asPositiveNumber(item.qtyGood, 0),
        qtyIssue: asPositiveNumber(item.qtyIssue, 0),
        unitPrice:
          item.unitPrice == null ? null : Number(item.unitPrice || 0),
        issueType: item.issueType ?? null,
        issueNotes: item.issueNotes ?? null,
      },
    ]),
  );

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

  for (const item of shipment.items) {
    const override = receivedQtyByItemId.get(item.id);
    const plannedQty = Number(item.qty || 0);
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
    totalReceivedQty += receipt.targetReceivedQty;
    newlyReceivedQty += receipt.deltaReceivedQty;
    alreadyReceivedQty +=
      positiveNumber(item.qtyGood) + positiveNumber(item.qtyIssue);

    if (receipt.duplicate) {
      skippedItemCount += 1;
    }

    if (receipt.targetReceivedQty <= 0) continue;

    if (receipt.deltaReceivedQty > 0) {
      receivedItemCount += 1;
    }
    touchedInventoryVariantIds.add(item.inventoryVariantId);

    let stock: { id: number } | null = null;
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

      const prevQty = Number(existingStock?.qty || 0);
      const currentQty = prevQty + qtyGood;

      stock = existingStock
        ? await db.inventoryStock.update({
            where: {
              id: existingStock.id,
            },
            data: {
              qty: currentQty,
              price: unitPrice,
            },
            select: {
              id: true,
            },
          })
        : await db.inventoryStock.create({
            data: {
              inventoryVariantId: item.inventoryVariantId,
              supplierId: shipment.supplierId,
              qty: qtyGood,
              price: unitPrice,
            },
            select: {
              id: true,
            },
          });

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
      remainingQty -= appliedQty;

      await db.inboundDemand.update({
        where: {
          id: demand.id,
        },
        data: {
          qtyReceived: nextQtyReceived,
          status:
            nextQtyReceived >= Number(demand.qty || 0)
              ? "received"
              : "partially_received",
        },
      });

      touchedComponentIds.add(demand.lineItemComponentId);
      touchedLineItemComponentIds.add(demand.lineItemComponentId);
    }

    await db.inboundShipmentItem.update({
      where: {
        id: item.id,
      },
      data: {
        qtyGood: receipt.targetGoodQty,
        qtyIssue: receipt.targetIssueQty,
        unitPrice,
      },
    });

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

  await db.inboundShipment.update({
    where: {
      id: shipment.id,
    },
    data: {
      receivedAt:
        shipmentStatus === "completed" ? input.receivedAt ?? new Date() : null,
      progress,
      status: shipmentStatus,
    },
  });

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
