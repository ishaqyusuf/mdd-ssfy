import { type Db, type TransactionClient } from "@gnd/db";
import { generateInventoryCategoryUidFromShelfCategoryId } from "@gnd/inventory/inventory-utils";

type DbLike = Db | TransactionClient;

export type SyncSalesInventoryLineItemsInput = {
  salesOrderId: number;
  source?: "new-form" | "old-form" | "manual" | "repair";
  triggeredByUserId?: number | null;
};

export type SyncSalesInventoryLineItemsResult = {
  salesOrderId: number;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  skippedCount: number;
  warnings: string[];
};

type InventoryMapping = {
  inventoryId: number;
  inventoryVariantId: number;
  inventoryCategoryId: number;
};

type ResolvedInventoryMapping = InventoryMapping & {
  inventoryUid: string | null;
};

type SyncComponentCandidate = {
  sourceType:
    | "dyke-step-product"
    | "dyke-house-package"
    | "dyke-door-product"
    | "shelf-product";
  sourceUid: string;
  title: string;
  qty: number;
  required: boolean;
  inventoryUid: string;
  variantUid: string;
  inventoryCategoryUid: string;
  inventoryCategoryTitle: string;
  inventoryName: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function asPositiveNumber(value: unknown, fallback = 1): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

function makeSourceKey(
  sourceType: SyncComponentCandidate["sourceType"],
  sourceUid: string,
) {
  return `${sourceType}:${sourceUid}`;
}

function extractInventoryMapping(meta: unknown): InventoryMapping | null {
  const root = asRecord(meta);
  const nestedMeta = asRecord(root.meta);
  const inventory = asRecord(root.inventory);
  const nestedInventory = asRecord(nestedMeta.inventory);

  const inventoryId =
    readNumber(root.inventoryId) ??
    readNumber(nestedMeta.inventoryId) ??
    readNumber(inventory.id) ??
    readNumber(nestedInventory.id);
  const inventoryVariantId =
    readNumber(root.inventoryVariantId) ??
    readNumber(nestedMeta.inventoryVariantId) ??
    readNumber(inventory.variantId) ??
    readNumber(inventory.inventoryVariantId) ??
    readNumber(nestedInventory.variantId) ??
    readNumber(nestedInventory.inventoryVariantId);
  const inventoryCategoryId =
    readNumber(root.inventoryCategoryId) ??
    readNumber(nestedMeta.inventoryCategoryId) ??
    readNumber(inventory.categoryId) ??
    readNumber(inventory.inventoryCategoryId) ??
    readNumber(nestedInventory.categoryId) ??
    readNumber(nestedInventory.inventoryCategoryId);

  if (!inventoryId || !inventoryVariantId || !inventoryCategoryId) {
    return null;
  }

  return {
    inventoryId,
    inventoryVariantId,
    inventoryCategoryId,
  };
}

async function ensureInventoryCategory(
  db: DbLike,
  input: {
    uid: string;
    title: string;
    type: string;
  },
) {
  const existing = await db.inventoryCategory.findFirst({
    where: {
      uid: input.uid,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      uid: true,
    },
  });

  if (existing) return existing;

  return db.inventoryCategory.create({
    data: {
      uid: input.uid,
      title: input.title,
      type: input.type,
    },
    select: {
      id: true,
      title: true,
      uid: true,
    },
  });
}

async function ensureInventoryRecord(
  db: DbLike,
  input: {
    uid: string;
    name: string;
    inventoryCategoryId: number;
  },
) {
  const existing = await db.inventory.findFirst({
    where: {
      uid: input.uid,
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      inventoryCategoryId: true,
    },
  });

  if (existing) return existing;

  return db.inventory.create({
    data: {
      uid: input.uid,
      name: input.name,
      inventoryCategoryId: input.inventoryCategoryId,
    },
    select: {
      id: true,
      uid: true,
      inventoryCategoryId: true,
    },
  });
}

async function ensureInventoryVariantRecord(
  db: DbLike,
  input: {
    inventoryId: number;
    uid: string;
  },
) {
  const existing = await db.inventoryVariant.findFirst({
    where: {
      inventoryId: input.inventoryId,
      uid: input.uid,
    },
    select: {
      id: true,
      uid: true,
    },
  });

  if (existing) return existing;

  return db.inventoryVariant.create({
    data: {
      inventoryId: input.inventoryId,
      uid: input.uid,
    },
    select: {
      id: true,
      uid: true,
    },
  });
}

async function ensureInventoryMappingFromCandidate(
  db: DbLike,
  candidate: SyncComponentCandidate,
) {
  const categoryType =
    candidate.sourceType === "shelf-product" ? "shelf-item" : "component";

  const category = await ensureInventoryCategory(db, {
    uid: candidate.inventoryCategoryUid,
    title: candidate.inventoryCategoryTitle,
    type: categoryType,
  });

  const inventory = await ensureInventoryRecord(db, {
    uid: candidate.inventoryUid,
    name: candidate.inventoryName,
    inventoryCategoryId: category.id,
  });

  const variant = await ensureInventoryVariantRecord(db, {
    inventoryId: inventory.id,
    uid: candidate.variantUid,
  });

  return {
    inventoryId: inventory.id,
    inventoryVariantId: variant.id,
    inventoryCategoryId: category.id,
    inventoryUid: inventory.uid,
  } satisfies ResolvedInventoryMapping;
}

async function resolveInventoryMappingForItem(
  db: DbLike,
  item: {
    id: number;
    description: string | null;
    meta: unknown;
    formSteps: Array<{
      prodUid: string | null;
      qty: number | null;
      meta: unknown;
      step: { uid: string | null; title: string | null } | null;
      component: { uid: string | null; name: string | null } | null;
    }>;
    shelfItems: Array<{
      productId: number | null;
      qty: number | null;
      description: string | null;
      categoryId: number | null;
      shelfProduct: { id: number; title: string | null } | null;
      category: { id: number; name: string | null } | null;
    }>;
    housePackageTool: {
      deletedAt: Date | null;
      totalDoors: number | null;
      stepProduct: {
        uid: string | null;
        name: string | null;
        step: { uid: string | null; title: string | null } | null;
      } | null;
    } | null;
  },
): Promise<ResolvedInventoryMapping | null> {
  const explicitMapping = extractInventoryMapping(item.meta);
  if (explicitMapping) {
    const inventory = await db.inventory.findFirst({
      where: {
        id: explicitMapping.inventoryId,
      },
      select: {
        uid: true,
      },
    });

    return {
      ...explicitMapping,
      inventoryUid: inventory?.uid ?? null,
    };
  }

  const hptStepProduct = item.housePackageTool?.stepProduct;
  if (hptStepProduct?.uid && hptStepProduct.step?.uid) {
    return ensureInventoryMappingFromCandidate(db, {
      sourceType: "dyke-house-package",
      sourceUid: hptStepProduct.uid,
      title:
        hptStepProduct.name ||
        item.description ||
        `Sales Item ${item.id} Product`,
      qty: asPositiveNumber(item.housePackageTool?.totalDoors, 1),
      required: true,
      inventoryUid: hptStepProduct.uid,
      variantUid: hptStepProduct.uid,
      inventoryCategoryUid: hptStepProduct.step.uid,
      inventoryCategoryTitle:
        hptStepProduct.step.title || "Dyke Component",
      inventoryName:
        hptStepProduct.name ||
        item.description ||
        `Sales Item ${item.id} Product`,
    });
  }

  if (item.shelfItems.length === 1) {
    const shelf = item.shelfItems[0]!;
    if (shelf.productId && shelf.categoryId) {
      const uid = `shelf-prod-${shelf.productId}`;
      return ensureInventoryMappingFromCandidate(db, {
        sourceType: "shelf-product",
        sourceUid: uid,
        title:
          shelf.shelfProduct?.title ||
          shelf.description ||
          item.description ||
          `Shelf Item ${shelf.productId}`,
        qty: asPositiveNumber(shelf.qty, 1),
        required: true,
        inventoryUid: uid,
        variantUid: uid,
        inventoryCategoryUid:
          generateInventoryCategoryUidFromShelfCategoryId(shelf.categoryId),
        inventoryCategoryTitle:
          shelf.category?.name || "Shelf Item",
        inventoryName:
          shelf.shelfProduct?.title ||
          shelf.description ||
          item.description ||
          `Shelf Item ${shelf.productId}`,
      });
    }
  }

  if (item.formSteps.length === 1) {
    const step = item.formSteps[0]!;
    const sourceUid = step.prodUid || step.component?.uid;
    const stepUid = step.step?.uid;
    if (sourceUid && stepUid) {
      const title =
        step.component?.name || item.description || `Sales Item ${item.id}`;
      return ensureInventoryMappingFromCandidate(db, {
        sourceType: "dyke-step-product",
        sourceUid,
        title,
        qty: asPositiveNumber(step.qty, 1),
        required: true,
        inventoryUid: sourceUid,
        variantUid: sourceUid,
        inventoryCategoryUid: stepUid,
        inventoryCategoryTitle: step.step?.title || "Dyke Component",
        inventoryName: title,
      });
    }
  }

  return null;
}

function normalizeItemTitle(item: {
  id: number;
  description: string | null;
  meta: unknown;
}) {
  const itemMeta = asRecord(item.meta);
  return (
    readString(itemMeta.title) ??
    readString(asRecord(itemMeta.meta).title) ??
    item.description ??
    `Sales Item ${item.id}`
  );
}

function normalizeItemDescription(item: {
  description: string | null;
  meta: unknown;
}) {
  const itemMeta = asRecord(item.meta);
  return (
    item.description ??
    readString(itemMeta.description) ??
    readString(asRecord(itemMeta.meta).description)
  );
}

function normalizeItemUid(item: { id: number; meta: unknown }) {
  const itemMeta = asRecord(item.meta);
  return (
    readString(itemMeta.uid) ??
    readString(asRecord(itemMeta.meta).uid) ??
    `sales-item-${item.id}`
  );
}

function buildStepFormCandidate(step: {
  prodUid: string | null;
  qty: number | null;
  meta: unknown;
  step: { uid: string | null; title: string | null } | null;
  component: { uid: string | null; name: string | null } | null;
}): SyncComponentCandidate | null {
  const sourceUid = step.prodUid || step.component?.uid;
  const categoryUid = step.step?.uid;
  if (!sourceUid || !categoryUid) return null;

  const stepMeta = asRecord(step.meta);
  const title =
    step.component?.name ??
    readString(stepMeta.title) ??
    readString(stepMeta.name) ??
    sourceUid;

  return {
    sourceType: "dyke-step-product",
    sourceUid,
    title,
    qty: asPositiveNumber(step.qty, 1),
    required: true,
    inventoryUid: sourceUid,
    variantUid: sourceUid,
    inventoryCategoryUid: categoryUid,
    inventoryCategoryTitle: step.step?.title || "Dyke Component",
    inventoryName: title,
  };
}

function buildShelfCandidate(shelf: {
  productId: number | null;
  qty: number | null;
  description: string | null;
  categoryId: number | null;
  shelfProduct: { id: number; title: string | null } | null;
  category: { id: number; name: string | null } | null;
}): SyncComponentCandidate | null {
  if (!shelf.productId || !shelf.categoryId) return null;

  const uid = `shelf-prod-${shelf.productId}`;
  const title =
    shelf.shelfProduct?.title ||
    shelf.description ||
    `Shelf Item ${shelf.productId}`;

  return {
    sourceType: "shelf-product",
    sourceUid: uid,
    title,
    qty: asPositiveNumber(shelf.qty, 1),
    required: true,
    inventoryUid: uid,
    variantUid: uid,
    inventoryCategoryUid:
      generateInventoryCategoryUidFromShelfCategoryId(shelf.categoryId),
    inventoryCategoryTitle: shelf.category?.name || "Shelf Item",
    inventoryName: title,
  };
}

function buildHousePackageCandidate(hpt: {
  totalDoors: number | null;
  stepProduct: {
    uid: string | null;
    name: string | null;
    step: { uid: string | null; title: string | null } | null;
  } | null;
}): SyncComponentCandidate | null {
  const sourceUid = hpt.stepProduct?.uid;
  const categoryUid = hpt.stepProduct?.step?.uid;
  if (!sourceUid || !categoryUid) return null;

  const title = hpt.stepProduct?.name || sourceUid;

  return {
    sourceType: "dyke-house-package",
    sourceUid,
    title,
    qty: asPositiveNumber(hpt.totalDoors, 1),
    required: true,
    inventoryUid: sourceUid,
    variantUid: sourceUid,
    inventoryCategoryUid: categoryUid,
    inventoryCategoryTitle: hpt.stepProduct?.step?.title || "Dyke Component",
    inventoryName: title,
  };
}

function buildDoorCandidate(door: {
  totalQty: number | null;
  stepProduct: {
    uid: string | null;
    name: string | null;
    step: { uid: string | null; title: string | null } | null;
  } | null;
}): SyncComponentCandidate | null {
  const sourceUid = door.stepProduct?.uid;
  const categoryUid = door.stepProduct?.step?.uid;
  if (!sourceUid || !categoryUid) return null;

  const title = door.stepProduct?.name || sourceUid;

  return {
    sourceType: "dyke-door-product",
    sourceUid,
    title,
    qty: asPositiveNumber(door.totalQty, 1),
    required: true,
    inventoryUid: sourceUid,
    variantUid: sourceUid,
    inventoryCategoryUid: categoryUid,
    inventoryCategoryTitle: door.stepProduct?.step?.title || "Dyke Component",
    inventoryName: title,
  };
}

async function ensureSubComponentRecord(
  db: DbLike,
  input: {
    parentInventoryId: number;
    inventoryCategoryId: number;
    defaultInventoryId: number | null;
  },
) {
  const existing = await db.subComponents.findFirst({
    where: {
      parentId: input.parentInventoryId,
      inventoryCategoryId: input.inventoryCategoryId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return db.subComponents.update({
      where: {
        id: existing.id,
      },
      data: {
        deletedAt: null,
        defaultInventoryId: input.defaultInventoryId,
      },
      select: {
        id: true,
      },
    });
  }

  return db.subComponents.create({
    data: {
      parentId: input.parentInventoryId,
      inventoryCategoryId: input.inventoryCategoryId,
      defaultInventoryId: input.defaultInventoryId,
      status: "published",
    },
    select: {
      id: true,
    },
  });
}

type ComponentDemandState = {
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

async function syncComponentFulfillment(
  db: DbLike,
  input: {
    lineItemComponentId: number;
    inventoryVariantId: number;
    qtyRequired: number;
  },
): Promise<ComponentDemandState> {
  const qtyRequired = Math.max(0, input.qtyRequired);

  const [variant, stocks, existingAllocations, existingInboundDemands] =
    await Promise.all([
      db.inventoryVariant.findUnique({
        where: {
          id: input.inventoryVariantId,
        },
        select: {
          inventory: {
            select: {
              stockMode: true,
              inventoryCategory: {
                select: {
                  stockMode: true,
                },
              },
            },
          },
        },
      }),
      db.inventoryStock.findMany({
        where: {
          inventoryVariantId: input.inventoryVariantId,
          deletedAt: null,
        },
        select: {
          id: true,
          qty: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      db.stockAllocation.findMany({
        where: {
          lineItemComponentId: input.lineItemComponentId,
          deletedAt: null,
        },
        select: {
          id: true,
          inventoryStockId: true,
          qty: true,
          status: true,
          notes: true,
        },
      }),
      db.inboundDemand.findMany({
        where: {
          lineItemComponentId: input.lineItemComponentId,
        },
        select: {
          id: true,
          qty: true,
          qtyReceived: true,
          status: true,
        },
      }),
    ]);

  const isMonitored =
    (variant?.inventory?.inventoryCategory?.stockMode ||
      variant?.inventory?.stockMode) === "monitored";

  if (!isMonitored) {
    if (existingAllocations.length) {
      await db.stockAllocation.updateMany({
        where: {
          id: {
            in: existingAllocations.map((allocation) => allocation.id),
          },
        },
        data: {
          status: "released",
          deletedAt: new Date(),
        },
      });
    }

    if (existingInboundDemands.length) {
      await db.inboundDemand.updateMany({
        where: {
          id: {
            in: existingInboundDemands.map((demand) => demand.id),
          },
        },
        data: {
          status: "cancelled",
          deletedAt: new Date(),
        },
      });
    }

    return {
      qtyAllocated: 0,
      qtyInbound: 0,
      qtyReceived: 0,
      status: qtyRequired <= 0 ? "cancelled" : "pending",
    };
  }

  const activeReservedByStockId = new Map<number, number>();

  const globalAllocations = await db.stockAllocation.findMany({
    where: {
      inventoryVariantId: input.inventoryVariantId,
      deletedAt: null,
      status: {
        in: ["approved", "reserved", "picked", "consumed"],
      },
    },
    select: {
      id: true,
      inventoryStockId: true,
      qty: true,
      lineItemComponentId: true,
    },
  });

  for (const allocation of globalAllocations) {
    if (!allocation.inventoryStockId) continue;
    const current = activeReservedByStockId.get(allocation.inventoryStockId) || 0;
    activeReservedByStockId.set(
      allocation.inventoryStockId,
      current +
        (allocation.lineItemComponentId === input.lineItemComponentId
          ? 0
          : Number(allocation.qty || 0)),
    );
  }

  let remaining = qtyRequired;
  const desiredAllocations = new Map<number, number>();

  for (const stock of stocks) {
    if (remaining <= 0) break;

    const stockQty = Number(stock.qty || 0);
    const reservedQty = activeReservedByStockId.get(stock.id) || 0;
    const availableQty = Math.max(0, stockQty - reservedQty);
    if (availableQty <= 0) continue;

    const assignedQty = Math.min(remaining, availableQty);
    if (assignedQty <= 0) continue;

    desiredAllocations.set(stock.id, assignedQty);
    remaining -= assignedQty;
  }

  const existingAllocationByStockId = new Map(
    existingAllocations
      .filter((allocation) => allocation.inventoryStockId)
      .map((allocation) => [allocation.inventoryStockId as number, allocation]),
  );

  for (const [inventoryStockId, qty] of desiredAllocations.entries()) {
    const existing = existingAllocationByStockId.get(inventoryStockId) as
      | {
          id: number;
          qty?: number | null;
          status?: string | null;
          notes?: string | null;
        }
      | undefined;
    if (existing) {
      const shouldKeepApproved =
        existing.status === "approved" && Number(existing.qty || 0) === qty;
      await db.stockAllocation.update({
        where: {
          id: existing.id,
        },
        data: {
          qty,
          status: shouldKeepApproved ? "approved" : "pending_review",
          notes: shouldKeepApproved
            ? existing.notes || undefined
            : "Suggested allocation awaiting manual approval",
          deletedAt: null,
        },
      });
    } else {
      await db.stockAllocation.create({
        data: {
          lineItemComponentId: input.lineItemComponentId,
          inventoryStockId,
          inventoryVariantId: input.inventoryVariantId,
          qty,
          status: "pending_review",
          notes: "Suggested allocation awaiting manual approval",
        },
      });
    }
  }

  const staleAllocationIds = existingAllocations
    .filter((allocation) => {
      const inventoryStockId = allocation.inventoryStockId;
      if (!inventoryStockId) return true;
      return !desiredAllocations.has(inventoryStockId);
    })
    .map((allocation) => allocation.id);

  if (staleAllocationIds.length) {
    await db.stockAllocation.updateMany({
      where: {
        id: {
          in: staleAllocationIds,
        },
      },
      data: {
        status: "released",
        deletedAt: new Date(),
      },
    });
  }

  const committedAllocationQty = existingAllocations.reduce((sum, allocation) => {
    const stockId = allocation.inventoryStockId;
    if (!stockId) return sum;
    const desiredQty = desiredAllocations.get(stockId);
    if (!desiredQty) return sum;
    const isCommitted =
      allocation.status === "approved" &&
      Number(allocation.qty || 0) === Number(desiredQty || 0);
    return sum + (isCommitted ? Number(desiredQty || 0) : 0);
  }, 0);

  const qtyAllocated = committedAllocationQty;
  const qtyInbound = Math.max(0, qtyRequired - qtyAllocated);
  const qtyReceived = existingInboundDemands.reduce(
    (sum, demand) => sum + Number(demand.qtyReceived || 0),
    0,
  );

  const primaryInboundDemand = existingInboundDemands[0] || null;

  if (qtyInbound > 0) {
    if (primaryInboundDemand) {
      await db.inboundDemand.update({
        where: {
          id: primaryInboundDemand.id,
        },
        data: {
          qty: qtyInbound,
          status:
            qtyReceived > 0 && qtyReceived < qtyInbound
              ? "partially_received"
              : qtyReceived >= qtyInbound
                ? "received"
                : "pending",
          deletedAt: null,
        },
      });
    } else {
      await db.inboundDemand.create({
        data: {
          lineItemComponentId: input.lineItemComponentId,
          inventoryVariantId: input.inventoryVariantId,
          qty: qtyInbound,
          status: "pending",
        },
      });
    }
  } else if (existingInboundDemands.length) {
    await db.inboundDemand.updateMany({
      where: {
        id: {
          in: existingInboundDemands.map((demand) => demand.id),
        },
      },
      data: {
        deletedAt: new Date(),
        status: "cancelled",
      },
    });
  }

  if (existingInboundDemands.length > 1) {
    const extraDemandIds = existingInboundDemands.slice(1).map((demand) => demand.id);
    if (extraDemandIds.length) {
      await db.inboundDemand.updateMany({
        where: {
          id: {
            in: extraDemandIds,
          },
        },
        data: {
          deletedAt: new Date(),
          status: "cancelled",
        },
      });
    }
  }

  let status: ComponentDemandState["status"] = "pending";
  if (qtyRequired <= 0) {
    status = "cancelled";
  } else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
    status = "allocated";
  } else if (qtyAllocated > 0 && qtyInbound > 0) {
    status = "partially_allocated";
  } else if (qtyInbound > 0) {
    status = "inbound_required";
  }
  if (qtyReceived > 0 && qtyReceived < qtyInbound) {
    status = "partially_received";
  }
  if (qtyReceived >= qtyInbound && qtyInbound > 0) {
    status = qtyAllocated + qtyReceived >= qtyRequired ? "fulfilled" : "partially_received";
  }

  return {
    qtyAllocated,
    qtyInbound,
    qtyReceived,
    status,
  };
}

export async function syncSalesInventoryLineItems(
  db: DbLike,
  input: SyncSalesInventoryLineItemsInput,
): Promise<SyncSalesInventoryLineItemsResult> {
  const source = input.source ?? "manual";
  const warnings: string[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;

  const sale = await db.salesOrders.findFirstOrThrow({
    where: {
      id: input.salesOrderId,
    },
    select: {
      id: true,
      lineItems: {
        select: {
          id: true,
          salesItemId: true,
          inventoryId: true,
          components: {
            select: {
              id: true,
              subComponentId: true,
            },
          },
        },
      },
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          description: true,
          qty: true,
          rate: true,
          total: true,
          meta: true,
          formSteps: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              prodUid: true,
              qty: true,
              meta: true,
              step: {
                select: {
                  uid: true,
                  title: true,
                },
              },
              component: {
                select: {
                  uid: true,
                  name: true,
                },
              },
            },
          },
          shelfItems: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              productId: true,
              qty: true,
              description: true,
              categoryId: true,
              shelfProduct: {
                select: {
                  id: true,
                  title: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          housePackageTool: {
            select: {
              id: true,
              deletedAt: true,
              totalDoors: true,
              stepProduct: {
                select: {
                  uid: true,
                  name: true,
                  step: {
                    select: {
                      uid: true,
                      title: true,
                    },
                  },
                },
              },
              doors: {
                where: {
                  deletedAt: null,
                },
                select: {
                  id: true,
                  totalQty: true,
                  stepProduct: {
                    select: {
                      uid: true,
                      name: true,
                      step: {
                        select: {
                          uid: true,
                          title: true,
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

  const syncedSalesItemIds = new Set<number>();

  for (const [index, item] of sale.items.entries()) {
    const itemMeta = asRecord(item.meta);
    const title = normalizeItemTitle(item);
    const description = normalizeItemDescription(item);
    const uid = normalizeItemUid(item);
    const lineQty = Number(item.qty || 0);
    const itemComponents = new Map<string, SyncComponentCandidate>();

    for (const step of item.formSteps) {
      const candidate = buildStepFormCandidate(step);
      if (!candidate) {
        warnings.push(
          `salesItem:${item.id}: skipped dyke step form candidate due to missing uid mapping`,
        );
        continue;
      }
      itemComponents.set(
        makeSourceKey(candidate.sourceType, candidate.sourceUid),
        candidate,
      );
    }

    for (const shelf of item.shelfItems) {
      const candidate = buildShelfCandidate(shelf);
      if (!candidate) {
        warnings.push(
          `salesItem:${item.id}: skipped shelf candidate due to missing shelf product/category mapping`,
        );
        continue;
      }
      itemComponents.set(
        makeSourceKey(candidate.sourceType, candidate.sourceUid),
        candidate,
      );
    }

    if (item.housePackageTool && !item.housePackageTool.deletedAt) {
      const hptCandidate = buildHousePackageCandidate(item.housePackageTool);
      if (hptCandidate) {
        itemComponents.set(
          makeSourceKey(hptCandidate.sourceType, hptCandidate.sourceUid),
          hptCandidate,
        );
      }
      for (const door of item.housePackageTool.doors) {
        const doorCandidate = buildDoorCandidate(door);
        if (!doorCandidate) {
          warnings.push(
            `salesItem:${item.id}: skipped door candidate due to missing dyke uid mapping`,
          );
          continue;
        }
        itemComponents.set(
          makeSourceKey(doorCandidate.sourceType, doorCandidate.sourceUid),
          doorCandidate,
        );
      }
    }

    const mapping = await resolveInventoryMappingForItem(db, item);

    if (!mapping) {
      skippedCount += 1;
      warnings.push(
        `salesItem:${item.id}: missing deterministic inventory mapping for parent line item`,
      );
      continue;
    }

    const existing = await db.lineItem.findUnique({
      where: {
        salesItemId: item.id,
      },
      select: {
        id: true,
      },
    });

    const lineItemData = {
      uid,
      sn: index,
      title,
      description,
      qty: lineQty,
      unitCost: Number(item.rate || 0),
      totalCost: Number(item.total || 0),
      lineItemType: "SALE" as const,
      saleId: sale.id,
      salesItemId: item.id,
      inventoryId: mapping.inventoryId,
      inventoryVariantId: mapping.inventoryVariantId,
      inventoryCategoryId: mapping.inventoryCategoryId,
      deletedAt: null,
      meta: {
        ...(itemMeta as Record<string, unknown>),
        inventorySync: {
          source,
          triggeredByUserId: input.triggeredByUserId ?? null,
          syncedAt: new Date().toISOString(),
          inventoryUid: mapping.inventoryUid,
          componentCount: itemComponents.size,
        },
      } as Record<string, unknown>,
    };

    let lineItemId: number;

    if (existing) {
      await db.lineItem.update({
        where: {
          id: existing.id,
        },
        data: lineItemData,
      });
      lineItemId = existing.id;
      updatedCount += 1;
    } else {
      const created = await db.lineItem.create({
        data: lineItemData,
        select: {
          id: true,
        },
      });
      lineItemId = created.id;
      createdCount += 1;
    }

    syncedSalesItemIds.add(item.id);

    const refreshedLineItem = await db.lineItem.findUnique({
      where: {
        id: lineItemId,
      },
      select: {
        id: true,
        inventoryId: true,
        components: {
          select: {
            id: true,
            subComponentId: true,
          },
        },
      },
    });

    if (!refreshedLineItem) continue;

    const syncedComponentIds = new Set<number>();

    for (const candidate of itemComponents.values()) {
      const componentMapping = await ensureInventoryMappingFromCandidate(
        db,
        candidate,
      );

      const subComponent = await ensureSubComponentRecord(db, {
        parentInventoryId: refreshedLineItem.inventoryId,
        inventoryCategoryId: componentMapping.inventoryCategoryId,
        defaultInventoryId: componentMapping.inventoryId,
      });

      const existingComponent = refreshedLineItem.components.find(
        (component) => component.subComponentId === subComponent.id,
      );

      const componentData = {
        lineItemId: refreshedLineItem.id,
        subComponentId: subComponent.id,
        inventoryCategoryId: componentMapping.inventoryCategoryId,
        inventoryId: componentMapping.inventoryId,
        inventoryVariantId: componentMapping.inventoryVariantId,
        qty: Math.max(1, Math.round(candidate.qty)),
        required: candidate.required,
        qtyAllocated: 0,
        qtyInbound: 0,
        qtyReceived: 0,
        status: "pending" as const,
      };

      let lineItemComponentId: number;
      if (existingComponent) {
        await db.lineItemComponents.update({
          where: {
            id: existingComponent.id,
          },
        data: componentData,
      });
        lineItemComponentId = existingComponent.id;
        syncedComponentIds.add(existingComponent.id);
      } else {
        const createdComponent = await db.lineItemComponents.create({
          data: componentData,
          select: {
            id: true,
          },
        });
        lineItemComponentId = createdComponent.id;
        syncedComponentIds.add(createdComponent.id);
      }

      const fulfillment = await syncComponentFulfillment(db, {
        lineItemComponentId,
        inventoryVariantId: componentMapping.inventoryVariantId,
        qtyRequired: Math.max(1, Math.round(candidate.qty)),
      });

      await db.lineItemComponents.update({
        where: {
          id: lineItemComponentId,
        },
        data: {
          qtyAllocated: fulfillment.qtyAllocated,
          qtyInbound: fulfillment.qtyInbound,
          qtyReceived: fulfillment.qtyReceived,
          status: fulfillment.status,
        },
      });
    }

    const staleComponentIds = refreshedLineItem.components
      .filter((component) => !syncedComponentIds.has(component.id))
      .map((component) => component.id);

    if (staleComponentIds.length) {
      await db.stockAllocation.updateMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
        data: {
          deletedAt: new Date(),
          status: "released",
        },
      });
      await db.stockAllocation.deleteMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
      });
      await db.inboundDemand.updateMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
        data: {
          deletedAt: new Date(),
          status: "cancelled",
        },
      });
      await db.inboundDemand.deleteMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
      });
      await db.lineItemComponents.deleteMany({
        where: {
          id: {
            in: staleComponentIds,
          },
        },
      });
    }
  }

  const staleLineItems = sale.lineItems.filter(
    (lineItem) =>
      lineItem.salesItemId && !syncedSalesItemIds.has(lineItem.salesItemId),
  );

  if (staleLineItems.length) {
    const staleIds = staleLineItems.map((lineItem) => lineItem.id);
    const staleComponents = await db.lineItemComponents.findMany({
      where: {
        lineItemId: {
          in: staleIds,
        },
      },
      select: {
        id: true,
      },
    });
    const staleComponentIds = staleComponents.map((component) => component.id);
    if (staleComponentIds.length) {
      await db.stockAllocation.updateMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
        data: {
          deletedAt: new Date(),
          status: "released",
        },
      });
      await db.stockAllocation.deleteMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
      });
      await db.inboundDemand.updateMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
        data: {
          deletedAt: new Date(),
          status: "cancelled",
        },
      });
      await db.inboundDemand.deleteMany({
        where: {
          lineItemComponentId: {
            in: staleComponentIds,
          },
        },
      });
    }
    await db.lineItemComponents.deleteMany({
      where: {
        lineItemId: {
          in: staleIds,
        },
      },
    });
    await db.lineItem.updateMany({
      where: {
        id: {
          in: staleIds,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    deletedCount = staleIds.length;
  }

  return {
    salesOrderId: sale.id,
    createdCount,
    updatedCount,
    deletedCount,
    skippedCount,
    warnings,
  };
}
