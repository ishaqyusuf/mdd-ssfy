import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";
import { databaseTarget } from "./historical-dispatch-completion-policy";

const enabled = process.env.GND_MIGRATION_TEST_LOCAL === "1";
test.skipIf(!enabled)("local migration imports once, refuses stale source, recovers only its own records, and preserves operational data", async () => {
  const profile = parse(await readFile(join(import.meta.dir, "../.env.local"), "utf8"));
  const target = databaseTarget(profile.DATABASE_URL!, "local");
  process.env.DATABASE_URL = profile.DATABASE_URL;
  const { db } = await import("@gnd/db");
  const work = await mkdtemp(join(tmpdir(), "gnd-historical-migration-"));
  const name = `migration-test-${randomUUID()}`;
  const order = await db.salesOrders.create({ data: { orderId: name, slug: name, type: "order", status: "pending", deliveries: { create: { status: "completed", deliveryMode: "pickup", meta: {} } } }, select: { id: true } });
  const extraOrders: { id: number }[] = [];
  for (let i = 0; i < 19; i += 1) extraOrders.push(await db.salesOrders.create({ data: { orderId: `${name}-${i}`, slug: `${name}-${i}`, type: "order", status: "pending", deliveries: { create: { status: "completed", deliveryMode: "pickup", meta: {} } } }, select: { id: true } }));
  const fixtureIds = [order.id, ...extraOrders.map(row => row.id)];
  const run = async (mode: string, label: string, manifest?: string, previewId = order.id) => {
    const args = ["bun", join(import.meta.dir, "historical-dispatch-completion.ts"), "--environment", "local", "--mode", mode, "--output", join(work, label)];
    if (manifest) args.push("--manifest", manifest, "--actor-id", "1", "--confirm-target", target.fingerprint);
    else args.push("--order-id", String(previewId));
    const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { code, stdout, stderr, output: join(work, label) };
  };
  const operational = () => db.salesOrders.findUnique({ where: { id: order.id }, include: { deliveries: { include: { items: true, stockAllocations: true } }, payments: true, taxes: true, stat: true, itemControls: true } });
  try {
    const before = await operational();
    const preview = await run("preview", "preview.json"); expect(preview.code).toBe(0);
    const manifest = JSON.parse(await readFile(preview.output, "utf8"));
    expect(manifest.candidates.map((row: { salesOrderId: number }) => row.salesOrderId)).toEqual([order.id]);
    for (const extra of extraOrders) {
      const extraPreview = await run("preview", `preview-${extra.id}.json`, undefined, extra.id);
      expect(extraPreview.code, extraPreview.stderr).toBe(0);
      manifest.candidates.push(...JSON.parse(await readFile(extraPreview.output, "utf8")).candidates);
    }
    const staleBatchPath = join(work, "stale-batch.json");
    await writeFile(staleBatchPath, JSON.stringify({ ...manifest, candidates: manifest.candidates.map((candidate: { sourceHash: string }, index: number) => index === 4 ? { ...candidate, sourceHash: "0".repeat(64) } : candidate) }));
    const refusedBatch = await run("apply", "stale-batch.jsonl", staleBatchPath);
    expect(refusedBatch.code).not.toBe(0);
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: { in: fixtureIds } } })).toBe(0);
    expect(await db.salesHistory.count({ where: { salesId: { in: fixtureIds } } })).toBe(0);
    await writeFile(preview.output, JSON.stringify(manifest));
    const typeFixtureId = extraOrders[0]!.id;
    const typeFixture = await db.salesOrders.findUniqueOrThrow({ where: { id: typeFixtureId }, select: { updatedAt: true } });
    await db.salesOrders.update({ where: { id: typeFixtureId }, data: { type: "quote", updatedAt: typeFixture.updatedAt } });
    const typeRejected = await run("apply", "type-changed.jsonl", preview.output);
    expect(typeRejected.code).not.toBe(0);
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: { in: fixtureIds } } })).toBe(0);
    await db.salesOrders.update({ where: { id: typeFixtureId }, data: { type: "order", updatedAt: typeFixture.updatedAt } });
    const apply = await run("apply", "apply.jsonl", preview.output); expect(apply.code, apply.stderr).toBe(0);
    expect(await operational()).toEqual(before);
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: { in: fixtureIds } } })).toBe(20);
    const entries = (await readFile(apply.output, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    expect(entries.filter(row => row.status === "ledger_committed")).toHaveLength(20);
    expect(entries.filter(row => row.status === "imported")).toHaveLength(20);
    const records = await db.salesCompletionRecord.findMany({ where: { salesOrderId: order.id } });
    expect(records).toHaveLength(1); expect(records[0]!.completionMethod).toBe("STATUS_ONLY");
    const projection = await db.salesOrderListProjection.findUnique({ where: { salesOrderId: order.id } });
    expect(projection?.pipelineFulfillmentState).toBe("administratively_completed");
    const verified = await run("verify", "verify.jsonl", preview.output); expect(verified.code, verified.stderr).toBe(0);
    expect(await readFile(verified.output, "utf8")).toContain('"verified":20');
    const otherManifest = join(work, "other-manifest.json");
    await writeFile(otherManifest, JSON.stringify({ ...manifest, batchId: randomUUID() }));
    const unrelatedRecovery = await run("recover", "unrelated-recovery.jsonl", otherManifest);
    expect(unrelatedRecovery.code).toBe(0);
    expect(await readFile(unrelatedRecovery.output, "utf8")).toContain('"status":"not_imported"');
    expect((await db.salesCompletionRecord.findUnique({ where: { id: records[0]!.id } }))?.state).toBe("ACTIVE");
    // Simulate interruption after ledger commit but before projection refresh.
    await db.salesOrderListProjection.deleteMany({ where: { salesOrderId: order.id } });
    const replay = await run("apply", "replay.jsonl", preview.output); expect(replay.code).toBe(0);
    expect(await readFile(replay.output, "utf8")).toContain('"status":"replayed"');
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: order.id } })).toBe(1);
    expect((await db.salesOrderListProjection.findUnique({ where: { salesOrderId: order.id } }))?.pipelineFulfillmentState).toBe("administratively_completed");
    expect(await db.salesHistory.count({ where: { salesId: order.id } })).toBe(2);
    await db.orderDelivery.updateMany({ where: { salesOrderId: order.id }, data: { meta: { laterOperationalNote: "preserve this" } } });
    const recoveryBaseline = await operational();
    const recover = await run("recover", "recover.jsonl", preview.output); expect(recover.code, recover.stderr).toBe(0);
    expect(await operational()).toEqual(recoveryBaseline);
    expect((await db.salesCompletionRecord.findUnique({ where: { id: records[0]!.id } }))?.state).toBe("CANCELLED");
    const again = await run("recover", "recover-again.jsonl", preview.output); expect(again.code).toBe(0);
    expect(await readFile(again.output, "utf8")).toContain('"status":"already_recovered"');
    expect(await db.salesHistory.count({ where: { salesId: order.id } })).toBe(4);
    // A separate candidate previews before a source edit; stale apply must not write a ledger row.
    await db.salesCompletionRecord.deleteMany({ where: { salesOrderId: order.id } });
    const stale = await run("preview", "stale-preview.json"); expect(stale.code).toBe(0);
    await db.orderDelivery.updateMany({ where: { salesOrderId: order.id }, data: { meta: { testSourceChanged: true } } });
    const rejected = await run("apply", "stale-apply.jsonl", stale.output); expect(rejected.code).not.toBe(0);
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: order.id } })).toBe(0);
  } finally {
    // Only the uniquely named disposable fixture and its own audit/projections.
    await db.$transaction(async tx => {
      await tx.salesHistory.deleteMany({ where: { salesId: { in: fixtureIds } } });
      await tx.salesCompletionRecord.deleteMany({ where: { salesOrderId: { in: fixtureIds } } });
      await tx.salesOrderListProjection.deleteMany({ where: { salesOrderId: { in: fixtureIds } } });
      await tx.orderDelivery.deleteMany({ where: { salesOrderId: { in: fixtureIds } } });
      await tx.salesOrders.deleteMany({ where: { id: { in: fixtureIds }, orderId: { startsWith: name } } });
    });
    await db.$disconnect();
  }
}, 120000);
