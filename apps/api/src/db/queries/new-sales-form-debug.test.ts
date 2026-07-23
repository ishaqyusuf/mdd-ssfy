import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	captureNewSalesFormSavePayload,
	logNewSalesFormSaveDiagnostic,
} from "./new-sales-form-debug";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("captureNewSalesFormSavePayload", () => {
	it("writes dev save payloads under a date folder", async () => {
		const rootDir = await createTempWorkspaceRoot();
		const capturedAt = new Date("2026-06-24T12:34:56.789Z");

		const filePath = await captureNewSalesFormSavePayload(
			{
				action: "save-final",
				userId: 42,
				requestId: "trpc-request-1",
				payload: {
					clientRequestId: "mobile-save-1",
					type: "order",
					salesId: null,
					slug: null,
					autosave: false,
					lineItems: [{ uid: "line-1", title: "Door" }],
					extraCosts: [{ label: "Delivery", amount: 25 }],
				},
			},
			{
				nodeEnv: "development",
				rootDir,
				now: capturedAt,
			},
		);

		expect(filePath).toContain("debug/new-sales-form-save-payloads/2026-06-24");

		const files = await readdir(
			join(rootDir, "debug/new-sales-form-save-payloads/2026-06-24"),
		);
		expect(files).toHaveLength(1);
		expect(files[0]).toContain("save-final__order__new__mobile-save-1.json");
		if (!filePath) throw new Error("Expected payload capture path");

		const raw = await readFile(filePath, "utf8");
		const saved = JSON.parse(raw);
		expect(saved).toMatchObject({
			capturedAt: "2026-06-24T12:34:56.789Z",
			action: "save-final",
			nodeEnv: "development",
			userId: 42,
			requestId: "trpc-request-1",
			summary: {
				clientRequestId: "mobile-save-1",
				type: "order",
				salesId: null,
				slug: null,
				autosave: false,
				lineItemCount: 1,
				extraCostCount: 1,
			},
			payload: {
				type: "order",
				autosave: false,
			},
		});
	});

	it("keeps diagnostic logging development-only and stage-oriented", () => {
		const originalEnv = process.env.NODE_ENV;
		const originalInfo = console.info;
		const calls: unknown[][] = [];
		process.env.NODE_ENV = "production";
		console.info = (...args: unknown[]) => calls.push(args);

		logNewSalesFormSaveDiagnostic({
			action: "save-final",
			stage: "ingress",
			requestId: "request-1",
			clientRequestId: "mobile-save-1",
			payload: { type: "order", lineItems: [] },
		});

		expect(calls).toHaveLength(0);
		process.env.NODE_ENV = originalEnv;
		console.info = originalInfo;
	});

	it("does not write outside development mode", async () => {
		const rootDir = await createTempWorkspaceRoot();

		const filePath = await captureNewSalesFormSavePayload(
			{
				action: "save-draft",
				payload: { type: "quote", lineItems: [], extraCosts: [] },
			},
			{
				nodeEnv: "production",
				rootDir,
				now: new Date("2026-06-24T12:34:56.789Z"),
			},
		);

		expect(filePath).toBeNull();
		await expect(readdir(join(rootDir, "debug"))).rejects.toThrow();
	});
});

async function createTempWorkspaceRoot() {
	const rootDir = await mkdtemp(join(tmpdir(), "gnd-save-debug-"));
	tempRoots.push(rootDir);
	await writeFile(
		join(rootDir, "package.json"),
		JSON.stringify({ workspaces: ["apps/*", "packages/*"] }),
		"utf8",
	);
	await writeFile(join(rootDir, "brain"), "", "utf8");
	return rootDir;
}
