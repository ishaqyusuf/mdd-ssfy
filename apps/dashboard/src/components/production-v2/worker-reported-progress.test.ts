import {test} from "bun:test";
import assert from "node:assert/strict";
function expect(actual: Record<string, unknown>) {
 return { toMatchObject(expected: Record<string, unknown>) {
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value);
 } };
}
import {getWorkerReportedProgress} from "./worker-reported-progress";
for (const reviewStatus of ["PENDING","APPROVED",null]) test(`worker reports completed submission for ${reviewStatus}`,()=>{
 expect(getWorkerReportedProgress([{assignedQty:4,submissions:[{qty:4,reviewStatus}]}])).toMatchObject({reportedQty:4,isCompleted:true,label:"4/4 submitted"});
});
test("rejected and cancelled submissions cannot complete worker progress",()=>{
 expect(getWorkerReportedProgress([{assignedQty:4,submissions:[{qty:4,reviewStatus:"REJECTED"},{qty:4,reviewStatus:"CANCELLED"},{qty:1,reviewStatus:"PENDING"}]}])).toMatchObject({reportedQty:1,isCompleted:false,label:"1/4 submitted"});
});
test("excess on one assignment cannot cover another assignment",()=>{
 expect(getWorkerReportedProgress([{assignedQty:2,submissions:[{qty:4}]},{assignedQty:2,submissions:[]}])).toMatchObject({reportedQty:2,isCompleted:false,label:"2/4 submitted"});
});
test("empty or invalid quantities do not claim completion",()=>{
 expect(getWorkerReportedProgress([])).toMatchObject({isCompleted:false,label:"No assigned qty"});
 expect(getWorkerReportedProgress([{assignedQty:2,submissions:[{qty:NaN},{qty:-1}]}])).toMatchObject({reportedQty:0,isCompleted:false});
});
