import { describe, expect, it } from "bun:test";
import { resolveSalesPipelineSnapshot } from "@gnd/sales";
import {
	classifyShadowMembershipDifferences,
	percentile95,
} from "./sales-pipeline-shadow-report";

describe("Sales Pipeline shadow report", () => {
	it("calculates p95 from measured database/resolver batch durations", () => {
		expect(percentile95([])).toBe(0);
		expect(percentile95([1, 3, 2, 100, 4, 5, 6, 7, 8, 9, 10])).toBe(100);
		expect(
			percentile95(Array.from({ length: 100 }, (_, index) => index + 1)),
		).toBe(95);
	});
});

describe("Sales Pipeline shadow membership classification", () => {
	it("explains intentional non-required and terminal semantic differences", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 1,
			orderNo: "SO-1",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 4,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});

		expect(
			classifyShadowMembershipDifferences(snapshot, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"FULFILLMENT_OPERATIONALLY_COMPLETED",
				"PRODUCTION_EXPLICITLY_NOT_REQUIRED",
			],
		});
	});

	it("classifies unknown applicability as explicit operator review", () => {
		const unknown = resolveSalesPipelineSnapshot({
			salesOrderId: 2,
			orderNo: "SO-2",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: null,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(unknown, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: true,
					canonical: false,
				},
			]),
		).toEqual({
			classification: "review_required",
			reasons: ["PRODUCTION_APPLICABILITY_UNKNOWN"],
		});
	});

	it("explains a current required stage only from concrete current evidence", () => {
		const required = resolveSalesPipelineSnapshot({
			salesOrderId: 3,
			orderNo: "SO-3",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 100 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: true,
				requiredQty: 2,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(required, [
				{
					code: "PRODUCTION_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "explained",
			reasons: [
				"PRODUCTION_CURRENT_REQUIRED_QUANTITY",
				"PRODUCTION_EXPLICIT_CURRENT_REQUIREMENT",
			],
		});
	});

	it("leaves an inconsistent membership direction unexplained", () => {
		const completed = resolveSalesPipelineSnapshot({
			salesOrderId: 4,
			orderNo: "SO-4",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 8,
						active: true,
						itemCount: 1,
						deliveredQty: 1,
						status: "completed",
						proofCompleted: true,
						inventoryCommitted: true,
					},
				],
				administrativeCompletion: null,
			},
		});
		expect(
			classifyShadowMembershipDifferences(completed, [
				{
					code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
					legacy: false,
					canonical: true,
				},
			]),
		).toEqual({
			classification: "unexplained",
			reasons: ["FULFILLMENT_UNEXPLAINED_MEMBERSHIP_DIRECTION"],
		});
	});
});
