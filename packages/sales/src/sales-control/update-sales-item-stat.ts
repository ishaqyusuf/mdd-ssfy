import { Qty, QtyControlType } from "@gnd/utils/sales";
import { Db } from "../types";
import { percent, sum } from "@gnd/utils";

interface Props {
  uid: string;
  salesId: number;
  type: QtyControlType;
  qty: Qty;
  itemTotal?: number;
}
export async function updateSalesItemStats(
  data: Props,
  tx: Db //= prisma,
) {
  const qtyControl = await tx.qtyControl.upsert({
    where: {
      itemControlUid_type: {
        itemControlUid: data.uid,
        type: data.type,
      },
    },
    create: {
      type: data.type,
      itemControlUid: data.uid,
      itemTotal: data.itemTotal,
    },
    update: {},
  });
  let { lh, rh, qty, percentage, itemTotal } = qtyControl;
  lh = sum([lh, data.qty.lh]);
  rh = sum([rh, data.qty.rh]);
  if (!data.qty.qty) data.qty.qty = sum([data.qty.lh, data.qty.rh]);
  qty = sum([qty, data.qty.qty]);
  percentage = percent(qty, itemTotal);
  await tx.qtyControl.update({
    where: {
      itemControlUid_type: {
        itemControlUid: data.uid,
        type: data.type,
      },
    },
    data: {
      rh,
      lh,
      percentage,
      qty,
    },
  });
}
