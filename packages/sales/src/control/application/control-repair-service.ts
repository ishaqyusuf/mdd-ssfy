import type { Db } from "../../types";
import { composeControls } from "../../utils/sales-control";
import {
  getSalesItemControllablesInfoAction,
  updateSalesItemControlAction,
  updateSalesStatControlAction,
} from "../../sales-control";

type QtySnapshot = {
  qty: number;
  lh: number;
  rh: number;
  total: number;
  itemTotal: number;
};

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function snapshotFromRow(input: {
  qty?: number | null;
  lh?: number | null;
  rh?: number | null;
  total?: number | null;
  itemTotal?: number | null;
}): QtySnapshot {
  return {
    qty: toNumber(input.qty),
    lh: toNumber(input.lh),
    rh: toNumber(input.rh),
    total: toNumber(input.total),
    itemTotal: toNumber(input.itemTotal),
  };
}

function keyOf(itemControlUid: string, type: string) {
  return `${itemControlUid}::${type}`;
}

export class ControlRepairService {
  constructor(private readonly db: Db) {}

  private async requireSuperAdmin(authorId: number) {
    const user = await this.db.users.findFirst({
      where: {
        id: authorId,
      },
      select: {
        roles: {
          where: {
            deletedAt: null,
          },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    const role = user?.roles?.[0]?.role?.name?.toLowerCase();
    if (role !== "super admin") {
      throw new Error("Only Super Admin can run sales-control repair commands");
    }
  }

  async rebuildFromSource(salesId: number, authorId: number) {
    await this.requireSuperAdmin(authorId);
    await this.db.$transaction(async (tx) => {
      await updateSalesItemControlAction(tx as any, salesId);
      await updateSalesStatControlAction(tx as any, salesId);
    });
    const reconciliation = await this.reconcileOrder(salesId);
    return {
      ok: true,
      salesId,
      repairMode: "rebuildFromSource",
      reconciliation,
    };
  }

  async backfillHistoricalSalesControls(input: {
    authorId: number;
    salesIds?: number[];
    batchSize?: number;
    lastSalesId?: number;
  }) {
    await this.requireSuperAdmin(input.authorId);
    const batchSize = Math.max(1, Math.min(500, input.batchSize ?? 100));
    const salesIds = input.salesIds?.length
      ? input.salesIds
      : (
          await this.db.salesOrders.findMany({
            where: {
              deletedAt: null,
              type: "order",
              id: input.lastSalesId ? { gt: input.lastSalesId } : undefined,
            },
            select: {
              id: true,
            },
            orderBy: {
              id: "asc",
            },
            take: batchSize,
          })
        ).map((s) => s.id);
    const results = [];
    for (const salesId of salesIds) {
      results.push(await this.rebuildFromSource(salesId, input.authorId));
    }
    return {
      ok: true,
      processed: results.length,
      lastSalesId: salesIds.length ? salesIds[salesIds.length - 1] : null,
      results,
    };
  }

  async reconcileOrder(salesId: number) {
    const order = await getSalesItemControllablesInfoAction(this.db, salesId);
    const composed = composeControls(order as any);
    const expected = new Map<string, QtySnapshot>();

    for (const control of composed) {
      const rows =
        (control.create as any)?.qtyControls?.createMany?.data ||
        (control.update as any)?.qtyControls?.createMany?.data ||
        [];
      for (const row of rows) {
        expected.set(
          keyOf(control.uid, row.type),
          snapshotFromRow({
            qty: row.qty,
            lh: row.lh,
            rh: row.rh,
            total: row.total,
            itemTotal: row.itemTotal,
          }),
        );
      }
    }

    const persistedRows = await this.db.qtyControl.findMany({
      where: {
        itemControl: {
          salesId,
        },
        deletedAt: null,
      },
      select: {
        itemControlUid: true,
        type: true,
        qty: true,
        lh: true,
        rh: true,
        total: true,
        itemTotal: true,
      },
    });
    const persisted = new Map<string, QtySnapshot>();
    for (const row of persistedRows) {
      persisted.set(
        keyOf(row.itemControlUid, row.type),
        snapshotFromRow({
          qty: row.qty,
          lh: row.lh,
          rh: row.rh,
          total: row.total,
          itemTotal: row.itemTotal,
        }),
      );
    }

    const missing: string[] = [];
    const extra: string[] = [];
    const mismatched: Array<{
      key: string;
      expected: QtySnapshot;
      persisted: QtySnapshot;
    }> = [];

    for (const [key, expectedRow] of expected.entries()) {
      const persistedRow = persisted.get(key);
      if (!persistedRow) {
        missing.push(key);
        continue;
      }
      if (
        expectedRow.qty !== persistedRow.qty ||
        expectedRow.lh !== persistedRow.lh ||
        expectedRow.rh !== persistedRow.rh ||
        expectedRow.total !== persistedRow.total ||
        expectedRow.itemTotal !== persistedRow.itemTotal
      ) {
        mismatched.push({
          key,
          expected: expectedRow,
          persisted: persistedRow,
        });
      }
    }

    for (const key of persisted.keys()) {
      if (!expected.has(key)) extra.push(key);
    }

    const driftDetected = !!(missing.length || extra.length || mismatched.length);
    return {
      ok: true,
      salesId,
      driftDetected,
      summary: {
        expectedCount: expected.size,
        persistedCount: persisted.size,
        missingCount: missing.length,
        extraCount: extra.length,
        mismatchCount: mismatched.length,
      },
      diff: {
        missing,
        extra,
        mismatched,
      },
    };
  }
}
