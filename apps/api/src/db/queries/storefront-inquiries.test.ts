import { describe, expect, mock, test } from "bun:test";
import {
	authorizeStorefrontInquiryUpload,
	createStorefrontInquiryQuote,
	updateStorefrontInquiryStatus,
} from "./storefront-inquiries";

describe("storefront inquiry persistence guards", () => {
	test("authorizes uploads only against an open draft below the five-file cap", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		await authorizeStorefrontInquiryUpload(
			{ storefrontInquiry: { updateMany } } as never,
			"inquiry-1",
		);
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: "inquiry-1",
				status: "DRAFT",
				authorizedUploadCount: { lt: 5 },
			},
			data: { authorizedUploadCount: { increment: 1 } },
		});

		await expect(
			authorizeStorefrontInquiryUpload(
				{
					storefrontInquiry: {
						updateMany: mock(async () => ({ count: 0 })),
					},
				} as never,
				"closed-inquiry",
			),
		).rejects.toThrow("five authorized attachments");
	});

	test("recovers an origin-tagged quote after a crash before inquiry linkage", async () => {
		const linkInquiry = mock(async () => ({ count: 1 }));
		const createActivity = mock(async () => ({}));
		const createAudit = mock(async () => ({}));
		const ctx = {
			userId: 9,
			requestId: "request-1",
			db: {
				storefrontInquiry: {
					findFirst: mock(async () => ({
						id: "inquiry-1",
						status: "IN_REVIEW",
						salesQuoteId: null,
						customerId: null,
						assignedToId: null,
					})),
				},
				salesOrders: {
					findFirst: mock(async () => ({
						id: 42,
						orderId: "Q-42",
						slug: "q-42",
						status: "Draft",
					})),
				},
				$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
					callback({
						storefrontInquiry: { updateMany: linkInquiry },
						storefrontInquiryActivity: { create: createActivity },
						storefrontAuditEvent: { create: createAudit },
					}),
			},
		};

		await expect(
			createStorefrontInquiryQuote(ctx as never, "inquiry-1"),
		).resolves.toEqual({
			id: 42,
			orderId: "Q-42",
			slug: "q-42",
			status: "Draft",
			alreadyCreated: true,
		});
		expect(linkInquiry).toHaveBeenCalledTimes(1);
		expect(createActivity).toHaveBeenCalledTimes(1);
		expect(createAudit).toHaveBeenCalledTimes(1);
	});

	test("rejects manually selecting the system-owned quote-created status", async () => {
		await expect(
			updateStorefrontInquiryStatus({ userId: 9, db: {} } as never, {
				id: "inquiry-1",
				status: "QUOTE_CREATED",
			}),
		).rejects.toThrow();
	});
});
