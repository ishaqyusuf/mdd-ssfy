// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	buildOfficeCustomerVisibilityWhere,
	hashDealerProgramInvitationToken,
	isDealerRecruitmentCandidate,
	resolveDealerRecruitmentBanner,
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

		const banner = await resolveDealerRecruitmentBanner(db as any, {
			customerId: 42,
			recipientEmail: "buyer@example.com",
			baseUrl: "https://app.example.com",
			now: new Date("2026-07-19T00:00:00.000Z"),
		});

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
			await resolveDealerRecruitmentBanner(db as any, {
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
				db as any,
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

		await setDealerRecruitmentCampaignStatus(db as any, 1, {
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
