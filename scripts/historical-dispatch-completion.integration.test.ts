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
  const run = async (mode: string, label: string, manifest?: string) => {
    const args = ["bun", join(import.meta.dir, "historical-dispatch-completion.ts"), "--environment", "local", "--mode", mode, "--output", join(work, label)];
    if (manifest) args.push("--manifest", manifest, "--actor-id", "1", "--confirm-target", target.fingerprint);
    else args.push("--order-id", String(order.id));
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
    const apply = await run("apply", "apply.jsonl", preview.output); expect(apply.code, apply.stderr).toBe(0);
    expect(await operational()).toEqual(before);
    const records = await db.salesCompletionRecord.findMany({ where: { salesOrderId: order.id } });
    expect(records).toHaveLength(1); expect(records[0]!.completionMethod).toBe("STATUS_ONLY");
    const projection = await db.salesOrderListProjection.findUnique({ where: { salesOrderId: order.id } });
    expect(projection?.pipelineFulfillmentState).toBe("administratively_completed");
    const verified = await run("verify", "verify.jsonl", preview.output); expect(verified.code, verified.stderr).toBe(0);
    expect(await readFile(verified.output, "utf8")).toContain('"verified":1');
    const otherManifest = join(work, "other-manifest.json");
    await writeFile(otherManifest, JSON.stringify({ ...manifest, batchId: randomUUID() }));
    const unrelatedRecovery = await run("recover", "unrelated-recovery.jsonl", otherManifest);
    expect(unrelatedRecovery.code).toBe(0);
    expect(await readFile(unrelatedRecovery.output, "utf8")).toContain('"status":"not_imported"');
    expect((await db.salesCompletionRecord.findUnique({ where: { id: records[0]!.id } }))?.state).toBe("ACTIVE");
    const replay = await run("apply", "replay.jsonl", preview.output); expect(replay.code).toBe(0);
    expect(await readFile(replay.output, "utf8")).toContain('"status":"replayed"');
    expect(await db.salesCompletionRecord.count({ where: { salesOrderId: order.id } })).toBe(1);
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
      await tx.salesHistory.deleteMany({ where: { salesId: order.id } });
      await tx.salesCompletionRecord.deleteMany({ where: { salesOrderId: order.id } });
      await tx.salesOrderListProjection.deleteMany({ where: { salesOrderId: order.id } });
      await tx.orderDelivery.deleteMany({ where: { salesOrderId: order.id } });
      await tx.salesOrders.delete({ where: { id: order.id, orderId: name } });
    });
    await db.$disconnect();
  }
}, 120000);
