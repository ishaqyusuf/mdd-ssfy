import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assertSalesRequestEvaluationApproval,
	consumeSalesRequestEvaluationApproval,
	createSalesRequestEvaluationApprovalPacket,
} from "./approval";

const digest = "a".repeat(64);

function packetInput() {
	return {
		runId: "2026-09-13T-first-reviewed-case",
		caseId: "interior-solid-core-slabs",
		provider: "deepseek" as const,
		model: "deepseek-v4-flash",
		settingId: 3,
		configurationRevision: digest,
		promptVersion: "new-sales-form-seed-v6",
		outputContract: "new-sales-form-seed-v2" as const,
		serviceVocabularyRevision: digest,
		maxOutputTokens: 4_000,
		maxRetries: 0 as const,
		providerTimeoutMs: 45_000,
		artifacts: {
			configuration: "configuration",
			configurationSource: "configuration-source",
			factExpectations: "fact-expectations",
			modelInput: "model-input",
			providerOracle: "provider-oracle",
			providerRuntimeOptions: "provider-runtime-options",
			request: "request",
			seedOracle: "seed-oracle",
		},
	};
}

describe("sales request evaluation approval packet", () => {
	test("binds the exact case, provider, limits, and serialized artifacts", () => {
		const first = createSalesRequestEvaluationApprovalPacket(packetInput());
		const second = createSalesRequestEvaluationApprovalPacket(packetInput());
		const changed = createSalesRequestEvaluationApprovalPacket({
			...packetInput(),
			artifacts: { ...packetInput().artifacts, modelInput: "changed" },
		});

		expect(first).toEqual(second);
		expect(first.scope).toMatchObject({
			caseId: "interior-solid-core-slabs",
			provider: "deepseek",
			maxRetries: 0,
			approvedCallLimit: 1,
			imageEvaluation: "deferred",
		});
		expect(first.approvalDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(changed.approvalDigest).not.toBe(first.approvalDigest);
	});

	test("accepts only the reviewed digest and byte-identical archived packet", () => {
		const packet = createSalesRequestEvaluationApprovalPacket(packetInput());

		expect(
			assertSalesRequestEvaluationApproval({
				archivedPacket: structuredClone(packet),
				expectedPacket: packet,
				approvedDigest: packet.approvalDigest,
			}),
		).toEqual(packet);
	});

	test("rejects missing, mismatched, or tampered approval evidence", () => {
		const packet = createSalesRequestEvaluationApprovalPacket(packetInput());
		expect(() =>
			assertSalesRequestEvaluationApproval({
				archivedPacket: packet,
				expectedPacket: packet,
				approvedDigest: undefined,
			}),
		).toThrow("requires --approved-digest");
		expect(() =>
			assertSalesRequestEvaluationApproval({
				archivedPacket: packet,
				expectedPacket: packet,
				approvedDigest: `sha256:${"b".repeat(64)}`,
			}),
		).toThrow("does not match");
		expect(() =>
			assertSalesRequestEvaluationApproval({
				archivedPacket: {
					...packet,
					scope: { ...packet.scope, model: "different-model" },
				},
				expectedPacket: packet,
				approvedDigest: packet.approvalDigest,
			}),
		).toThrow("does not match");
	});

	test("allows exactly one concurrent consumer and preserves the burned approval", async () => {
		const directory = await mkdtemp(join(tmpdir(), "sales-request-approval-"));
		const path = join(directory, "approval-consumed.json");
		const packet = createSalesRequestEvaluationApprovalPacket(packetInput());
		const attempts = await Promise.allSettled([
			consumeSalesRequestEvaluationApproval({
				path,
				packet,
				now: new Date("2026-09-13T12:00:00.000Z"),
			}),
			consumeSalesRequestEvaluationApproval({
				path,
				packet,
				now: new Date("2026-09-13T12:00:01.000Z"),
			}),
		]);

		expect(
			attempts.filter(({ status }) => status === "fulfilled"),
		).toHaveLength(1);
		expect(attempts.filter(({ status }) => status === "rejected")).toHaveLength(
			1,
		);
		expect(await readFile(path, "utf8")).toContain(packet.approvalDigest);
	});
});
