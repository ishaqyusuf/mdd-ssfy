import { expect, test } from "bun:test";
import { historicalManifestSchema, parseHistoricalArguments } from "./historical-dispatch-completion";
import { HISTORICAL_COMPLETION_POLICY } from "./historical-dispatch-completion-policy";

test("defaults to local preview and requires explicit write inputs", () => {
  expect(parseHistoricalArguments(["--output", "preview.json"])).toMatchObject({ environment: "local", mode: "preview" });
  expect(() => parseHistoricalArguments(["--mode", "apply", "--output", "results.json"])).toThrow();
  expect(() => parseHistoricalArguments(["--output", "same.json", "--manifest", "same.json"])).toThrow();
  expect(() => parseHistoricalArguments(["--output", "x", "--unknown", "yes"])).toThrow();
});
test("manifest rejects duplicate orders and incomplete write evidence", () => {
  const candidate = { salesOrderId: 1, orderNo: "03389LM", dispatchIds: [451], effectiveAt: null, sourceHash: "a".repeat(64), pipelineRevision: "b".repeat(64), completionRevision: "c".repeat(64) };
  const manifest = { contract: HISTORICAL_COMPLETION_POLICY, batchId: "00000000-0000-4000-8000-000000000001", createdAt: "2026-09-07T12:00:00.000Z", target: { environment: "local", identity: "localhost:3306/gnd", fingerprint: "test" }, candidates: [candidate], held: [] };
  expect(historicalManifestSchema.safeParse(manifest).success).toBe(true);
  expect(historicalManifestSchema.safeParse({ ...manifest, candidates: [candidate, candidate] }).success).toBe(false);
  expect(historicalManifestSchema.safeParse({ ...manifest, candidates: [{ ...candidate, pipelineRevision: "" }] }).success).toBe(false);
});
