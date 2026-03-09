import type { Db } from "../../types";
import type { QtyControlType } from "../../types";

export type QtyControlRow = {
  itemControlUid: string;
  type: QtyControlType;
  qty: number | null;
  lh: number | null;
  rh: number | null;
};

export type ControlItemRow = {
  uid: string;
  salesId: number;
  produceable: boolean;
  shippable: boolean;
};

export type PackedDeliveryRow = {
  orderId: number;
  orderDeliveryId: number | null;
  qty: number;
  lhQty: number | null;
  rhQty: number | null;
  packingStatus: string | null;
};

export class ControlRepository {
  constructor(private readonly db: Db) {}

  async getControlsForOrders(orderIds: number[]): Promise<ControlItemRow[]> {
    if (!orderIds.length) return [];
    const rows = await this.db.salesItemControl.findMany({
      where: {
        salesId: { in: orderIds },
        deletedAt: null,
      },
      select: {
        uid: true,
        salesId: true,
        produceable: true,
        shippable: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      produceable: !!row.produceable,
      shippable: !!row.shippable,
    }));
  }

  async getQtyControls(controlUids: string[]): Promise<QtyControlRow[]> {
    if (!controlUids.length) return [];
    return this.db.qtyControl.findMany({
      where: {
        itemControlUid: { in: controlUids },
        deletedAt: null,
      },
      select: {
        itemControlUid: true,
        type: true,
        qty: true,
        lh: true,
        rh: true,
      },
    }) as Promise<QtyControlRow[]>;
  }
}
