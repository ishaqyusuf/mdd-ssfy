import { describe, expect, it } from "bun:test";
import { composeSalesItemControlStat } from "./sales-control";

describe("historical assignment identity", () => {
  it("counts a placeholder UID only for its matching item", () => {
    const order = { id: 1, deliveries: [], assignments: [
      { id: 10, itemId: 43549, salesDoorId: null, shelfItemId: null, salesItemControlUid: "-", qtyAssigned: 1, lhQty: 1, rhQty: 0, submissions: [] },
      { id: 11, itemId: 43550, salesDoorId: null, shelfItemId: null, salesItemControlUid: "-", qtyAssigned: 1, lhQty: 1, rhQty: 0, submissions: [] },
    ] };
    const result = composeSalesItemControlStat({ order, itemId: 43549, doorId: null, shelfId: null, controlUid: "item-43549", qty: { qty: 1, noHandle: true }, itemConfig: { production: true } } as never);
    expect(result.assignment.pending.qty).toBe(0);
    expect(result.assignment.pending.lh).toBe(0);
    expect(result.assignment.pending.rh).toBe(0);
    expect(result.stats.prodAssigned.qty).toBe(1);
    expect(order.assignments[1]?.salesItemControlUid).toBe("-");
  });
});
