import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../index";
import {
	advanceSalesWorkflowCatalogRevision,
	getSalesWorkflowCatalogRevision,
	lockSalesWorkflowCatalogRevision,
} from "./sales-workflow-catalog-revision";

const enabled = process.env.SALES_CATALOG_REVISION_INTEGRATION_TEST === "1";
if (enabled) {
	const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
	if (
		target.protocol !== "mysql:" ||
		target.hostname !== "127.0.0.1" ||
		target.port !== "3307" ||
		target.pathname !== "/gnd-prisma2"
	) {
		throw new Error("Catalog revision integration tests require the verified local database");
	}
}

const db = createDatabaseClient();
const scopes: string[] = [];

function testScope() {
	const scope = `sales-catalog-test:${randomUUID()}`;
	scopes.push(scope);
	return scope;
}

afterAll(async () => {
	if (scopes.length) {
		await db.salesWorkflowCatalogRevision.deleteMany({
			where: { scope: { in: scopes } },
		});
	}
	await db.$disconnect();
});

describe.skipIf(!enabled)("sales workflow catalog revision", () => {
	it("does not publish a revision when its catalog transaction rolls back", async () => {
		const scope = testScope();
		expect(await getSalesWorkflowCatalogRevision(db, scope)).toBe(0);
		await expect(
			db.$transaction(async (tx) => {
				await advanceSalesWorkflowCatalogRevision(tx, scope);
				throw new Error("rollback");
			}),
		).rejects.toThrow("rollback");
		expect(await getSalesWorkflowCatalogRevision(db, scope)).toBe(0);
	});

	it("retains both increments from concurrent committed writes", async () => {
		const scope = testScope();
		await db.$transaction((tx) => advanceSalesWorkflowCatalogRevision(tx, scope));
		await Promise.all([
			db.$transaction((tx) => advanceSalesWorkflowCatalogRevision(tx, scope)),
			db.$transaction((tx) => advanceSalesWorkflowCatalogRevision(tx, scope)),
		]);
		expect(await getSalesWorkflowCatalogRevision(db, scope)).toBe(3);
	});

	it("serializes the final-save revision check with a concurrent catalog edit", async () => {
		const scope = testScope();
		await db.$transaction((tx) => advanceSalesWorkflowCatalogRevision(tx, scope));
		let releaseLock!: () => void;
		let signalLocked!: () => void;
		const locked = new Promise<void>((resolve) => { signalLocked = resolve; });
		const release = new Promise<void>((resolve) => { releaseLock = resolve; });
		const save = db.$transaction(async (tx) => {
			expect(await lockSalesWorkflowCatalogRevision(tx, scope)).toBe(1);
			signalLocked();
			await release;
		});
		await locked;
		let editCommitted = false;
		const edit = db.$transaction((tx) =>
			advanceSalesWorkflowCatalogRevision(tx, scope),
		).then((revision) => { editCommitted = true; return revision; });
		try {
			await new Promise((resolve) => setTimeout(resolve, 40));
			expect(editCommitted).toBe(false);
		} finally {
			releaseLock();
		}
		await save;
		expect(await edit).toBe(2);
	});
});
