import {expect, mock, test} from "bun:test";
import type {Db} from "@gnd/db";
const inventory = await import("@gnd/inventory/inbound");
let detailReads = 0;
mock.module("@gnd/inventory/inbound", () => ({...inventory, getInboundShipmentDetail: async () => {
 detailReads++;
 return {id: 7, items: [{id: 1, inboundDemands: [{lineItemComponentId: 10}, {lineItemComponentId: 20}]}, {id: 2, inboundDemands: [{lineItemComponentId: 20}]}]};
}}));
const {getProductionInboundOverview} = await import("./production-inbound");
function fixture(linked = true, assigned = true) {
 return {
 salesOrders: {findFirst: async () => ({id: 1})},
 orderItemProductionAssignments: {findMany: async () => assigned ? [{itemId: 3, salesDoorId: null, salesItemControlUid: "item-3", salesDoor: null}] : []},
 settings: {findFirst: async () => ({meta: {production: {workerCanReceiveInbound: false}}})},
 lineItemComponents: {findMany: async () => [{id: 10, parent: {salesItemId: 3}, inventoryVariant: {uid: "v1"}}]},
 inboundShipment: {findFirst: async () => linked ? {id: 7} : null},
 } as unknown as Db;
}
const actor = {id: 5, canViewAll: false, canEditInbound: false};
test("worker overview keeps assigned demands with receiving disabled", async () => {
 const result = await getProductionInboundOverview(fixture(), {salesOrderId: 1, inboundId: 7}, actor);
 expect(result.items).toHaveLength(1);
 expect(result.items[0]?.inboundDemands).toEqual([{lineItemComponentId: 10}]);
});
test("unlinked inbound rejects before detailed read", async () => {
 const before = detailReads;
 await expect(getProductionInboundOverview(fixture(false), {salesOrderId: 1, inboundId: 99}, actor)).rejects.toThrow("not linked");
 expect(detailReads).toBe(before);
});
test("removed assignment rejects before detailed read", async () => {
 const before = detailReads;
 await expect(getProductionInboundOverview(fixture(true, false), {salesOrderId: 1, inboundId: 7}, actor)).rejects.toThrow("No active assignment");
 expect(detailReads).toBe(before);
});
