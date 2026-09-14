import {expect,it} from "bun:test";
import {salesInventoryVerificationActivity} from "./sales-inventory";
it("keeps resolved inventory sync warnings neutral instead of promoting transport success",()=>{
 const invocation=salesInventoryVerificationActivity("owner").describe({salesOrderId:1});
 expect(invocation.resolve({projection:{status:"ready"}})[0]?.phase).toBe("success");
 expect(invocation.resolve({projection:{status:"failed"}})[0]?.phase).toBe("review-required");
 expect(invocation.resolve({projection:{status:"syncing"}})[0]?.phase).toBe("unknown");
});
