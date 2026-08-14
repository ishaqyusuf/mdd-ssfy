import { describe, expect, it } from "bun:test";

import {
	buildSpecialOrderApprovalRevision,
	buildSpecialOrderCustomerVisibleRevision,
	canEnrollSpecialOrder,
	deriveSpecialOrderRevisionTransition,
	deriveSpecialOrderStatus,
	evaluateSpecialOrderOperation,
	getSpecialOrderStatusLabel,
	requiresSpecialOrderCustomerEmail,
	requiresSpecialOrderDeclaration,
	resolveSpecialOrderDisplayState,
	validateSpecialOrderDeclaration,
	validateSpecialOrderEnrollment,
} from "./domain";

describe("Special Order declaration lifecycle", () => {
	it("limits enrollment to Super Admin during the pilot and opens it at release", () => {
		expect(
			canEnrollSpecialOrder({
				releaseAudience: "SUPER_ADMIN_ONLY",
				actorIsActive: true,
				roleNames: ["Sales", "Super Admin"],
			}),
		).toBe(true);
		expect(
			canEnrollSpecialOrder({
				releaseAudience: "SUPER_ADMIN_ONLY",
				actorIsActive: true,
				roleNames: ["Sales"],
			}),
		).toBe(false);
		expect(
			canEnrollSpecialOrder({
				releaseAudience: "ALL_STAFF",
				actorIsActive: true,
				roleNames: ["Sales"],
			}),
		).toBe(true);
		expect(
			canEnrollSpecialOrder({
				releaseAudience: "ALL_STAFF",
				actorIsActive: false,
				roleNames: [],
			}),
		).toBe(false);
	});

	it("does not require the declaration when enrollment is unavailable", () => {
		expect(
			validateSpecialOrderDeclaration({
				type: "order",
				commitIntent: "final",
				declaration: null,
				canEnroll: false,
			}),
		).toEqual({ valid: true, required: false, code: null });
	});

	it("rejects only a restricted transition into Special Order", () => {
		expect(
			validateSpecialOrderEnrollment({
				currentDeclaration: null,
				nextDeclaration: "YES",
				canEnroll: false,
			}),
		).toEqual({
			allowed: false,
			enrollmentRequested: true,
			code: "SPECIAL_ORDER_ENROLLMENT_RESTRICTED",
		});
		expect(
			validateSpecialOrderEnrollment({
				currentDeclaration: "YES",
				nextDeclaration: "YES",
				canEnroll: false,
			}),
		).toEqual({ allowed: true, enrollmentRequested: false, code: null });
		expect(
			validateSpecialOrderEnrollment({
				currentDeclaration: null,
				nextDeclaration: "NO",
				canEnroll: false,
			}),
		).toEqual({ allowed: true, enrollmentRequested: false, code: null });
	});

	it("keeps unanswered orders distinct from an explicit No", () => {
		expect(resolveSpecialOrderDisplayState(null)).toBe("LEGACY_NOT_EVALUATED");
		expect(resolveSpecialOrderDisplayState({ declaration: "NO" })).toBe(
			"NOT_REQUIRED",
		);
		expect(getSpecialOrderStatusLabel(null)).toBe("Not evaluated");
	});

	it("derives the initial whole-order lifecycle state", () => {
		expect(deriveSpecialOrderStatus({ declaration: null })).toBeNull();
		expect(deriveSpecialOrderStatus({ declaration: "NO" })).toBe(
			"NOT_REQUIRED",
		);
		expect(deriveSpecialOrderStatus({ declaration: "YES" })).toBe(
			"SIGNATURE_PENDING",
		);
	});

	it("preserves customer evidence states and Current Approval", () => {
		expect(
			deriveSpecialOrderStatus({
				declaration: "YES",
				currentStatus: "CUSTOMER_DECLINED",
			}),
		).toBe("CUSTOMER_DECLINED");
		expect(
			deriveSpecialOrderStatus({
				declaration: "YES",
				currentStatus: "REAPPROVAL_REQUIRED",
			}),
		).toBe("REAPPROVAL_REQUIRED");
		expect(
			deriveSpecialOrderStatus({
				declaration: "YES",
				currentApprovalId: "approval_1",
			}),
		).toBe("CUSTOMER_APPROVED");
	});

	it("requires a declaration only at internal order commit boundaries", () => {
		expect(
			requiresSpecialOrderDeclaration({
				type: "order",
				commitIntent: "autosave",
			}),
		).toBe(false);
		expect(
			requiresSpecialOrderDeclaration({
				type: "order",
				commitIntent: "draft",
			}),
		).toBe(false);
		expect(
			requiresSpecialOrderDeclaration({
				type: "order",
				commitIntent: "close",
			}),
		).toBe(true);
		expect(
			requiresSpecialOrderDeclaration({
				type: "quote",
				commitIntent: "final",
			}),
		).toBe(false);
		expect(
			requiresSpecialOrderDeclaration({
				type: "order",
				commitIntent: "final",
				isInternalDashboardOrder: false,
			}),
		).toBe(false);
	});

	it("returns a stable validation code for an unanswered commit", () => {
		expect(
			validateSpecialOrderDeclaration({
				type: "order",
				commitIntent: "final",
				declaration: null,
			}),
		).toEqual({
			valid: false,
			required: true,
			code: "SPECIAL_ORDER_DECLARATION_REQUIRED",
		});
	});

	it("requires a customer email before selecting or manually saving Yes", () => {
		expect(
			requiresSpecialOrderCustomerEmail({
				declaration: "YES",
				customerEmail: null,
			}),
		).toBe(true);
		expect(
			requiresSpecialOrderCustomerEmail({
				declaration: "YES",
				customerEmail: " customer@example.com ",
				commitIntent: "final",
			}),
		).toBe(false);
		expect(
			requiresSpecialOrderCustomerEmail({
				declaration: "YES",
				customerEmail: null,
				commitIntent: "autosave",
			}),
		).toBe(false);
		expect(
			requiresSpecialOrderCustomerEmail({
				declaration: "YES",
				customerEmail: "not-an-email",
				commitIntent: "final",
			}),
		).toBe(true);
		expect(
			requiresSpecialOrderCustomerEmail({
				declaration: "NO",
				customerEmail: null,
				commitIntent: "final",
			}),
		).toBe(false);
	});

	it("builds stable revisions from canonical customer-visible values", () => {
		const left = buildSpecialOrderApprovalRevision({
			createdAt: new Date("2026-08-13T12:00:00.000Z"),
			total: 10,
			lineItems: [
				{ uid: "line-b", qty: 2, description: " Trim " },
				{ uid: "line-a", qty: 1, description: " Custom Door " },
			],
		});
		const right = buildSpecialOrderApprovalRevision({
			lineItems: [
				{ description: "Custom Door", qty: 1.0, uid: "line-a" },
				{ description: "Trim", qty: 2, uid: "line-b" },
			],
			total: 10.00001,
			createdAt: "2026-08-13T12:00:00.000Z",
		});
		expect(left).toBe(right);
		expect(left).toHaveLength(64);
	});

	it("changes the revision for every customer-visible commercial field", () => {
		const base = {
			customer: { id: 12, name: "Original Customer", email: "a@example.com" },
			billingAddress: { id: 2, address1: "100 Main St" },
			lineItems: [
				{
					uid: "line-a",
					description: "Custom Door",
					qty: 1,
					price: 250,
					discount: 0,
					formSteps: [{ stepUid: "width", value: "36" }],
				},
			],
			summary: { taxTotal: 20, grandTotal: 270 },
		};
		const revision = buildSpecialOrderApprovalRevision(base);
		const changes = [
			{ ...base, customer: { ...base.customer, name: "Renamed Customer" } },
			{
				...base,
				billingAddress: { ...base.billingAddress, address1: "200 Main St" },
			},
			{
				...base,
				lineItems: [{ ...base.lineItems[0], description: "Custom Door XL" }],
			},
			{
				...base,
				lineItems: [{ ...base.lineItems[0], qty: 2 }],
			},
			{
				...base,
				lineItems: [{ ...base.lineItems[0], price: 275 }],
			},
			{
				...base,
				lineItems: [{ ...base.lineItems[0], discount: 10 }],
			},
			{
				...base,
				lineItems: [
					{
						...base.lineItems[0],
						formSteps: [{ stepUid: "width", value: "42" }],
					},
				],
			},
			{ ...base, summary: { taxTotal: 21, grandTotal: 271 } },
		];
		for (const changed of changes) {
			expect(buildSpecialOrderApprovalRevision(changed)).not.toBe(revision);
		}
	});

	it("ignores internal line metadata but tracks nested customer-visible rows", () => {
		const base = {
			customer: { id: 12, name: "Customer" },
			customerProfile: null,
			billingAddress: null,
			shippingAddress: null,
			orderDate: "2026-08-13",
			lineItems: [
				{
					uid: "line-1",
					title: "Installation",
					qty: 1,
					unitPrice: 80,
					lineTotal: 80,
					meta: {
						internalNote: "warehouse only",
						serviceRows: [
							{ uid: "service-1", service: "Install", qty: 1, unitPrice: 80 },
						],
					},
				},
			],
			extraCosts: [],
			summary: { subTotal: 80, grandTotal: 80 },
		};
		const revision = buildSpecialOrderCustomerVisibleRevision(base);
		expect(
			buildSpecialOrderCustomerVisibleRevision({
				...base,
				lineItems: [
					{
						...base.lineItems[0],
						meta: { ...base.lineItems[0]?.meta, internalNote: "changed" },
					},
				],
			}),
		).toBe(revision);
		expect(
			buildSpecialOrderCustomerVisibleRevision({
				...base,
				lineItems: [
					{
						...base.lineItems[0],
						meta: {
							...base.lineItems[0]?.meta,
							serviceRows: [
								{ uid: "service-1", service: "Install", qty: 2, unitPrice: 80 },
							],
						},
					},
				],
			}),
		).not.toBe(revision);
	});

	it("keeps legacy orders exempt and applies the configured operation gate", () => {
		expect(
			evaluateSpecialOrderOperation({
				declaration: null,
				status: null,
				enforcementMode: "BLOCK_ALL_OPERATIONS",
				operation: "PRODUCTION",
			}),
		).toMatchObject({ allowed: true, warning: false });
		expect(
			evaluateSpecialOrderOperation({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				enforcementMode: "WARNING_ONLY",
				operation: "PRODUCTION",
			}),
		).toMatchObject({ allowed: true, warning: true });
		expect(
			evaluateSpecialOrderOperation({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				enforcementMode: "BLOCK_PURCHASING_AND_PRODUCTION",
				operation: "PRODUCTION",
			}),
		).toMatchObject({
			allowed: false,
			code: "SPECIAL_ORDER_APPROVAL_REQUIRED",
		});
		expect(
			evaluateSpecialOrderOperation({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				enforcementMode: "BLOCK_PURCHASING_AND_PRODUCTION",
				operation: "DISPATCH",
			}),
		).toMatchObject({ allowed: true, warning: true });
	});

	it("derives initial, current, stale, declined, and removed-to-reenrolled revisions", () => {
		expect(
			deriveSpecialOrderRevisionTransition({
				declaration: "YES",
				currentRevision: null,
				nextRevision: "revision-1",
				currentApprovalId: null,
				currentStatus: null,
			}),
		).toMatchObject({
			revisionChanged: false,
			nextApprovalId: null,
			nextStatus: "SIGNATURE_PENDING",
		});

		expect(
			deriveSpecialOrderRevisionTransition({
				declaration: "YES",
				currentRevision: "revision-1",
				nextRevision: "revision-1",
				currentApprovalId: "approval-1",
				currentStatus: "CUSTOMER_APPROVED",
			}),
		).toMatchObject({
			revisionChanged: false,
			nextApprovalId: "approval-1",
			nextStatus: "CUSTOMER_APPROVED",
		});

		for (const current of [
			{ approvalId: "approval-1", status: "CUSTOMER_APPROVED" as const },
			{ approvalId: null, status: "CUSTOMER_DECLINED" as const },
		]) {
			expect(
				deriveSpecialOrderRevisionTransition({
					declaration: "YES",
					currentRevision: "revision-1",
					nextRevision: "revision-2",
					currentApprovalId: current.approvalId,
					currentStatus: current.status,
				}),
			).toMatchObject({
				hadCustomerEvidence: true,
				revisionChanged: true,
				nextApprovalId: null,
				nextStatus: "REAPPROVAL_REQUIRED",
			});
		}

		expect(
			deriveSpecialOrderRevisionTransition({
				declaration: "YES",
				currentRevision: null,
				nextRevision: "reenrolled-revision",
				currentApprovalId: null,
				currentStatus: "NOT_REQUIRED",
			}),
		).toMatchObject({
			revisionChanged: false,
			nextApprovalId: null,
			nextStatus: "SIGNATURE_PENDING",
		});
	});
});
