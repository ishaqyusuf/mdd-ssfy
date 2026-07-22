// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import type { Database } from "../index";
import {
	buildOfficeCustomerVisibilityWhere,
	getDealerInvitationRetryAt,
	hashDealerProgramInvitationToken,
	isDealerRecruitmentCandidate,
	markDealerRecruitmentInvitationDelivery,
	resolveDealerPartnershipSummary,
	resolveDealerRecruitmentBanner,
	sendDirectDealerProgramInvitation,
	setDealerRecruitmentCampaignStatus,
	submitDealerProgramApplication,
} from "./dealer-program";

describe("dealer customer office visibility", () => {
	it("keeps direct customers and explicitly shared dealer customers visible", () => {
		expect(buildOfficeCustomerVisibilityWhere()).toEqual({
			OR: [{ dealerOwnerId: null }, { officeVisibility: "SHARED" }],
		});
	});
});

describe("dealer recruitment campaign delivery", () => {
	it("uses profile and individual targeting as a union and stores only a token hash", async () => {
		let invitationData: Record<string, unknown> | undefined;
		const db = {
			dealerRecruitmentCampaign: {
				findFirst: async () => ({
					id: "campaign-1",
					status: "ACTIVE",
					audienceMode: "SELECTED",
					headline: "Partner with us",
					benefitText: "Serve customers with office fulfillment.",
					ctaLabel: "Apply",
					imageUrl: null,
					accentColor: "#0f766e",
					placement: "TOP",
					startsAt: null,
					endsAt: null,
					profiles: [{ customerProfileId: 99 }],
					customers: [],
				}),
			},
			customers: {
				findFirst: async () => ({
					id: 42,
					email: "buyer@example.com",
					customerTypeId: 99,
					dealerOwnerId: null,
					auth: null,
				}),
			},
			dealerProgramApplication: {
				findFirst: async () => null,
			},
			dealerAuth: {
				findFirst: async () => null,
			},
			dealerRecruitmentInvitation: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					invitationData = data;
					return { id: "invitation-1" };
				},
			},
			$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
		};

		const banner = await resolveDealerRecruitmentBanner(
			db as unknown as Database,
			{
				customerId: 42,
				recipientEmail: "buyer@example.com",
				baseUrl: "https://app.example.com",
				now: new Date("2026-07-19T00:00:00.000Z"),
			},
		);

		expect(banner?.campaignId).toBe("campaign-1");
		expect(banner?.url).toStartWith("https://app.example.com/dealer-program/");
		expect(invitationData?.tokenHash).toBeString();
		expect(String(invitationData?.tokenHash)).toHaveLength(64);
		expect(invitationData).not.toHaveProperty("token");
	});

	it("suppresses every later banner while a non-reset application exists", async () => {
		let invitationsCreated = 0;
		const db = {
			dealerRecruitmentCampaign: {
				findFirst: async () => ({
					id: "campaign-1",
					status: "ACTIVE",
					audienceMode: "ALL_ELIGIBLE",
					startsAt: null,
					endsAt: null,
					profiles: [],
					customers: [],
				}),
			},
			customers: {
				findFirst: async () => ({
					id: 42,
					email: "buyer@example.com",
					customerTypeId: null,
					dealerOwnerId: null,
					auth: null,
				}),
			},
			dealerProgramApplication: {
				findFirst: async () => ({ id: "application-1" }),
			},
			dealerRecruitmentInvitation: {
				create: async () => {
					invitationsCreated += 1;
					return { id: "invitation-1" };
				},
			},
		};

		expect(
			await resolveDealerRecruitmentBanner(db as unknown as Database, {
				customerId: 42,
				recipientEmail: "buyer@example.com",
				baseUrl: "https://app.example.com",
			}),
		).toBeNull();
		expect(invitationsCreated).toBe(0);
	});

	it("submits an invitation idempotently", async () => {
		const existingApplication = {
			id: "application-1",
			customerId: 42,
			status: "PENDING",
		};
		const tx = {
			customers: {
				findFirst: async () => ({
					email: "buyer@example.com",
					auth: null,
				}),
			},
			dealerAuth: {
				findFirst: async () => null,
			},
			dealerRecruitmentInvitation: {
				findFirst: async () => ({
					id: "invitation-1",
					customerId: 42,
					campaignId: "campaign-1",
					recipientEmail: "buyer@example.com",
					application: existingApplication,
				}),
			},
		};
		const db = {
			$transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		};

		expect(
			await submitDealerProgramApplication(
				db as unknown as Database,
				"opaque-token-with-enough-characters",
			),
		).toEqual({ application: existingApplication, created: false });
	});

	it("serializes activation and pauses the previously active campaign", async () => {
		const operations: string[] = [];
		const tx = {
			dealerRecruitmentCampaign: {
				findFirst: async () => ({ id: "campaign-2", status: "DRAFT" }),
				updateMany: async () => {
					operations.push("pause-others");
				},
				update: async () => {
					operations.push("activate-target");
					return { id: "campaign-2", status: "ACTIVE" };
				},
			},
		};
		let isolationLevel: string | undefined;
		const db = {
			$transaction: async (
				callback: (value: typeof tx) => unknown,
				options: { isolationLevel?: string },
			) => {
				isolationLevel = options.isolationLevel;
				return callback(tx);
			},
		};

		await setDealerRecruitmentCampaignStatus(db as unknown as Database, 1, {
			id: "campaign-2",
			status: "ACTIVE",
		});
		expect(operations).toEqual(["pause-others", "activate-target"]);
		expect(isolationLevel).toBe("Serializable");
	});
});

describe("dealer recruitment eligibility", () => {
	const eligible = {
		customerId: 42,
		customerEmail: "buyer@example.com",
		recipientEmail: "BUYER@example.com",
		dealerOwnerId: null,
		hasDealerAccount: false,
		hasActiveApplicationSuppression: false,
		audienceMatches: true,
	};

	it("accepts an eligible direct customer with a matching recipient", () => {
		expect(isDealerRecruitmentCandidate(eligible)).toBe(true);
	});

	it("rejects dealer-owned, existing-dealer, suppressed, and email-mismatched customers", () => {
		expect(
			isDealerRecruitmentCandidate({ ...eligible, dealerOwnerId: 7 }),
		).toBe(false);
		expect(
			isDealerRecruitmentCandidate({ ...eligible, hasDealerAccount: true }),
		).toBe(false);
		expect(
			isDealerRecruitmentCandidate({
				...eligible,
				hasActiveApplicationSuppression: true,
			}),
		).toBe(false);
		expect(
			isDealerRecruitmentCandidate({
				...eligible,
				recipientEmail: "other@example.com",
			}),
		).toBe(false);
	});

	it("hashes invitation tokens without storing the raw token", () => {
		const token = "customer-visible-random-token";
		const hash = hashDealerProgramInvitationToken(token);

		expect(hash).toHaveLength(64);
		expect(hash).not.toContain(token);
		expect(hashDealerProgramInvitationToken(token)).toBe(hash);
	});
});

describe("dealer partnership status", () => {
	const now = new Date("2026-07-22T12:00:00.000Z");
	const customer = {
		id: 42,
		email: "buyer@example.com",
		dealerOwnerId: null,
	};
	const activeCampaign = {
		id: "campaign-1",
		title: "Summer partnership",
		status: "ACTIVE" as const,
		startsAt: null,
		endsAt: null,
	};

	it("marks an office customer with email as eligible for a Super Admin", () => {
		const summary = resolveDealerPartnershipSummary({
			customer,
			activeCampaign,
			canManage: true,
			now,
		});

		expect(summary.state).toBe("ELIGIBLE");
		expect(summary.canSend).toBe(true);
		expect(summary.canResend).toBe(false);
		expect(summary.campaign?.id).toBe("campaign-1");
	});

	it("gives dealer and application states precedence over invitation state", () => {
		const invitation = {
			id: "invite-1",
			campaignId: "campaign-1",
			recipientEmail: customer.email,
			source: "MANUAL_CUSTOMER" as const,
			deliveryStatus: "SENT" as const,
			deliveredAt: new Date("2026-07-21T08:00:00.000Z"),
			firstOpenedAt: null,
			expiresAt: new Date("2026-08-21T08:00:00.000Z"),
			createdAt: new Date("2026-07-21T08:00:00.000Z"),
			revokedAt: null,
			supersededAt: null,
			campaign: activeCampaign,
			sentBy: null,
		};

		expect(
			resolveDealerPartnershipSummary({
				customer,
				activeCampaign,
				invitation,
				application: {
					id: "application-1",
					status: "PENDING",
					submittedAt: now,
					reviewedAt: null,
					decisionNote: null,
				},
				canManage: true,
				now,
			}).state,
		).toBe("APPLICATION_PENDING");

		expect(
			resolveDealerPartnershipSummary({
				customer,
				activeCampaign,
				invitation,
				dealer: {
					id: 7,
					status: "suspended",
					restricted: true,
					approvedAt: now,
				},
				canManage: true,
				now,
			}).state,
		).toBe("DEALER_SUSPENDED");
	});

	it("allows a controlled resend only after 24 hours", () => {
		const sentAt = new Date("2026-07-22T00:00:00.000Z");
		const retryAt = getDealerInvitationRetryAt(
			{
				deliveryStatus: "SENT",
				deliveredAt: sentAt,
				createdAt: sentAt,
			},
			now,
		);

		expect(retryAt?.toISOString()).toBe("2026-07-23T00:00:00.000Z");
		expect(
			getDealerInvitationRetryAt(
				{
					deliveryStatus: "FAILED",
					deliveredAt: null,
					createdAt: sentAt,
				},
				now,
			),
		).toBeNull();
	});
});

describe("manual customer partnership invitations", () => {
	const now = new Date("2026-07-22T12:00:00.000Z");

	function database(options?: { leaseCount?: number; ownsLease?: boolean }) {
		const created: Record<string, unknown>[] = [];
		const updates: Array<Record<string, unknown>> = [];
		const tx = {
			dealerRecruitmentCampaign: {
				findFirst: async () => ({
					id: "campaign-1",
					title: "Partner program",
					status: "ACTIVE",
					headline: "Grow with GND",
					benefitText: "Dealer pricing and office fulfillment.",
					ctaLabel: "Request partnership",
					imageUrl: null,
					accentColor: "#0f766e",
					startsAt: null,
					endsAt: null,
				}),
			},
			customers: {
				findFirst: async () => ({
					id: 42,
					name: "Acme",
					businessName: "Acme Millwork",
					email: "OWNER@acme.test",
					auth: null,
				}),
			},
			dealerProgramApplication: { findFirst: async () => null },
			dealerAuth: { findFirst: async () => null },
			dealerRecruitmentInvitation: {
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					created.push(data);
					return { id: "invitation-new", ...data };
				},
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					updates.push(data);
					return { count: 1 };
				},
			},
			dealerRecruitmentCustomerState: {
				findFirst: async () =>
					options?.ownsLease === false ? null : { customerId: 42 },
				update: async () => ({}),
			},
		};
		const db = {
			...tx,
			dealerRecruitmentCustomerState: {
				...tx.dealerRecruitmentCustomerState,
				upsert: async () => ({}),
				updateMany: async () => ({ count: options?.leaseCount ?? 1 }),
			},
			$transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		};
		return { db, created, updates };
	}

	it("stores only a hash and supersedes older unused links after provider acceptance", async () => {
		const { db, created, updates } = database();
		const result = await sendDirectDealerProgramInvitation(
			db as unknown as Database,
			9,
			{ customerId: 42, baseUrl: "https://app.example.com", now },
			async (message) => {
				expect(message.to).toBe("owner@acme.test");
				expect(message.applicationUrl).toContain("/dealer-program/");
				return {
					status: "SENT",
					providerMessageId: "provider-1",
				};
			},
		);

		expect(result.deliveryStatus).toBe("SENT");
		expect(created[0]?.source).toBe("MANUAL_CUSTOMER");
		expect(String(created[0]?.tokenHash)).toHaveLength(64);
		expect(created[0]).not.toHaveProperty("token");
		expect(updates.some((data) => "supersededAt" in data)).toBe(true);
	});

	it("revokes a failed replacement without superseding an older usable link", async () => {
		const { db, updates } = database();
		const result = await sendDirectDealerProgramInvitation(
			db as unknown as Database,
			9,
			{ customerId: 42, baseUrl: "https://app.example.com", now },
			async () => ({ status: "FAILED", failure: "provider rejected\nsecret" }),
		);

		expect(result.deliveryStatus).toBe("FAILED");
		expect(updates.some((data) => "supersededAt" in data)).toBe(false);
		expect(updates).toContainEqual(
			expect.objectContaining({ deliveryStatus: "FAILED" }),
		);
	});

	it("rejects simultaneous sends when the customer lease is held", async () => {
		const { db } = database({ leaseCount: 0 });
		await expect(
			sendDirectDealerProgramInvitation(
				db as unknown as Database,
				9,
				{ customerId: 42, baseUrl: "https://app.example.com", now },
				async () => ({ status: "SENT" }),
			),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("does not let a stale sender supersede a newer invitation", async () => {
		const { db, updates } = database({ ownsLease: false });
		await sendDirectDealerProgramInvitation(
			db as unknown as Database,
			9,
			{ customerId: 42, baseUrl: "https://app.example.com", now },
			async () => ({ status: "SENT" }),
		);

		expect(updates.some((data) => "supersededAt" in data)).toBe(false);
	});

	it("accepts delivery results only for a live pending invitation", async () => {
		let update: Record<string, unknown> | undefined;
		const db = {
			dealerRecruitmentInvitation: {
				updateMany: async (input: Record<string, unknown>) => {
					update = input;
					return { count: 1 };
				},
			},
		};
		await markDealerRecruitmentInvitationDelivery(
			db as unknown as Database,
			"invitation-1",
			{ status: "SENT", attemptedAt: now },
		);

		expect(update?.where).toEqual(
			expect.objectContaining({
				deliveryStatus: "PENDING",
				revokedAt: null,
				supersededAt: null,
			}),
		);
		expect(
			(update?.data as Record<string, unknown>)?.revokedAt,
		).toBeUndefined();
	});
});
