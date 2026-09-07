import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	buildAdministrativeReconciliationPlan,
	executeFailClosedSequentially,
	openExclusiveReconciliationOutput,
	resolveAdministrativeReconciliationPaths,
	writeAllAt,
} from "./sales-pipeline-administrative-reconcile";

const revision = "a".repeat(64);

describe("Sales Pipeline administrative reconciliation", () => {
	it("accepts only complete single-stage, revision-bound ready rows", () => {
		const plan = buildAdministrativeReconciliationPlan({
			contract: "sales-pipeline-source-reconciliation-audit/v1",
			mode: "read-only",
			unsafeOrders: 3,
			administrativeReadyOrders: [
				{
					salesOrderId: 3,
					orderNo: "SO-3",
					milestone: "production",
					canonicalRevision: revision,
					sourceGuard: {
						openProductionAssignments: 0,
						indeterminateProductionAssignments: 0,
						policyReadyMilestones: ["production"],
					},
					classification: "ready",
					reasons: [],
				},
				{
					salesOrderId: 2,
					orderNo: "SO-2",
					milestone: "fulfillment",
					canonicalRevision: revision,
					sourceGuard: {
						openProductionAssignments: 0,
						indeterminateProductionAssignments: 0,
						policyReadyMilestones: ["fulfillment"],
					},
					classification: "ready",
					reasons: [],
				},
			],
			safety: {
				writesPerformed: false,
				ambiguousRowsRequireOperatorReview: true,
			},
		});

		expect(plan).toEqual({
			production: [{ salesOrderId: 3, orderNo: "SO-3", revision }],
			fulfillment: [{ salesOrderId: 2, orderNo: "SO-2", revision }],
			total: 2,
			held: 1,
		});
	});

	it("refuses a mutable, malformed, duplicate, or non-ready source plan", () => {
		const base = {
			contract: "sales-pipeline-source-reconciliation-audit/v1",
			mode: "read-only",
			unsafeOrders: 1,
			administrativeReadyOrders: [
				{
					salesOrderId: 2,
					orderNo: "SO-2",
					milestone: "fulfillment",
					canonicalRevision: revision,
					sourceGuard: {
						openProductionAssignments: 0,
						indeterminateProductionAssignments: 0,
						policyReadyMilestones: ["fulfillment"],
					},
					classification: "ready",
					reasons: [],
				},
			],
			safety: {
				writesPerformed: false,
				ambiguousRowsRequireOperatorReview: true,
			},
		};
		const [baseRow] = base.administrativeReadyOrders;
		if (!baseRow) throw new Error("Expected a reconciliation fixture row");
		expect(() =>
			buildAdministrativeReconciliationPlan({ ...base, mode: "apply" }),
		).toThrow("read-only");
		expect(() =>
			buildAdministrativeReconciliationPlan({
				...base,
				unsafeOrders: 2,
				administrativeReadyOrders: [
					...base.administrativeReadyOrders,
					...base.administrativeReadyOrders,
				],
			}),
		).toThrow("duplicate");
		expect(() =>
			buildAdministrativeReconciliationPlan({
				...base,
				administrativeReadyOrders: [{ ...baseRow, canonicalRevision: "bad" }],
			}),
		).toThrow("revision");
		expect(() =>
			buildAdministrativeReconciliationPlan({
				...base,
				administrativeReadyOrders: [{ ...baseRow, sourceGuard: undefined }],
			}),
		).toThrow("source guard");
	});

	it("requires distinct source, report, and pre-write backup paths", () => {
		expect(() =>
			resolveAdministrativeReconciliationPaths({ applying: false }),
		).toThrow("source-file");
		expect(() =>
			resolveAdministrativeReconciliationPaths({
				applying: true,
				sourceFile: "/tmp/source.json",
				outputFile: "/tmp/report.json",
			}),
		).toThrow("backup-file");
		expect(() =>
			resolveAdministrativeReconciliationPaths({
				applying: true,
				sourceFile: "/tmp/source.json",
				outputFile: "/tmp/report.json",
				backupFile: "/tmp/report.json",
			}),
		).toThrow("distinct");
		expect(() =>
			resolveAdministrativeReconciliationPaths({
				applying: true,
				sourceFile: "/tmp/source.json",
				outputFile: "/tmp/report.json",
				backupFile: "/tmp/report.json.journal",
			}),
		).toThrow("distinct");
	});

	it("stops before the next row after the first failed write", async () => {
		const attempted: number[] = [];
		await expect(
			executeFailClosedSequentially([1, 2, 3], async (value) => {
				attempted.push(value);
				if (value === 2) throw new Error("write failed");
				return value;
			}),
		).rejects.toThrow("write failed");
		expect(attempted).toEqual([1, 2]);
	});

	it("refuses existing and symlinked report paths before writes", async () => {
		const directory = await mkdtemp(join(tmpdir(), "gnd-admin-reconcile-"));
		try {
			const existing = join(directory, "existing.json");
			const target = join(directory, "backup.json");
			const linked = join(directory, "report.json");
			await writeFile(existing, "existing");
			await writeFile(target, "backup");
			await symlink(target, linked);
			await expect(
				openExclusiveReconciliationOutput(existing),
			).rejects.toMatchObject({ code: "EEXIST" });
			await expect(
				openExclusiveReconciliationOutput(linked),
			).rejects.toMatchObject({ code: "EEXIST" });
			expect(await Bun.file(target).text()).toBe("backup");
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("completes short writes and rejects zero write progress", async () => {
		const offsets: number[] = [];
		const writer = {
			async write(
				_buffer: Uint8Array,
				_offset: number,
				length: number,
				position: number,
			) {
				offsets.push(position);
				return { bytesWritten: Math.min(2, length) };
			},
		};
		await writeAllAt(writer, Buffer.from("abcdef"), 4);
		expect(offsets).toEqual([4, 6, 8]);
		await expect(
			writeAllAt(
				{
					async write() {
						return { bytesWritten: 0 };
					},
				},
				Buffer.from("x"),
				0,
			),
		).rejects.toThrow("zero progress");
	});
});
