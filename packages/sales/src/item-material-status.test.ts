import { describe, expect, it } from "bun:test";

import {
	ITEM_MATERIAL_STATUS_VERSION,
	projectItemMaterialStatusForAudience,
	resolveItemMaterialStatus,
} from "./item-material-status";

const readyComponent = {
	componentId: 1,
	name: "Door slab",
	unit: "each",
	requiredQty: 2,
	receivedQty: 2,
	committedAllocatedQty: 2,
	pendingAllocationQty: 0,
	openInboundQty: 0,
	readiness: "ready_for_production" as const,
};

describe("resolveItemMaterialStatus", () => {
	it.each([
		{
			name: "approved material",
			input: { components: [readyComponent] },
			code: "material_ready",
			label: "MATERIAL READY",
		},
		{
			name: "ready evidence awaiting review convergence",
			input: { components: [readyComponent], reviewPending: true },
			code: "ready_review_pending",
			label: "READY · REVIEW PENDING",
		},
		{
			name: "received stock awaiting allocation approval",
			input: {
				components: [
					{
						...readyComponent,
						committedAllocatedQty: 0,
						pendingAllocationQty: 2,
						readiness: "allocation_review" as const,
					},
				],
			},
			code: "allocation_approval",
			label: "ALLOCATION APPROVAL",
		},
		{
			name: "open inbound coverage",
			input: {
				components: [
					{
						...readyComponent,
						receivedQty: 1,
						committedAllocatedQty: 1,
						openInboundQty: 1,
						readiness: "awaiting_inbound" as const,
					},
				],
			},
			code: "awaiting_inbound",
			label: "AWAITING INBOUND",
		},
		{
			name: "uncovered shortage",
			input: {
				components: [
					{
						...readyComponent,
						receivedQty: 0,
						committedAllocatedQty: 0,
						readiness: "blocked" as const,
					},
				],
			},
			code: "material_shortage",
			label: "MATERIAL SHORTAGE",
		},
	])("returns the approved badge for $name", ({ input, code, label }) => {
		const result = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "required",
			evidenceAvailable: true,
			reviewPending: false,
			...input,
		});

		expect(result.code).toBe(code);
		expect(result.label).toBe(label);
		expect(result.version).toBe(ITEM_MATERIAL_STATUS_VERSION);
		expect(result.evidenceRevision).toMatch(/^[a-f0-9]{64}$/);
	});

	it("distinguishes missing, unknown, explicit not-required, and eligibility conflict", () => {
		const base = { salesOrderId: 1, salesItemId: 10, reviewPending: false };
		expect(
			resolveItemMaterialStatus({
				...base,
				applicability: "required",
				evidenceAvailable: true,
				components: [],
			}).code,
		).toBe("setup_needed");
		expect(
			resolveItemMaterialStatus({
				...base,
				applicability: "unknown",
				evidenceAvailable: false,
				components: [],
			}).code,
		).toBe("status_unknown");
		expect(
			resolveItemMaterialStatus({
				...base,
				applicability: "not_required",
				evidenceAvailable: true,
				components: [],
			}).code,
		).toBe("not_required");
		expect(
			resolveItemMaterialStatus({
				...base,
				applicability: "conflict",
				evidenceAvailable: true,
				components: [{ ...readyComponent, eligibilityConflict: true }],
			}).code,
		).toBe("material_conflict");
	});

	it("uses safety precedence and keeps incompatible units separate", () => {
		const result = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "required",
			evidenceAvailable: true,
			reviewPending: true,
			components: [
				readyComponent,
				{
					...readyComponent,
					componentId: 2,
					name: "Primer",
					unit: "gallon",
					requiredQty: 1,
					receivedQty: 0,
					committedAllocatedQty: 0,
					readiness: "blocked",
				},
			],
		});

		expect(result.code).toBe("material_shortage");
		expect(result.quantityGroups).toHaveLength(2);
		expect(result.blockers).toEqual([
			expect.objectContaining({
				componentId: 2,
				code: "MATERIAL_SHORTAGE",
			}),
		]);
	});

	it("preserves only open inbound facts for the expanded item row", () => {
		const result = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "required",
			evidenceAvailable: true,
			reviewPending: false,
			components: [
				{
					...readyComponent,
					openInboundQty: 3,
					readiness: "awaiting_inbound",
					inbounds: [
						{
							id: 88,
							status: "in_progress",
							expectedAt: "2026-09-05T00:00:00.000Z",
							supplierName: "  Acme Supply  ",
							quantity: 3,
						},
						{
							id: 89,
							status: "completed",
							expectedAt: null,
							supplierName: null,
							quantity: 0,
						},
					],
				},
			],
		});

		expect(result.inbounds).toEqual([
			{
				id: 88,
				status: "in_progress",
				expectedAt: "2026-09-05T00:00:00.000Z",
				supplierName: "Acme Supply",
				quantity: 3,
			},
		]);
	});

	it("deduplicates component references and never exceeds item open inbound quantity", () => {
		const sharedInbound = {
			id: 88,
			status: "in_progress",
			expectedAt: "2026-09-05T00:00:00.000Z",
			supplierName: "Acme Supply",
			quantity: 1,
		};
		const result = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "required",
			evidenceAvailable: true,
			reviewPending: false,
			components: [
				{
					...readyComponent,
					openInboundQty: 1,
					readiness: "awaiting_inbound",
					inbounds: [sharedInbound, sharedInbound],
				},
			],
		});

		expect(result.inbounds).toEqual([sharedInbound]);
		expect(
			result.inbounds.reduce((total, inbound) => total + inbound.quantity, 0),
		).toBe(1);
	});

	it("merges separate inbounds that share status, supplier, and arrival date", () => {
		const result = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "required",
			evidenceAvailable: true,
			reviewPending: false,
			components: [
				{
					...readyComponent,
					openInboundQty: 2,
					readiness: "awaiting_inbound",
					inbounds: [1, 2].map((id) => ({
						id,
						status: "in_progress",
						expectedAt:
							id === 1
								? "2026-09-05T00:00:00.000Z"
								: "2026-09-05T12:30:00.000Z",
						supplierName: "Acme Supply",
						quantity: 1,
					})),
				},
			],
		});

		expect(result.inbounds).toEqual([
			{
				id: 1,
				status: "in_progress",
				expectedAt: "2026-09-05T00:00:00.000Z",
				supplierName: "Acme Supply",
				quantity: 2,
			},
		]);
	});

	it("maps customer material status without leaking operational evidence", () => {
		const internal = resolveItemMaterialStatus({
			salesOrderId: 1,
			salesItemId: 10,
			applicability: "conflict",
			evidenceAvailable: true,
			reviewPending: true,
			components: [{ ...readyComponent, eligibilityConflict: true }],
		});

		expect(projectItemMaterialStatusForAudience(internal, "customer")).toEqual({
			code: "pending",
			label: "Materials pending",
			tone: "warning",
		});
		expect(projectItemMaterialStatusForAudience(internal, "internal")).toBe(
			internal,
		);
	});

	it("reserves customer and dealer ready claims for approved material only", () => {
		const scenarios = [
			["material_ready", "ready", "Materials ready"],
			["ready_review_pending", "pending", "Materials pending"],
			["allocation_approval", "pending", "Materials pending"],
			["awaiting_inbound", "in_progress", "Materials in progress"],
			["material_shortage", "pending", "Materials pending"],
			["setup_needed", "pending", "Materials pending"],
			["material_conflict", "pending", "Materials pending"],
			["status_unknown", "pending", "Materials pending"],
			["not_required", "not_required", "No tracked materials"],
		] as const;

		for (const [code, expectedCode, expectedLabel] of scenarios) {
			const internal = {
				...resolveItemMaterialStatus({
					salesOrderId: 1,
					salesItemId: 10,
					applicability: "required",
					evidenceAvailable: true,
					reviewPending: false,
					components: [readyComponent],
				}),
				code,
			};
			for (const audience of ["customer", "dealer"] as const) {
				const projection = projectItemMaterialStatusForAudience(
					internal,
					audience,
				);
				expect(projection).toEqual({
					code: expectedCode,
					label: expectedLabel,
					tone:
						expectedCode === "ready"
							? "success"
							: expectedCode === "in_progress"
								? "info"
								: expectedCode === "not_required"
									? "neutral"
									: "warning",
				});
				expect("blockers" in projection).toBe(false);
				expect("inbounds" in projection).toBe(false);
				expect("quantityGroups" in projection).toBe(false);
				expect("reviewPending" in projection).toBe(false);
			}
		}
	});
});
