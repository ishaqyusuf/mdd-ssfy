import { it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

it("uses locked canonical authority and fresh item capacity before a single assignment write", () => {
  const source = readFileSync(new URL("./create-sales-assignment.ts", import.meta.url), "utf8");
  assert.ok(source.includes('action: "production.assign"'));
  assert.ok(source.includes("expectedRevision: snapshot.revision"));
  assert.ok(source.includes("enforce: true"));
  assert.ok(source.indexOf("requireProductionAssignmentAuthority(actor)") < source.indexOf("const snapshot ="));
  const operation = source.slice(source.indexOf("const execution ="));
  assert.ok(operation.indexOf("getSaleInformation(tx") < operation.indexOf("assertProductionAssignmentQuantity(input.qty"));
  assert.ok(operation.indexOf("assertProductionAssignmentQuantity(input.qty") < operation.indexOf("await createSalesAssignment("));
});
