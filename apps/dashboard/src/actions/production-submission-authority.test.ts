import { describe, expect, it } from "bun:test";

import {
	requireProductionAssignmentAuthority,
	requireProductionSubmissionAuthority,
	resolveProductionSubmissionAuthority,
} from "./production-submission-authority";

describe("production submission authority", () => {
	it("requires editProduction for assignment mutations", () => {
		let deniedMessage = "";
		try {
			requireProductionAssignmentAuthority({
				can: { viewProduction: true, editProduction: false },
			});
		} catch (error) {
			deniedMessage = error instanceof Error ? error.message : String(error);
		}
		expect(deniedMessage).toBe(
			"You do not have permission to manage production work.",
		);
		requireProductionAssignmentAuthority({
			can: { editProduction: true },
		});
	});
	it("allows an assigned production worker without submit-for-others authority", () => {
		expect(
			resolveProductionSubmissionAuthority({
				role: "Production",
				can: { viewProduction: true, editProduction: false },
			}),
		).toEqual({
			canSubmitProduction: true,
			allowSubmitForOthers: false,
		});
	});

	it("preserves elevated and production edit authority for submit-for-others", () => {
		for (const profile of [
			{ role: "Admin", can: {} },
			{ role: "Super Admin", can: {} },
			{ role: "Production Supervisor", can: { editProduction: true } },
		]) {
			expect(resolveProductionSubmissionAuthority(profile)).toEqual({
				canSubmitProduction: true,
				allowSubmitForOthers: true,
			});
		}
	});

	it("rejects an authenticated actor without production capability", () => {
		let message = "";
		try {
			requireProductionSubmissionAuthority({
				role: "Sales Rep",
				can: { viewProduction: false, editProduction: false },
			});
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).toBe(
			"Production access is required to report completed work.",
		);
	});

	it("allows the order sales rep to submit on behalf without global production edit access", () => {
		expect(
			resolveProductionSubmissionAuthority(
				{
					role: "Sales Rep",
					can: { viewProduction: false, editProduction: false },
				},
				{ isOrderSalesRep: true },
			),
		).toEqual({
			canSubmitProduction: true,
			allowSubmitForOthers: true,
		});
	});
});
