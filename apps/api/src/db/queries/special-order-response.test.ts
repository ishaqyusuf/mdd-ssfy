import { describe, expect, it } from "bun:test";

import { commitSpecialOrderResponse } from "./special-order-approval";

function responseHarness() {
	let status = "ACTIVE";
	let evidence: Record<string, unknown> | null = null;
	const evidenceRows: unknown[] = [];
	const activityRows: unknown[] = [];
	const documentRows: Array<Record<string, unknown>> = [];
	const request = {
		id: "request-1",
		status,
		expiresAt: new Date(Date.now() + 60_000),
		orderRevision: "revision-1",
		policyVersionId: "policy-1",
		sentToEmail: "customer@example.com",
		orderSnapshot: {
			lineItems: [{ uid: "line-1" }],
			summary: { grandTotal: 50 },
		},
		customerSnapshot: { id: 7, name: "Customer" },
		salespersonSnapshot: { id: 9, name: "Salesperson" },
		policyVersion: {
			title: "Special Order",
			acknowledgmentText: "I reviewed this order.",
			policyText: "Custom items cannot be returned.",
		},
		order: {
			id: 42,
			orderId: "S-42",
			meta: {},
			specialOrderDeclaration: "YES",
			specialOrderRevision: "revision-1",
			customer: {
				id: 7,
				name: "Customer",
				businessName: null,
				email: "customer@example.com",
			},
			salesRep: { id: 9, name: "Salesperson", email: "sales@example.com" },
		},
	};
	const tx = {
		specialOrderApprovalRequest: {
			findUnique: async () => ({ ...request, status, evidence }),
			updateMany: async () => {
				if (status !== "ACTIVE") {
					while (!evidence) await new Promise<void>(queueMicrotask);
					return { count: 0 };
				}
				status = "CONSUMED";
				return { count: 1 };
			},
		},
		storedDocument: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				documentRows.push(data);
				return data;
			},
		},
		specialOrderApprovalEvidence: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				evidence = {
					id: data.id,
					outcome: data.outcome,
					acknowledgedAt: new Date("2026-08-13T12:00:00.000Z"),
					declineReason: data.declineReason,
				};
				evidenceRows.push(data);
				return evidence;
			},
		},
		salesOrders: { update: async () => null },
		salesHistory: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				activityRows.push(data);
				return data;
			},
		},
	};
	return {
		evidenceRows,
		activityRows,
		documentRows,
		ctx: {
			db: {
				$transaction: async (run: (value: typeof tx) => unknown) => run(tx),
			},
		},
	};
}

describe("Special Order response transaction", () => {
	it("consumes a capability once and preserves one immutable decline outcome", async () => {
		const harness = responseHarness();
		const input = {
			token: "token",
			tokenHash: "hash",
			decision: "DECLINE" as const,
			declineReason: "Wrong handing",
			evidenceId: "evidence-1",
			signatureUpload: null,
			signatureBuffer: null,
		};
		const first = await commitSpecialOrderResponse(harness.ctx as never, input);
		const repeated = await commitSpecialOrderResponse(harness.ctx as never, {
			...input,
			evidenceId: "evidence-2",
		});
		expect(first).toMatchObject({ state: "COMPLETED", outcome: "DECLINED" });
		expect(repeated).toMatchObject({
			state: "COMPLETED",
			outcome: "DECLINED",
			notificationContext: null,
		});
		expect(harness.evidenceRows).toHaveLength(1);
		expect(harness.activityRows).toHaveLength(1);
	});

	it("commits only one outcome when approve and decline race", async () => {
		const harness = responseHarness();
		const [approval, decline] = await Promise.allSettled([
			commitSpecialOrderResponse(harness.ctx as never, {
				token: "token",
				tokenHash: "hash",
				decision: "APPROVE",
				acknowledged: true,
				printedName: "Customer Signer",
				evidenceId: "evidence-approved",
				signatureUpload: {
					url: "https://blob.example/encrypted-signature",
					downloadUrl: "https://blob.example/encrypted-signature?download=1",
					pathname: "special-order/evidence/evidence-approved/signature.enc",
					contentType: "application/octet-stream",
					contentDisposition: "inline",
				},
				signatureBuffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
			}),
			commitSpecialOrderResponse(harness.ctx as never, {
				token: "token",
				tokenHash: "hash",
				decision: "DECLINE",
				declineReason: "Wrong specification",
				evidenceId: "evidence-declined",
				signatureUpload: null,
				signatureBuffer: null,
			}),
		]);

		expect([approval.status, decline.status]).toEqual([
			"fulfilled",
			"fulfilled",
		]);
		if (approval.status === "fulfilled" && decline.status === "fulfilled") {
			expect(approval.value.outcome).toBe(decline.value.outcome);
		}
		expect(harness.evidenceRows).toHaveLength(1);
		expect(harness.activityRows).toHaveLength(1);
	});

	it("registers approved signature evidence as private without a public URL", async () => {
		const harness = responseHarness();
		await commitSpecialOrderResponse(harness.ctx as never, {
			token: "token",
			tokenHash: "hash",
			decision: "APPROVE",
			acknowledged: true,
			printedName: "Customer Signer",
			evidenceId: "evidence-private",
			signatureUpload: {
				url: "https://blob.example/private-signature",
				downloadUrl: "https://blob.example/private-signature?download=1",
				pathname: "special-order/evidence/evidence-private/signature.enc",
				contentType: "application/octet-stream",
				contentDisposition: "inline",
			},
			signatureBuffer: Buffer.from(
				Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
			),
		});
		expect(harness.documentRows).toHaveLength(1);
		expect(harness.documentRows[0]).toMatchObject({
			ownerType: "special-order-approval-evidence",
			ownerId: "evidence-private",
			provider: "vercel-blob-encrypted",
			visibility: "private",
			url: null,
			meta: {
				encryption: "aes-256-gcm-v1",
				blobAccess: "public",
			},
		});
	});
});
