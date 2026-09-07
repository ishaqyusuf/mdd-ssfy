import { randomUUID } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { z } from "zod";
import type { Database, TransactionClient } from "@gnd/db";
import {
  classifyHistoricalCompletion, databaseTarget, digest,
  HISTORICAL_COMPLETION_POLICY, HISTORICAL_COMPLETION_REASON, migrationRequestId,
} from "./historical-dispatch-completion-policy";

const candidateSchema = z.object({
  salesOrderId: z.number().int().positive(), orderNo: z.string(),
  dispatchIds: z.array(z.number().int().positive()).min(1),
  effectiveAt: z.string().datetime().nullable(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  pipelineRevision: z.string().regex(/^[a-f0-9]{64}$/),
  completionRevision: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const historicalManifestSchema = z.object({
  contract: z.literal(HISTORICAL_COMPLETION_POLICY), batchId: z.string().uuid(),
  createdAt: z.string().datetime(),
  target: z.object({ environment: z.enum(["local", "production"]), identity: z.string(), fingerprint: z.string() }).strict(),
  candidates: z.array(candidateSchema),
  held: z.array(z.object({ salesOrderId: z.number(), orderNo: z.string(), reason: z.string(), dispatchIds: z.array(z.number()) })),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.candidates.map(c => c.salesOrderId)).size !== value.candidates.length)
    ctx.addIssue({ code: "custom", message: "Duplicate orders in manifest" });
});
type Candidate = z.infer<typeof candidateSchema>;

export function parseHistoricalArguments(argv: string[]) {
  const values: Record<string, string> = {};
  const allowed = new Set(["--environment", "--mode", "--output", "--manifest", "--actor-id", "--confirm-target", "--order-id"]);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]!; const value = argv[i + 1];
    if (!allowed.has(key) || !value || value.startsWith("--") || values[key]) throw new Error(`Invalid argument: ${key}`);
    values[key] = value;
  }
  const environment = values["--environment"] ?? "local";
  const mode = values["--mode"] ?? "preview";
  if (!["local", "production"].includes(environment) || !["preview", "apply", "recover", "verify"].includes(mode))
    throw new Error("Use environment local|production and mode preview|apply|recover|verify");
  if (!values["--output"]) throw new Error("--output is required (new file only)");
  if (mode !== "preview" && (!values["--manifest"] || (mode !== "verify" && !/^[1-9]\d*$/.test(values["--actor-id"] ?? ""))))
    throw new Error("Apply/recover requires --manifest and --actor-id");
  if (values["--manifest"] && resolve(values["--manifest"]) === resolve(values["--output"]))
    throw new Error("Manifest and output must differ");
  if (values["--order-id"] && (mode !== "preview" || !/^[1-9]\d*$/.test(values["--order-id"]))) throw new Error("--order-id is only a positive preview filter");
  return { orderId: values["--order-id"] ? Number(values["--order-id"]) : undefined, environment, mode, output: resolve(values["--output"]), manifest: values["--manifest"], actorId: Number(values["--actor-id"]), confirmTarget: values["--confirm-target"] };
}

export async function runHistoricalCompletion(argv: string[]) {
  const options = parseHistoricalArguments(argv);
  const root = resolve(import.meta.dir, "..");
  // Load only root base + the selected profile; inherited/Bun auto-loaded URLs
  // can never select the database for this migration.
  const profile = parse(await readFile(resolve(root, `.env.${options.environment}`), "utf8"));
  if (!profile.DATABASE_URL) throw new Error("Selected root profile must own DATABASE_URL");
  const target = databaseTarget(profile.DATABASE_URL, options.environment);
  const base = parse(await readFile(resolve(root, ".env"), "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return ""; throw error; }));
  Object.assign(process.env, base, profile, { DATABASE_URL: profile.DATABASE_URL });
  process.stdout.write(`${JSON.stringify({ mode: options.mode, target })}\n`);
  if (["apply", "recover"].includes(options.mode) && options.confirmTarget !== target.fingerprint)
    throw new Error("Apply/recover requires --confirm-target matching the printed fingerprint");

  const { db } = await import("@gnd/db");
  const { userHasPermission } = await import("@gnd/auth/utils");
  const { salesPipelineOrderSelect, getSalesPipelineSnapshots } = await import("@gnd/sales/sales-pipeline-order");
  const { refreshSalesOrderListProjections } = await import("@gnd/sales");
  const { getSalesCompletionProjection, buildSalesCompletionActiveKey, salesCompletionRecordSelect, resolveSalesCompletionProjectionFromOrder } = await import("@gnd/sales/sales-completion");
  const select = {
    ...salesPipelineOrderSelect,
    deliveries: { orderBy: { id: "asc" as const }, include: { items: { orderBy: { id: "asc" as const } }, stockAllocations: { orderBy: { id: "asc" as const } }, _count: { select: { stockAllocations: true } } } },
    completionRecords: { orderBy: { id: "asc" as const } },
    payments: { orderBy: { id: "asc" as const } },
    taxes: { orderBy: { id: "asc" as const } },
  };
  type Client = Database | TransactionClient;
  const readSource = async (client: Client, id: number) => {
    const source = await client.salesOrders.findUnique({ where: { id }, select });
    if (!source) throw new Error(`Order ${id} is missing`);
    return source;
  };
  const sourceHash = (source: Awaited<ReturnType<typeof readSource>>) => {
    const { completionRecords, ...operational } = source;
    return digest(operational);
  };
  const snapshotFor = async (client: Client, id: number) => {
    const snapshot = (await getSalesPipelineSnapshots(client, [id])).get(id);
    if (!snapshot) throw new Error(`Missing pipeline snapshot for ${id}`);
    return snapshot;
  };
  const output = await open(options.output, "wx", 0o600);
  const append = async (entry: unknown) => { await output.writeFile(`${JSON.stringify(entry)}\n`); await output.sync(); };
  try {
    if (options.mode === "preview") {
      const manifest: z.infer<typeof historicalManifestSchema> = { contract: HISTORICAL_COMPLETION_POLICY, batchId: randomUUID(), createdAt: new Date().toISOString(), target, candidates: [], held: [] };
      let cursor = 0;
      while (true) {
        const sources = await db.salesOrders.findMany({ where: { id: options.orderId ? { equals: options.orderId, gt: cursor } : { gt: cursor }, deletedAt: null, type: "order", deliveries: { some: { deletedAt: null } } }, select, orderBy: { id: "asc" }, take: 100 });
        if (!sources.length) break;
        const eligible = sources.filter(source => classifyHistoricalCompletion(source).eligible);
        const ids = eligible.map(source => source.id);
        // Use the existing canonical batch loader and completion resolver. This
        // keeps remote previews bounded to a few query groups per 100 orders.
        const [snapshots, completionRows] = await Promise.all([
          getSalesPipelineSnapshots(db, ids),
          ids.length ? db.salesOrders.findMany({ where: { id: { in: ids }, type: "order", deletedAt: null }, select: {
            id: true, orderId: true, createdAt: true, updatedAt: true, status: true, prodStatus: true,
            stat: { where: { deletedAt: null } },
            deliveries: { where: { deletedAt: null }, select: { status: true, meta: true, _count: { select: { items: true } } } },
            completionRecords: { orderBy: [{ recordedAt: "desc" }, { id: "desc" }], select: salesCompletionRecordSelect },
          } }) : Promise.resolve([]),
        ]);
        const completions = new Map(completionRows.map(row => [row.id, resolveSalesCompletionProjectionFromOrder(row)] as const));
        for (const source of sources) {
          const id = source.id;
          const classification = classifyHistoricalCompletion(source);
          if (!classification.dispatchIds.length) continue;
          if (!classification.eligible) {
            manifest.held.push({ salesOrderId: id, orderNo: source.orderId, reason: classification.reason, dispatchIds: classification.dispatchIds });
            continue;
          }
          const snapshot = snapshots.get(id);
          const completion = completions.get(id);
          if (!snapshot || !completion) throw new Error(`Order ${id} changed during preview`);
          manifest.candidates.push({ salesOrderId: id, orderNo: source.orderId, dispatchIds: classification.dispatchIds, effectiveAt: classification.effectiveAt, sourceHash: sourceHash(source), pipelineRevision: snapshot.revision, completionRevision: completion.revision });
        }
        cursor = sources.at(-1)!.id;
        process.stdout.write(`${JSON.stringify({ scannedThrough: cursor, candidates: manifest.candidates.length, held: manifest.held.length })}\n`);
      }
      historicalManifestSchema.parse(manifest);
      await output.writeFile(`${JSON.stringify(manifest, null, 2)}\n`); await output.sync();
      process.stdout.write(`${JSON.stringify({ candidates: manifest.candidates.length, held: manifest.held.length, output: options.output })}\n`);
      return;
    }
    const manifest = historicalManifestSchema.parse(JSON.parse(await readFile(resolve(options.manifest!), "utf8")));
    if (digest(manifest.target) !== digest(target)) throw new Error("Manifest database target mismatch");
    if (options.mode === "verify") {
      await append({ mode: "verify", target, batchId: manifest.batchId, manifestHash: digest(manifest) });
      let verified = 0;
      for (const candidate of manifest.candidates) {
        const source = await readSource(db, candidate.salesOrderId);
        const requestId = migrationRequestId(target.fingerprint, manifest.batchId, source.id);
        const record = source.completionRecords.find(r => r.requestId === requestId);
        const snapshot = await snapshotFor(db, source.id);
        const projection = await db.salesOrderListProjection.findUnique({ where: { salesOrderId: source.id } });
        const audited = await db.salesHistory.count({ where: { salesId: source.id, data: { path: "$.requestId", equals: requestId } } });
        if (sourceHash(source) !== candidate.sourceHash || !record || record.state !== "ACTIVE" || record.completionMethod !== "STATUS_ONLY" ||
          record.effectiveAt?.toISOString() !== (candidate.effectiveAt ?? undefined) || audited < 2 ||
          snapshot.fulfillment.state !== "administratively_completed" || projection?.pipelineFulfillmentState !== "administratively_completed")
          throw new Error(`Order ${source.id} failed post-import verification`);
        await append({ salesOrderId: source.id, recordId: record.id, sourceUnchanged: true, audited: true, fulfillment: snapshot.fulfillment.state, status: "verified" });
        verified += 1;
      }
      await append({ status: "complete", verified });
      process.stdout.write(`${JSON.stringify({ verified, output: options.output })}\n`);
      return;
    }
    const actor = await db.users.findUnique({ where: { id: options.actorId }, select: { id: true, name: true } });
    const allowed = await userHasPermission(db, options.actorId, "editStatusOnlySalesCompletion") || await userHasPermission(db, options.actorId, "editOrders");
    if (!actor || !allowed) throw new Error("Actor lacks status-only completion permission");
    const actorInfo = { id: actor.id, name: actor.name || `User ${actor.id}` };
    await append({ contract: HISTORICAL_COMPLETION_POLICY, mode: options.mode, target, batchId: manifest.batchId, manifestHash: digest(manifest), actorId: actor.id, startedAt: new Date().toISOString() });
    for (const candidate of manifest.candidates) {
      const requestId = migrationRequestId(target.fingerprint, manifest.batchId, candidate.salesOrderId);
      try {
        const source = await readSource(db, candidate.salesOrderId);
        const owned = source.completionRecords.find(record => record.requestId === requestId);
        if (options.mode === "apply" && owned) {
          await append({ salesOrderId: source.id, requestId, recordId: owned.id, status: owned.state === "ACTIVE" ? "replayed" : "previously_cancelled" }); continue;
        }
        if (options.mode === "recover" && (!owned || owned.state === "CANCELLED")) {
          await append({ salesOrderId: source.id, requestId, status: owned ? (owned.cancellationRequestId === migrationRequestId(target.fingerprint, manifest.batchId, source.id, "recover") ? "already_recovered" : "cancelled_by_later_action") : "not_imported" }); continue;
        }
        const expectedSourceHash = options.mode === "recover" ? sourceHash(source) : candidate.sourceHash;
        if (sourceHash(source) !== expectedSourceHash) throw new Error("Operational source changed since preview; generate a new preview");
        const completion = await getSalesCompletionProjection(db, { salesOrderId: source.id });
        if (options.mode === "apply") {
          if (!classifyHistoricalCompletion(source).eligible || completion.revision !== candidate.completionRevision || (await snapshotFor(db, source.id)).revision !== candidate.pipelineRevision)
            throw new Error("Completion/lifecycle changed since preview");
        } else if (!owned || owned.completionMethod !== "STATUS_ONLY" || source.completionRecords.some(r => r.state === "ACTIVE" && r.milestone === "FULFILLMENT_COMPLETED" && r.id !== owned.id)) {
          throw new Error("Recovery cannot cancel a completion owned by another action");
        }
        await append({ status: "prepared", candidate, requestId, expectedSourceHash, beforeCompletionRecords: source.completionRecords });
        const refreshListProjection = async (tx: TransactionClient, salesOrderId: number) => {
          const after = await readSource(tx, salesOrderId);
          if (sourceHash(after) !== expectedSourceHash) throw new Error("Operational source changed; rolling back completion");
          const imported = after.completionRecords.find(r => r.requestId === requestId);
          if (!imported || (options.mode === "recover" && imported.state !== "CANCELLED")) throw new Error("Migration record identity mismatch");
          await tx.salesHistory.create({ data: { salesId: salesOrderId, name: options.mode === "apply" ? "Historical shortcut completion imported" : "Historical shortcut import recovered", authorName: actorInfo.name, data: { event: "HISTORICAL_DISPATCH_COMPLETION_MIGRATION", policy: HISTORICAL_COMPLETION_POLICY, batchId: manifest.batchId, targetFingerprint: target.fingerprint, requestId, recordId: imported.id, dispatchIds: candidate.dispatchIds, sourceHash: candidate.sourceHash, effectiveAt: candidate.effectiveAt, originalCompletionActor: null, originalCompletionActorKnown: false, action: options.mode, migrationActorId: actor.id } } });
          const snapshot = (await getSalesPipelineSnapshots(tx, [salesOrderId])).get(salesOrderId);
          if (!snapshot?.freshness.evidenceUpdatedAt) throw new Error("Missing post-write pipeline revision");
          const refreshed = await refreshSalesOrderListProjections(tx, [{ salesOrderId, sourceUpdatedAt: new Date(snapshot.freshness.evidenceUpdatedAt) }]);
          if (refreshed.persisted !== 1 || refreshed.skippedAsStale) throw new Error("Projection refresh failed");
        };
        // Dedicated migration boundary: the user's historical classification is
        // authoritative here. Ordinary interactive transition policy is unchanged.
        const result = await db.$transaction(async (tx) => {
          const current = await readSource(tx, source.id);
          if (sourceHash(current) !== expectedSourceHash) throw new Error("Operational source changed during import");
          const currentProjection = await getSalesCompletionProjection(tx, { salesOrderId: source.id });
          if (currentProjection.revision !== completion.revision) throw new Error("Completion changed during import");
          const now = new Date();
          let record;
          if (options.mode === "apply") {
            if (!classifyHistoricalCompletion(current).eligible || (await snapshotFor(tx, source.id)).revision !== candidate.pipelineRevision)
              throw new Error("Historical candidate changed during import");
            record = await tx.salesCompletionRecord.create({ data: {
              requestId, salesOrderId: source.id, milestone: "FULFILLMENT_COMPLETED",
              completionMethod: "STATUS_ONLY", state: "ACTIVE",
              activeKey: buildSalesCompletionActiveKey({ salesOrderId: source.id, milestone: "FULFILLMENT_COMPLETED" }),
              effectiveAt: candidate.effectiveAt ? new Date(candidate.effectiveAt) : null,
              recordedAt: now, recordedById: actor.id,
            } });
          } else {
            const active = current.completionRecords.find(r => r.state === "ACTIVE" && r.milestone === "FULFILLMENT_COMPLETED");
            if (!active || active.requestId !== requestId || active.completionMethod !== "STATUS_ONLY")
              throw new Error("Recovery record changed during transaction");
            record = await tx.salesCompletionRecord.update({ where: { id: active.id }, data: {
              state: "CANCELLED", activeKey: null,
              cancellationRequestId: migrationRequestId(target.fingerprint, manifest.batchId, source.id, "recover"),
              cancelledAt: now, cancelledById: actor.id,
              cancellationReason: `Recovery of historical completion migration ${manifest.batchId}`,
            } });
          }
          await tx.salesHistory.create({ data: { salesId: source.id,
            name: options.mode === "apply" ? "Fulfillment completed — status only" : "Fulfillment status-only completion cancelled",
            authorName: actorInfo.name, data: {
              event: options.mode === "apply" ? "SALES_COMPLETION_MARKED" : "SALES_COMPLETION_CANCELLED",
              recordId: record.id, requestId: options.mode === "apply" ? requestId : record.cancellationRequestId,
              milestone: "FULFILLMENT_COMPLETED", completionMethod: "STATUS_ONLY",
              reason: HISTORICAL_COMPLETION_REASON, recordedAt: now.toISOString(),
              effectiveAt: candidate.effectiveAt, actorId: actor.id,
              historicalMigration: { policy: HISTORICAL_COMPLETION_POLICY, batchId: manifest.batchId, sourceHash: candidate.sourceHash },
            },
          } });
          await refreshListProjection(tx, source.id);
          return { record };
        }, { isolationLevel: "Serializable", timeout: 30000 });
        await append({ salesOrderId: source.id, requestId, recordId: result.record.id, status: options.mode === "apply" ? "imported" : "recovered", sourceHash: candidate.sourceHash });
      } catch (error) {
        await append({ salesOrderId: candidate.salesOrderId, requestId, status: "failed", error: error instanceof Error ? error.message : "Unknown failure" });
        throw error;
      }
    }
    await append({ status: "complete", completedAt: new Date().toISOString() });
  } finally { await output.close(); await db.$disconnect(); }
}
if (import.meta.main) await runHistoricalCompletion(process.argv.slice(2));
