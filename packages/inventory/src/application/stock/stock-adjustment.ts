import { Prisma, type Db, type TransactionClient } from "@gnd/db";

type DbLike = Db | TransactionClient;
import { readCategoryStockSettings } from "./stock-settings";

export type StockAdjustmentReason =
  | "correction"
  | "cycle_count"
  | "damage"
  | "return"
  | "consume"
  | "release"
  | "stock_in"
  | "stock_out";

export type StockAdjustmentMode = "delta" | "set";

export type PlanStockAdjustmentInput = {
  previousQty?: number | null;
  qty: number;
  mode?: StockAdjustmentMode;
};

export type PlannedStockAdjustment = {
  previousQty: number;
  currentQty: number;
  changeQty: number;
};

export type ManualStockAdjustmentInput = PlanStockAdjustmentInput & {
	openingCount?: boolean;
  expectedQty: number;
  inventoryVariantId: number;
  inventoryStockId?: number | null;
  supplierId?: number | null;
  location?: string | null;
  unitPrice?: number | null;
  reason: StockAdjustmentReason;
  reference?: string | null;
  notes?: string | null;
  authorName?: string | null;
};

export type ManualStockAdjustmentResult = PlannedStockAdjustment & {
  inventoryVariantId: number;
  inventoryStockId: number;
  movementId: number;
  logId: number;
  reason: StockAdjustmentReason;
};

export type StockAuditCategory =
  | "stock_in"
  | "stock_out"
  | "return"
  | "correction"
  | "consume"
  | "release";

export type StockAuditMatrixRow = {
  category: StockAuditCategory;
  reason: StockAdjustmentReason;
  expectedMovementTypes: string[];
  expectedLogActions: string[];
  expectedChange: "positive" | "negative" | "any";
};

export const STOCK_AUDIT_MATRIX: StockAuditMatrixRow[] = [
  {
    category: "stock_in",
    reason: "stock_in",
    expectedMovementTypes: ["stock_in"],
    expectedLogActions: ["stock-in", "inbound-received"],
    expectedChange: "positive",
  },
  {
    category: "stock_out",
    reason: "stock_out",
    expectedMovementTypes: ["stock_out"],
    expectedLogActions: ["stock-out"],
    expectedChange: "negative",
  },
  {
    category: "return",
    reason: "return",
    expectedMovementTypes: ["return"],
    expectedLogActions: ["return"],
    expectedChange: "positive",
  },
  {
    category: "correction",
    reason: "correction",
    expectedMovementTypes: ["adjustment"],
    expectedLogActions: ["correction", "correction-in", "correction-out"],
    expectedChange: "any",
  },
  {
    category: "consume",
    reason: "consume",
    expectedMovementTypes: ["sale"],
    expectedLogActions: ["consume"],
    expectedChange: "negative",
  },
  {
    category: "release",
    reason: "release",
    expectedMovementTypes: ["return", "stock_out"],
    expectedLogActions: ["release"],
    expectedChange: "any",
  },
];

export function planStockAdjustment(
  input: PlanStockAdjustmentInput,
): PlannedStockAdjustment {
  const previousQty = input.previousQty ?? 0;
  const qty = input.qty;
  if (!Number.isFinite(previousQty) || !Number.isFinite(qty)) {
    throw new StockAdjustmentError("BAD_REQUEST", "Stock quantities must be finite numbers.");
  }
  const currentQty = input.mode === "set" ? qty : previousQty + qty;

  if (currentQty < 0) {
    throw new StockAdjustmentError("BAD_REQUEST", "Stock adjustment cannot reduce stock below zero.");
  }
  if (!Number.isFinite(currentQty)) {
    throw new StockAdjustmentError("BAD_REQUEST", "Stock quantity is too large.");
  }

  return {
    previousQty,
    currentQty,
    changeQty: currentQty - previousQty,
  };
}

export class StockAdjustmentError extends Error {
  constructor(public readonly code: "BAD_REQUEST" | "CONFLICT", message: string) {
    super(message);
    this.name = "StockAdjustmentError";
  }
}

function getMovementType(reason: StockAdjustmentReason, changeQty: number) {
  if (reason === "return") return "return";
  if (reason === "consume") return "sale";
  if (reason === "stock_in") return "stock_in";
  if (reason === "stock_out") return "stock_out";
  if (reason === "release") return changeQty >= 0 ? "return" : "stock_out";
  return "adjustment";
}

function getLogAction(reason: StockAdjustmentReason, changeQty: number) {
  if (reason === "return") return "return";
  if (reason === "consume") return "consume";
  if (reason === "release") return "release";
  if (reason === "stock_in") return "stock-in";
  if (reason === "stock_out") return "stock-out";
  if (changeQty > 0) return "correction-in";
  if (changeQty < 0) return "correction-out";
  return "correction";
}

export function getStockAuditExpectation(
  reason: StockAdjustmentReason,
  changeQty: number,
) {
  return {
    movementType: getMovementType(reason, changeQty),
    logAction: getLogAction(reason, changeQty),
  };
}

type StockAuditMovementLike = {
  type?: string | null;
  changeQty?: number | null;
};

type StockAuditLogLike = {
  action?: string | null;
  qty?: number | null;
};

function matchesExpectedChange(
  expectedChange: StockAuditMatrixRow["expectedChange"],
  qty: number,
) {
  if (expectedChange === "positive") return qty > 0;
  if (expectedChange === "negative") return qty < 0;
  return true;
}

export function buildStockAuditVerificationReport(input: {
  movements: StockAuditMovementLike[];
  logs: StockAuditLogLike[];
}) {
  const rows = STOCK_AUDIT_MATRIX.map((matrixRow) => {
    let movementMatches = input.movements.filter((movement) => {
      const changeQty = Number(movement.changeQty || 0);
      return (
        matrixRow.expectedMovementTypes.includes(String(movement.type || "")) &&
        matchesExpectedChange(matrixRow.expectedChange, changeQty)
      );
    });
    const logMatches = input.logs.filter((log) =>
      matrixRow.expectedLogActions.includes(String(log.action || "")),
    );
    if (matrixRow.category === "release" && logMatches.length === 0) {
      movementMatches = [];
    }
    const observed = movementMatches.length > 0 || logMatches.length > 0;
    const verified = movementMatches.length > 0 && logMatches.length > 0;

    return {
      ...matrixRow,
      movementCount: movementMatches.length,
      logCount: logMatches.length,
      observed,
      verified,
      status: verified ? "verified" : observed ? "partial" : "not_observed",
    };
  });

  return {
    rows,
    summary: {
      totalCategories: rows.length,
      verifiedCategories: rows.filter((row) => row.verified).length,
      partialCategories: rows.filter((row) => row.status === "partial").length,
      notObservedCategories: rows.filter((row) => row.status === "not_observed")
        .length,
      movementCount: input.movements.length,
      logCount: input.logs.length,
    },
  };
}

export async function getStockAuditVerificationReport(
  db: Db,
  input: {
    from?: Date | string | null;
    to?: Date | string | null;
  } = {},
) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = input.from ? new Date(input.from) : defaultFrom;
  const to = input.to ? new Date(input.to) : now;

  const [movements, logs] = await Promise.all([
    db.stockMovement.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      take: 2000,
      select: {
        type: true,
        changeQty: true,
      },
    }),
    db.inventoryLog.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      take: 2000,
      select: {
        action: true,
        qty: true,
      },
    }),
  ]);

  return {
    ...buildStockAuditVerificationReport({
      movements,
      logs,
    }),
    period: {
      from,
      to,
      defaultWindowDays: 90,
    },
  };
}

export async function adjustInventoryStock(
  db: Db,
  input: ManualStockAdjustmentInput,
): Promise<ManualStockAdjustmentResult> {
  return db.$transaction(async (tx: DbLike) => {
    // Serialize manual writes even when the first stock row does not yet exist.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM InventoryVariant WHERE id=${input.inventoryVariantId} FOR UPDATE`);
    const activeVariant = await tx.inventoryVariant.findFirstOrThrow({
      where: {
        id: input.inventoryVariantId,
        deletedAt: null,
        inventory: { deletedAt: null, inventoryCategory: { deletedAt: null } },
      },
      select: { id: true, inventory: { select: { inventoryCategory: { select: { meta: true } } } } },
    });
    const stockUnit = input.openingCount ? readCategoryStockSettings(activeVariant.inventory.inventoryCategory?.meta).stockUnit : null;
    if (input.openingCount && (input.mode !== "set" || input.reason !== "cycle_count" || input.expectedQty !== 0 || !input.reference?.trim() || !stockUnit)) {
      throw new StockAdjustmentError("BAD_REQUEST", "Opening counts require a zero baseline, counted-total mode, a count reference, and a confirmed category unit.");
    }
    await tx.$queryRaw(Prisma.sql`SELECT id FROM InventoryStock WHERE inventoryVariantId=${input.inventoryVariantId} AND deletedAt IS NULL ORDER BY id FOR UPDATE`);
    const stock = input.inventoryStockId
      ? await tx.inventoryStock.findFirstOrThrow({
          where: {
            id: input.inventoryStockId,
            inventoryVariantId: input.inventoryVariantId,
            deletedAt: null,
          },
          select: {
            id: true,
            qty: true,
            inventoryVariant: {
              select: {
                inventoryId: true,
              },
            },
          },
        })
      : await tx.inventoryStock.findFirst({
          where: {
            inventoryVariantId: input.inventoryVariantId,
            supplierId: input.supplierId ?? null,
            location: input.location?.trim() || null,
            deletedAt: null,
          },
          select: {
            id: true,
            qty: true,
            inventoryVariant: {
              select: {
                inventoryId: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

    const inventoryVariant = stock
      ? null
      : await tx.inventoryVariant.findFirstOrThrow({
          where: {
            id: input.inventoryVariantId,
            deletedAt: null,
          },
          select: {
            inventoryId: true,
          },
        });
    if (input.expectedQty !== (stock?.qty ?? 0)) {
      throw new StockAdjustmentError("CONFLICT", "Stock changed. Refresh the current quantity and review the adjustment again.");
    }
    const planned = planStockAdjustment({
      previousQty: stock?.qty ?? 0,
      qty: input.qty,
      mode: input.mode ?? "delta",
    });

    if (stock && planned.changeQty < 0) {
      const committed = await tx.stockAllocation.aggregate({
        where: {
          inventoryStockId: stock.id,
          deletedAt: null,
          status: { in: ["pending_review", "approved", "reserved", "picked", "consumed"] },
        },
        _sum: { qty: true },
      });
      if (planned.currentQty < (committed._sum.qty ?? 0)) {
        throw new StockAdjustmentError("CONFLICT", "This stock is allocated to sales. Review the allocations before reducing the count below the allocated quantity.");
      }
    }

    if (planned.changeQty === 0) {
      throw new StockAdjustmentError("BAD_REQUEST", "Enter a quantity that changes the stock count.");
    }
    if (
      ((input.reason === "stock_in" || input.reason === "return") && planned.changeQty < 0) ||
      (["stock_out", "damage", "consume"].includes(input.reason) && planned.changeQty > 0)
    ) {
      throw new StockAdjustmentError("BAD_REQUEST", "Choose a reason that matches adding or removing stock.");
    }
    if (!stock && input.supplierId) {
      await tx.supplier.findFirstOrThrow({ where: { id: input.supplierId, deletedAt: null }, select: { id: true } });
    }

    const updatedStock = stock
      ? await tx.inventoryStock.update({
          where: {
            id: stock.id,
          },
          data: {
            qty: planned.currentQty,
            price: input.unitPrice ?? undefined,
          },
          select: {
            id: true,
          },
        })
      : await tx.inventoryStock.create({
          data: {
            inventoryVariantId: input.inventoryVariantId,
            qty: planned.currentQty,
            price: input.unitPrice ?? undefined,
            location: input.location ?? undefined,
            supplierId: input.supplierId ?? undefined,
          },
          select: {
            id: true,
          },
        });

    const movement = await tx.stockMovement.create({
      data: {
        inventoryVariantId: input.inventoryVariantId,
        prevQty: planned.previousQty,
        currentQty: planned.currentQty,
        changeQty: planned.changeQty,
        type: getMovementType(input.reason, planned.changeQty) as any,
        status: "completed",
        reference: input.reference ?? null,
        notes: input.openingCount ? `Opening count (${stockUnit}): ${input.notes || input.reference}` : input.notes ?? input.reason.replaceAll("_", " "),
        authorName: input.authorName ?? null,
      },
      select: {
        id: true,
      },
    });

    const log = await tx.inventoryLog.create({
      data: {
        action: getLogAction(input.reason, planned.changeQty),
        qty: Math.abs(planned.changeQty),
        costPrice: input.unitPrice ?? null,
        inventoryVariantId: input.inventoryVariantId,
        inventoryId:
          stock?.inventoryVariant.inventoryId ?? inventoryVariant?.inventoryId ?? null,
        inventoryStockId: updatedStock.id,
        createdBy: input.authorName ?? null,
        notes: input.openingCount ? `Opening count (${stockUnit}): ${input.notes || input.reference}` : input.notes ?? input.reason.replaceAll("_", " "),
      },
      select: {
        id: true,
      },
    });

    return {
      ...planned,
      inventoryVariantId: input.inventoryVariantId,
      inventoryStockId: updatedStock.id,
      movementId: movement.id,
      logId: log.id,
      reason: input.reason,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
