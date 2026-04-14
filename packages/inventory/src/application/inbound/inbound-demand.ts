import { type Db, type TransactionClient } from "@gnd/db";

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
};

export async function getInboundDemandQueue(
  db: DbLike,
  input: InboundDemandQueueInput = {},
) {
  const statuses: InboundDemandQueueStatus[] = input.status?.length
    ? input.status
    : ["pending", "ordered", "partially_received"];

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
        in: ["pending", "ordered", "partially_received"],
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
        in: ["pending", "ordered", "partially_received"],
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
  let totalPlannedQty = 0;
  let totalReceivedQty = 0;
  let hasOpenIssues = false;

  for (const item of shipment.items) {
    const override = receivedQtyByItemId.get(item.id);
    const plannedQty = Number(item.qty || 0);
    const rawQtyReceived = Math.max(0, override?.qtyReceived ?? plannedQty);
    const qtyIssue = Math.max(0, override?.qtyIssue ?? 0);
    const qtyGood =
      override?.qtyGood != null
        ? Math.max(0, override.qtyGood)
        : Math.max(0, rawQtyReceived - qtyIssue);
    const qtyReceived = qtyGood + qtyIssue;
    const unitPrice =
      override?.unitPrice == null
        ? item.unitPrice == null
          ? null
          : Number(item.unitPrice || 0)
        : override.unitPrice;

    totalPlannedQty += plannedQty;
    totalReceivedQty += qtyReceived;

    if (qtyReceived <= 0) continue;

    receivedItemCount += 1;

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
    }

    await db.inboundShipmentItem.update({
      where: {
        id: item.id,
      },
      data: {
        qtyGood,
        qtyIssue,
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
  };
}
