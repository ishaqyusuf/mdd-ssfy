import type { TRPCContext } from "@api/trpc/init";

export type InventoryInboundSummary = {
  id: number;
  status: string | null;
};

export type InventoryInboundOwnership = {
  hasInventoryInbound: boolean;
  linkedInboundIds: number[];
  linkedInbounds: InventoryInboundSummary[];
  linkedInboundCount: number;
  linkedDemandCount: number;
  primaryInboundStatus: string | null;
  canUseManualInboundStatus: boolean;
};

export type SalesInventoryInboundStatusBackfillPreviewInput = {
  limit?: number | null;
  cursor?: number | null;
};

export type SalesInventoryInboundStatusBackfillInput = {
  salesOrderIds: number[];
  dryRun?: boolean | null;
  authorName?: string | null;
  triggeredByUserId?: number | string | null;
};

export type SalesInventoryInboundStatusBackfillSkippedReason =
  | "already_ordered"
  | "missing_or_ineligible_order"
  | "no_active_inventory_inbound"
  | "not_matching_candidate"
  | "changed_before_apply";

export type SalesInventoryInboundStatusBackfillSkippedSalesOrder = {
  salesOrderId: number;
  reason: SalesInventoryInboundStatusBackfillSkippedReason;
};

export type SalesInventoryInboundStatusBackfillPreviewRow = {
  salesOrderId: number;
  orderId: string;
  currentInventoryStatus: string | null;
  expectedInventoryStatus: "ORDERED";
  orderStatus: string | null;
  inventoryInboundOwnership: InventoryInboundOwnership;
};

export function emptySalesInventoryInboundOwnership(): InventoryInboundOwnership {
  return {
    hasInventoryInbound: false,
    linkedInboundIds: [],
    linkedInbounds: [],
    linkedInboundCount: 0,
    linkedDemandCount: 0,
    primaryInboundStatus: null,
    canUseManualInboundStatus: true,
  };
}

const activeInventoryInboundDemandWhere = {
  deletedAt: null,
  inboundShipmentItemId: {
    not: null,
  },
  inboundShipmentItem: {
    deletedAt: null,
    inbound: {
      deletedAt: null,
      status: {
        not: "cancelled",
      },
    },
  },
  status: {
    not: "cancelled",
  },
} as const;

const staleInventoryInboundStatusWhere = {
  OR: [
    {
      inventoryStatus: null,
    },
    {
      inventoryStatus: {
        not: "ORDERED",
      },
    },
  ],
} as const;

const activeInventoryOwnedInboundSalesOrderWhere = {
  lineItems: {
    some: {
      deletedAt: null,
      components: {
        some: {
          inboundDemands: {
            some: activeInventoryInboundDemandWhere,
          },
        },
      },
    },
  },
} as const;

const salesInventoryInboundStatusBackfillCandidateWhere = {
  deletedAt: null,
  type: "order",
  ...staleInventoryInboundStatusWhere,
  ...activeInventoryOwnedInboundSalesOrderWhere,
} as const;

function uniquePositiveIds(values: number[]) {
  return Array.from(
    new Set(values.filter((id) => Number.isInteger(id) && id > 0)),
  );
}

function buildSkippedSalesOrderReasons(
  salesOrderIds: number[],
  reason: SalesInventoryInboundStatusBackfillSkippedReason,
): SalesInventoryInboundStatusBackfillSkippedSalesOrder[] {
  return salesOrderIds.map((salesOrderId) => ({
    salesOrderId,
    reason,
  }));
}

function buildInventoryStatusBaselineWhere(inventoryStatus: string | null) {
  if (inventoryStatus === null) {
    return {
      inventoryStatus: null,
    };
  }

  return {
    inventoryStatus,
  };
}

async function getInitialSkippedSalesOrderReasons(
  db: TRPCContext["db"],
  salesOrderIds: number[],
): Promise<SalesInventoryInboundStatusBackfillSkippedSalesOrder[]> {
  if (!salesOrderIds.length) {
    return [];
  }

  const rows = await db.salesOrders.findMany({
    where: {
      id: {
        in: salesOrderIds,
      },
      deletedAt: null,
      type: "order",
    },
    select: {
      id: true,
      inventoryStatus: true,
    },
  });
  const activeInventoryOwnedRows = await db.salesOrders.findMany({
    where: {
      id: {
        in: salesOrderIds,
      },
      deletedAt: null,
      type: "order",
      ...activeInventoryOwnedInboundSalesOrderWhere,
    },
    select: {
      id: true,
    },
  });
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const activeInventoryOwnedIds = new Set(
    activeInventoryOwnedRows.map((row) => row.id),
  );

  return salesOrderIds.map((salesOrderId) => {
    const row = rowsById.get(salesOrderId);
    let reason: SalesInventoryInboundStatusBackfillSkippedReason =
      "not_matching_candidate";

    if (!row) {
      reason = "missing_or_ineligible_order";
    } else if (row.inventoryStatus === "ORDERED") {
      reason = "already_ordered";
    } else if (!activeInventoryOwnedIds.has(salesOrderId)) {
      reason = "no_active_inventory_inbound";
    }

    return {
      salesOrderId,
      reason,
    };
  });
}

function finalizeInventoryInboundOwnership(
  inboundsById: Map<number, InventoryInboundSummary>,
  demandCount: number,
): InventoryInboundOwnership {
  const linkedInbounds = Array.from(inboundsById.values()).sort(
    (a, b) => a.id - b.id,
  );
  const linkedInboundIds = linkedInbounds.map((inbound) => inbound.id);

  return {
    hasInventoryInbound: linkedInboundIds.length > 0,
    linkedInboundIds,
    linkedInbounds,
    linkedInboundCount: linkedInboundIds.length,
    linkedDemandCount: demandCount,
    primaryInboundStatus:
      linkedInbounds.length === 1 ? linkedInbounds[0]?.status ?? null : null,
    canUseManualInboundStatus: linkedInboundIds.length === 0,
  };
}

export async function getSalesInventoryInboundOwnershipMap(
  db: TRPCContext["db"],
  salesOrderIds: number[],
) {
  const uniqueSalesOrderIds = uniquePositiveIds(salesOrderIds);
  const ownershipBySalesOrderId = new Map<
    number,
    {
      inboundsById: Map<number, InventoryInboundSummary>;
      demandCount: number;
    }
  >();

  for (const salesOrderId of uniqueSalesOrderIds) {
    ownershipBySalesOrderId.set(salesOrderId, {
      inboundsById: new Map(),
      demandCount: 0,
    });
  }

  if (!uniqueSalesOrderIds.length) {
    return new Map<number, InventoryInboundOwnership>();
  }

  const linkedInboundDemands = await db.inboundDemand.findMany({
    where: {
      ...activeInventoryInboundDemandWhere,
      lineItemComponent: {
        parent: {
          saleId: {
            in: uniqueSalesOrderIds,
          },
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      inboundShipmentItem: {
        select: {
          inboundId: true,
          inbound: {
            select: {
              status: true,
            },
          },
        },
      },
      lineItemComponent: {
        select: {
          parent: {
            select: {
              saleId: true,
            },
          },
        },
      },
    },
  });

  for (const demand of linkedInboundDemands) {
    const salesOrderId = demand.lineItemComponent.parent.saleId;
    if (!salesOrderId) continue;

    const current =
      ownershipBySalesOrderId.get(salesOrderId) ??
      {
        inboundsById: new Map<number, InventoryInboundSummary>(),
        demandCount: 0,
      };
    current.demandCount += 1;

    const inboundId = demand.inboundShipmentItem?.inboundId;
    if (typeof inboundId === "number") {
      current.inboundsById.set(inboundId, {
        id: inboundId,
        status: demand.inboundShipmentItem?.inbound?.status ?? null,
      });
    }

    ownershipBySalesOrderId.set(salesOrderId, current);
  }

  return new Map(
    uniqueSalesOrderIds.map((salesOrderId) => {
      const current = ownershipBySalesOrderId.get(salesOrderId);
      if (!current) {
        return [salesOrderId, emptySalesInventoryInboundOwnership()] as const;
      }

      return [
        salesOrderId,
        finalizeInventoryInboundOwnership(
          current.inboundsById,
          current.demandCount,
        ),
      ] as const;
    }),
  );
}

export async function getSalesInventoryInboundOwnership(
  db: TRPCContext["db"],
  salesOrderId: number,
) {
  const ownershipMap = await getSalesInventoryInboundOwnershipMap(db, [
    salesOrderId,
  ]);

  return (
    ownershipMap.get(salesOrderId) ?? emptySalesInventoryInboundOwnership()
  );
}

async function getSalesInventoryInboundStatusBackfillCandidates(
  db: TRPCContext["db"],
  salesOrderIds: number[],
) {
  const uniqueSalesOrderIds = uniquePositiveIds(salesOrderIds);
  if (!uniqueSalesOrderIds.length) {
    return [] satisfies SalesInventoryInboundStatusBackfillPreviewRow[];
  }

  const rows = await db.salesOrders.findMany({
    where: {
      ...salesInventoryInboundStatusBackfillCandidateWhere,
      id: {
        in: uniqueSalesOrderIds,
      },
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      orderId: true,
      status: true,
      inventoryStatus: true,
    },
  });

  const ownershipMap = await getSalesInventoryInboundOwnershipMap(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    salesOrderId: row.id,
    orderId: row.orderId,
    currentInventoryStatus: row.inventoryStatus ?? null,
    expectedInventoryStatus: "ORDERED" as const,
    orderStatus: row.status ?? null,
    inventoryInboundOwnership:
      ownershipMap.get(row.id) ?? emptySalesInventoryInboundOwnership(),
  }));
}

export async function getSalesInventoryInboundStatusBackfillPreview(
  db: TRPCContext["db"],
  input: SalesInventoryInboundStatusBackfillPreviewInput = {},
) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const cursor = input.cursor && input.cursor > 0 ? input.cursor : null;

  const [rows, totalMismatchCount] = await Promise.all([
    db.salesOrders.findMany({
      where: {
        ...salesInventoryInboundStatusBackfillCandidateWhere,
        ...(cursor
          ? {
              id: {
                gt: cursor,
              },
            }
          : {}),
      },
      orderBy: {
        id: "asc",
      },
      take: limit + 1,
      select: {
        id: true,
        orderId: true,
        status: true,
        inventoryStatus: true,
      },
    }),
    db.salesOrders.count({
      where: salesInventoryInboundStatusBackfillCandidateWhere,
    }),
  ]);

  const samples = rows.slice(0, limit);
  const ownershipMap = await getSalesInventoryInboundOwnershipMap(
    db,
    samples.map((row) => row.id),
  );
  const staleRows: SalesInventoryInboundStatusBackfillPreviewRow[] = samples.map(
    (row) => ({
      salesOrderId: row.id,
      orderId: row.orderId,
      currentInventoryStatus: row.inventoryStatus ?? null,
      expectedInventoryStatus: "ORDERED",
      orderStatus: row.status ?? null,
      inventoryInboundOwnership:
        ownershipMap.get(row.id) ?? emptySalesInventoryInboundOwnership(),
    }),
  );

  return {
    status: totalMismatchCount ? "needs_backfill" : "clean",
    expectedInventoryStatus: "ORDERED" as const,
    limit,
    cursor,
    sampledMismatchCount: staleRows.length,
    totalMismatchCount,
    hasMore: rows.length > limit,
    nextCursor:
      rows.length > limit ? samples[samples.length - 1]?.id ?? null : null,
    samples: staleRows,
  };
}

export async function repairSalesInventoryInboundStatusBackfill(
  db: TRPCContext["db"],
  input: SalesInventoryInboundStatusBackfillInput,
) {
  const requestedSalesOrderIds = uniquePositiveIds(input.salesOrderIds);
  const dryRun = input.dryRun !== false;
  const candidates = await getSalesInventoryInboundStatusBackfillCandidates(
    db,
    requestedSalesOrderIds,
  );
  const candidateIds = new Set(
    candidates.map((candidate) => candidate.salesOrderId),
  );
  const skippedSalesOrderIds = requestedSalesOrderIds.filter(
    (salesOrderId) => !candidateIds.has(salesOrderId),
  );
  const initialSkippedSalesOrderReasons =
    await getInitialSkippedSalesOrderReasons(db, skippedSalesOrderIds);

  if (dryRun || !candidates.length) {
    return {
      status: candidates.length ? "needs_backfill" : "clean",
      dryRun,
      requestedCount: requestedSalesOrderIds.length,
      matchedCount: candidates.length,
      appliedCount: 0,
      skippedCount: skippedSalesOrderIds.length,
      skippedSalesOrderIds,
      skippedSalesOrderReasons: initialSkippedSalesOrderReasons,
      appliedSalesOrderIds: [] as number[],
      remainingMismatchCount: candidates.length,
      remainingCandidates: candidates,
      expectedInventoryStatus: "ORDERED" as const,
      candidates,
    };
  }

  const appliedSalesOrderIds: number[] = [];

  await db.$transaction(async (tx) => {
    for (const candidate of candidates) {
      const updateResult = await tx.salesOrders.updateMany({
        where: {
          ...salesInventoryInboundStatusBackfillCandidateWhere,
          id: candidate.salesOrderId,
          ...buildInventoryStatusBaselineWhere(
            candidate.currentInventoryStatus,
          ),
        },
        data: {
          inventoryStatus: "ORDERED",
        },
      });

      if (!updateResult.count) continue;

      appliedSalesOrderIds.push(candidate.salesOrderId);
      await tx.salesHistory.create({
        data: {
          salesId: candidate.salesOrderId,
          name: "Inventory inbound status backfilled",
          authorName: input.authorName || "System",
          data: {
            type: "sales_inventory_inbound_status_backfill",
            previousInventoryStatus: candidate.currentInventoryStatus,
            nextInventoryStatus: "ORDERED",
            linkedInboundIds:
              candidate.inventoryInboundOwnership.linkedInboundIds,
            linkedDemandCount:
              candidate.inventoryInboundOwnership.linkedDemandCount,
            triggeredByUserId: input.triggeredByUserId ?? null,
          },
        },
      });
    }
  });

  const appliedSalesOrderIdSet = new Set(appliedSalesOrderIds);
  const revalidationSkippedSalesOrderIds = candidates
    .filter(
      (candidate) => !appliedSalesOrderIdSet.has(candidate.salesOrderId),
    )
    .map((candidate) => candidate.salesOrderId);
  const allSkippedSalesOrderIds = [
    ...skippedSalesOrderIds,
    ...revalidationSkippedSalesOrderIds,
  ];
  const skippedSalesOrderReasons = [
    ...initialSkippedSalesOrderReasons,
    ...buildSkippedSalesOrderReasons(
      revalidationSkippedSalesOrderIds,
      "changed_before_apply",
    ),
  ];
  const remainingCandidates =
    await getSalesInventoryInboundStatusBackfillCandidates(
      db,
      requestedSalesOrderIds,
    );

  return {
    status: remainingCandidates.length ? "needs_backfill" : "clean",
    dryRun,
    requestedCount: requestedSalesOrderIds.length,
    matchedCount: candidates.length,
    appliedCount: appliedSalesOrderIds.length,
    skippedCount: allSkippedSalesOrderIds.length,
    skippedSalesOrderIds: allSkippedSalesOrderIds,
    skippedSalesOrderReasons,
    appliedSalesOrderIds,
    remainingMismatchCount: remainingCandidates.length,
    remainingCandidates,
    expectedInventoryStatus: "ORDERED" as const,
    candidates,
  };
}
