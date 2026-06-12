import type { Db, TransactionClient } from "@gnd/db";

type DbLike = Db | TransactionClient;

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

export function planStockAdjustment(
  input: PlanStockAdjustmentInput,
): PlannedStockAdjustment {
  const previousQty = Number(input.previousQty || 0);
  const qty = Number(input.qty || 0);
  const currentQty = input.mode === "set" ? qty : previousQty + qty;

  if (currentQty < 0) {
    throw new Error("Stock adjustment cannot reduce stock below zero.");
  }

  return {
    previousQty,
    currentQty,
    changeQty: currentQty - previousQty,
  };
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

export async function adjustInventoryStock(
  db: Db,
  input: ManualStockAdjustmentInput,
): Promise<ManualStockAdjustmentResult> {
  return db.$transaction(async (tx: DbLike) => {
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
            supplierId: input.supplierId ?? undefined,
            location: input.location ?? undefined,
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
    const planned = planStockAdjustment({
      previousQty: stock?.qty ?? 0,
      qty: input.qty,
      mode: input.mode ?? "delta",
    });

    const updatedStock = stock
      ? await tx.inventoryStock.update({
          where: {
            id: stock.id,
          },
          data: {
            qty: planned.currentQty,
            price: input.unitPrice ?? undefined,
            location: input.location ?? undefined,
            supplierId: input.supplierId ?? undefined,
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
        notes: input.notes ?? input.reason.replaceAll("_", " "),
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
        notes: input.notes ?? input.reason.replaceAll("_", " "),
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
  });
}
