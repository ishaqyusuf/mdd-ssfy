import { expect, it } from "bun:test";
import { salesCompletionActivity } from "./sales-completion";

it("requires a matching newly committed status-only record", () => {
 const invocation = salesCompletionActivity("owner", "PRODUCTION_COMPLETED").describe({ salesOrderId: 1 });
 const record = { salesOrderId: 1, milestone: "PRODUCTION_COMPLETED", completionMethod: "STATUS_ONLY", state: "ACTIVE" };
 expect(invocation.resolve({record, idempotentReplay:false})[0]?.phase).toBe("success");
 expect(invocation.resolve({record, idempotentReplay:true})[0]?.phase).toBe("unknown");
 expect(invocation.resolve({record:{...record,salesOrderId:2},idempotentReplay:false})[0]?.phase).toBe("unknown");
 expect(invocation.resolve({record:{...record,completionMethod:"FULL_WORKFLOW"},idempotentReplay:false})[0]?.phase).toBe("unknown");
 expect(invocation.resolve({record:{...record,milestone:"FULFILLMENT_COMPLETED"},idempotentReplay:false})[0]?.phase).toBe("unknown");
});

it("distinguishes business cancellation from task transport cancellation", () => {
 const invocation = salesCompletionActivity("owner", "FULFILLMENT_COMPLETED", {cancel:true}).describe({salesOrderId:2});
 const record = {salesOrderId:2,milestone:"FULFILLMENT_COMPLETED",completionMethod:"STATUS_ONLY",state:"CANCELLED"};
 expect(invocation.resolve({record,idempotentReplay:false})[0]).toEqual({entityId:2,phase:"success",label:"Fulfillment status cancelled"});
 expect(invocation.resolve({record:{...record,state:"ACTIVE"},idempotentReplay:false})[0]?.phase).toBe("unknown");
});

it("settles bulk completion per unique item without promoting replay or skipped rows", () => {
 const ids = [1,2,3,4,5,6];
 const invocation=salesCompletionActivity("owner","PRODUCTION_COMPLETED",{batch:true}).describe({salesOrderIds:ids});
 ids.push(7);
 expect(invocation.entityIds).toEqual([1,2,3,4,5,6]);
 expect(invocation.resolve({items:[{salesOrderId:1,status:"completed"},{salesOrderId:2,status:"replayed"},{salesOrderId:3,status:"skipped"},{salesOrderId:4,status:"failed"},{salesOrderId:5,status:"completed"},{salesOrderId:5,status:"failed"}]}).map(row=>row.phase)).toEqual(["success","unknown","unknown","error","unknown","unknown"]);
});
