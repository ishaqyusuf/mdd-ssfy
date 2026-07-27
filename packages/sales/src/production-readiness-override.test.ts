import { describe, expect, it, mock } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import {
	type ProductionReadinessOverrideEvidence,
	buildProductionReadinessProjection,
	persistProductionReadinessOverride,
} from "./production-readiness-override";
import { buildSalesProductionPlan } from "./sales-fulfillment-plan";

function requireRevision(revision: string | null) {
	expect(revision).toMatch(/^[a-f0-9]{64}$/);
	if (!revision) throw new Error("Expected a production readiness revision.");
	return revision;
}

function awaitingInboundPlan(
	receivedQty = 0,
	inboundShipmentItemId: number | null = null,
) {
	return buildSalesProductionPlan([
		{
			id: 1,
			uid: "line-1",
			title: "Entry Door",
			qty: 2,
			components: [
				{
					id: 10,
					required: true,
					qty: 2,
					stockAllocations: [{ qty: 1, status: "reserved" }],
					inboundDemands: [
						{
							id: 100,
							qty: 1,
							qtyReceived: receivedQty,
							status: "ordered",
							inboundShipmentItemId,
						},
					],
				},
			],
		},
	]);
}

describe("buildProductionReadinessProjection", () => {
	it("offers a confirmation for configured inventory that is still awaiting inbound", () => {
		const projection = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override: null,
			readOnly: false,
		});

		expect(projection).toMatchObject({
			state: "blocked",
			canOverride: true,
			summary: {
				blockedComponentCount: 1,
				openInboundQty: 1,
			},
		});
		expect(projection.revision).toMatch(/^[a-f0-9]{64}$/);
		expect(projection.blockers[0]).toMatchObject({
			componentId: 10,
			lineTitle: "Entry Door",
			reason: "awaiting_inbound",
		});
	});

	it("accepts only an active override for the exact current inventory revision", () => {
		const blocked = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override: null,
			readOnly: false,
		});
		const override: ProductionReadinessOverrideEvidence = {
			status: "ACTIVE",
			revision: blocked.revision,
			confirmedAt: new Date("2026-07-27T10:00:00.000Z"),
			confirmedBy: { id: 42, name: "Production Admin" },
		};

		const projection = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override,
			readOnly: false,
		});

		expect(projection).toMatchObject({
			state: "overridden",
			canOverride: false,
			override: {
				status: "ACTIVE",
				confirmedBy: { id: 42, name: "Production Admin" },
			},
		});
	});

	it("invalidates an override when inventory evidence changes", () => {
		const original = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override: null,
			readOnly: false,
		});
		const staleOverride: ProductionReadinessOverrideEvidence = {
			status: "ACTIVE",
			revision: original.revision,
			confirmedAt: new Date("2026-07-27T10:00:00.000Z"),
			confirmedBy: { id: 42, name: "Production Admin" },
		};

		const changed = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(0.5),
			override: staleOverride,
			readOnly: false,
		});

		expect(changed.revision).not.toBe(original.revision);
		expect(changed.state).toBe("blocked");
		expect(changed.override).toBeNull();
	});

	it("invalidates an override when canonical inbound linkage changes", () => {
		const original = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override: null,
			readOnly: false,
		});
		const linked = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(0, 55),
			override: {
				status: "ACTIVE",
				revision: original.revision,
				confirmedAt: new Date("2026-07-27T10:00:00.000Z"),
				confirmedBy: { id: 42, name: "Production Admin" },
			},
			readOnly: false,
		});

		expect(linked.revision).not.toBe(original.revision);
		expect(linked.state).toBe("blocked");
		expect(linked.override).toBeNull();
	});

	it("does not permit overrides when inventory components are not configured", () => {
		const projection = buildProductionReadinessProjection({
			plan: buildSalesProductionPlan([]),
			override: null,
			readOnly: false,
		});

		expect(projection).toMatchObject({
			state: "not_configured",
			canOverride: false,
			revision: null,
		});
	});

	it("keeps terminal orders read-only even if the inventory evidence is blocked", () => {
		const projection = buildProductionReadinessProjection({
			plan: awaitingInboundPlan(),
			override: null,
			readOnly: true,
		});

		expect(projection).toMatchObject({
			state: "read_only",
			canOverride: false,
		});
	});
});

describe("persistProductionReadinessOverride", () => {
	it("persists confirmation and audit evidence in the provided transaction", async () => {
		const plan = awaitingInboundPlan();
		const projection = buildProductionReadinessProjection({
			plan,
			override: null,
			readOnly: false,
		});
		const upsert = mock(async () => ({}));
		const createHistory = mock(async () => ({}));
		const tx = {
			salesProductionReadinessOverride: {
				upsert,
			},
			salesHistory: {
				create: createHistory,
			},
		};

		const result = await persistProductionReadinessOverride(
			tx as unknown as TransactionClient,
			{
				salesOrderId: 99,
				expectedRevision: requireRevision(projection.revision),
				action: "confirm",
				actor: { id: 42, name: "Production Admin" },
			},
			{
				order: {
					id: 99,
					orderId: "ORDER-99",
					status: "pending",
					prodStatus: "pending",
				},
				plan,
				projection,
			},
		);

		expect(result.outcome).toBe("confirmed");
		expect(result.readiness.state).toBe("overridden");
		expect(upsert).toHaveBeenCalledTimes(1);
		expect(upsert.mock.calls[0]?.[0]).toMatchObject({
			where: { salesOrderId: 99 },
			create: {
				salesOrderId: 99,
				status: "ACTIVE",
				revision: projection.revision,
				confirmedByUserId: 42,
			},
			update: {
				status: "ACTIVE",
				revision: projection.revision,
				confirmedByUserId: 42,
				revokedByUserId: null,
				revokedAt: null,
			},
		});
		expect(createHistory).toHaveBeenCalledTimes(1);
		expect(createHistory.mock.calls[0]?.[0]).toMatchObject({
			data: {
				salesId: 99,
				name: "Production inventory readiness override confirmed",
				authorName: "Production Admin",
				data: {
					event: "production_readiness_override_confirmed",
					actorUserId: 42,
					revision: projection.revision,
				},
			},
		});
	});

	it("does not persist a stale confirmation", async () => {
		const plan = awaitingInboundPlan();
		const projection = buildProductionReadinessProjection({
			plan,
			override: null,
			readOnly: false,
		});
		const upsert = mock(async () => ({}));
		const createHistory = mock(async () => ({}));

		const result = await persistProductionReadinessOverride(
			{
				salesProductionReadinessOverride: { upsert },
				salesHistory: { create: createHistory },
			} as unknown as TransactionClient,
			{
				salesOrderId: 99,
				expectedRevision: "stale-revision",
				action: "confirm",
				actor: { id: 42, name: "Production Admin" },
			},
			{
				order: {
					id: 99,
					orderId: "ORDER-99",
					status: "pending",
					prodStatus: "pending",
				},
				plan,
				projection,
			},
		);

		expect(result.outcome).toBe("stale");
		expect(upsert).not.toHaveBeenCalled();
		expect(createHistory).not.toHaveBeenCalled();
	});
});
