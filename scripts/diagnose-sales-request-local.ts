import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@gnd/db";
import { getSalesRequestConfigurationContext } from "../apps/api/src/services/sales-request-configuration-context";
import { createSalesRequestProvider, generateNewSalesFormSeed } from "../apps/api/src/services/sales-request-generation";

// Local diagnostics only: captures bounded manual-preview calls, never approves a benchmark.
const caseId = process.argv[2];
if (!caseId || !/^[a-z0-9-]+$/.test(caseId)) throw new Error("Provide a corpus case ID");
const target = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(target.hostname)) throw new Error("Local database required");
const root = resolve(import.meta.dir, "../.brain/evaluations/sales-request-generation");
const text = await readFile(resolve(root, "cases", caseId, "input.md"), "utf8");
const output = resolve(root, "runs", `local-diagnostic-${Date.now()}`, caseId);
await mkdir(output, { recursive: true });
const db = new PrismaClient();
try {
  const snapshot = await getSalesRequestConfigurationContext(db, { settingId: 3 });
  await writeFile(resolve(output, "configuration.json"), snapshot.configurationJson);
  let attempt = 0;
  const provider = createSalesRequestProvider({
    selection: { provider: "deepseek", model: "deepseek-flash" },
    maxRetries: 0,
    maxOutputRepairs: 1,
    onEvaluationCapture: async (capture) => {
      await writeFile(resolve(output, `response-${++attempt}.json`), JSON.stringify(capture, null, 2));
    },
  });
  try {
    const result = await generateNewSalesFormSeed({ text, images: [], configurationJson: snapshot.configurationJson, configurationRevision: snapshot.revision, signal: AbortSignal.timeout(45_000) }, provider);
    await writeFile(resolve(output, "seed.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ output, status: "validated", lines: result.seed.lineItems.length }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    await writeFile(resolve(output, "failure.json"), JSON.stringify({ message }, null, 2));
    console.log(JSON.stringify({ output, status: "failed", message }));
  }
} finally {
  await db.$disconnect();
}
