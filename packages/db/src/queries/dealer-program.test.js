"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error packages/db typecheck does not include Bun test types.
const bun_test_1 = require("bun:test");
const dealer_program_1 = require("./dealer-program");
(0, bun_test_1.describe)("dealer customer office visibility", () => {
    (0, bun_test_1.it)("keeps direct customers and explicitly shared dealer customers visible", () => {
        (0, bun_test_1.expect)((0, dealer_program_1.buildOfficeCustomerVisibilityWhere)()).toEqual({
            OR: [{ dealerOwnerId: null }, { officeVisibility: "SHARED" }],
        });
    });
});
(0, bun_test_1.describe)("dealer recruitment campaign delivery", () => {
    (0, bun_test_1.it)("uses profile and individual targeting as a union and stores only a token hash", async () => {
        let invitationData;
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
                create: async ({ data }) => {
                    invitationData = data;
                    return { id: "invitation-1" };
                },
            },
            $transaction: async (callback) => callback(db),
        };
        const banner = await (0, dealer_program_1.resolveDealerRecruitmentBanner)(db, {
            customerId: 42,
            recipientEmail: "buyer@example.com",
            baseUrl: "https://app.example.com",
            now: new Date("2026-07-19T00:00:00.000Z"),
        });
        (0, bun_test_1.expect)(banner?.campaignId).toBe("campaign-1");
        (0, bun_test_1.expect)(banner?.url).toStartWith("https://app.example.com/dealer-program/");
        (0, bun_test_1.expect)(invitationData?.tokenHash).toBeString();
        (0, bun_test_1.expect)(String(invitationData?.tokenHash)).toHaveLength(64);
        (0, bun_test_1.expect)(invitationData).not.toHaveProperty("token");
    });
    (0, bun_test_1.it)("suppresses every later banner while a non-reset application exists", async () => {
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
        (0, bun_test_1.expect)(await (0, dealer_program_1.resolveDealerRecruitmentBanner)(db, {
            customerId: 42,
            recipientEmail: "buyer@example.com",
            baseUrl: "https://app.example.com",
        })).toBeNull();
        (0, bun_test_1.expect)(invitationsCreated).toBe(0);
    });
    (0, bun_test_1.it)("submits an invitation idempotently", async () => {
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
            $transaction: async (callback) => callback(tx),
        };
        (0, bun_test_1.expect)(await (0, dealer_program_1.submitDealerProgramApplication)(db, "opaque-token-with-enough-characters")).toEqual({ application: existingApplication, created: false });
    });
    (0, bun_test_1.it)("serializes activation and pauses the previously active campaign", async () => {
        const operations = [];
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
        let isolationLevel;
        const db = {
            $transaction: async (callback, options) => {
                isolationLevel = options.isolationLevel;
                return callback(tx);
            },
        };
        await (0, dealer_program_1.setDealerRecruitmentCampaignStatus)(db, 1, {
            id: "campaign-2",
            status: "ACTIVE",
        });
        (0, bun_test_1.expect)(operations).toEqual(["pause-others", "activate-target"]);
        (0, bun_test_1.expect)(isolationLevel).toBe("Serializable");
    });
});
(0, bun_test_1.describe)("dealer recruitment eligibility", () => {
    const eligible = {
        customerId: 42,
        customerEmail: "buyer@example.com",
        recipientEmail: "BUYER@example.com",
        dealerOwnerId: null,
        hasDealerAccount: false,
        hasActiveApplicationSuppression: false,
        audienceMatches: true,
    };
    (0, bun_test_1.it)("accepts an eligible direct customer with a matching recipient", () => {
        (0, bun_test_1.expect)((0, dealer_program_1.isDealerRecruitmentCandidate)(eligible)).toBe(true);
    });
    (0, bun_test_1.it)("rejects dealer-owned, existing-dealer, suppressed, and email-mismatched customers", () => {
        (0, bun_test_1.expect)((0, dealer_program_1.isDealerRecruitmentCandidate)({ ...eligible, dealerOwnerId: 7 })).toBe(false);
        (0, bun_test_1.expect)((0, dealer_program_1.isDealerRecruitmentCandidate)({ ...eligible, hasDealerAccount: true })).toBe(false);
        (0, bun_test_1.expect)((0, dealer_program_1.isDealerRecruitmentCandidate)({
            ...eligible,
            hasActiveApplicationSuppression: true,
        })).toBe(false);
        (0, bun_test_1.expect)((0, dealer_program_1.isDealerRecruitmentCandidate)({
            ...eligible,
            recipientEmail: "other@example.com",
        })).toBe(false);
    });
    (0, bun_test_1.it)("hashes invitation tokens without storing the raw token", () => {
        const token = "customer-visible-random-token";
        const hash = (0, dealer_program_1.hashDealerProgramInvitationToken)(token);
        (0, bun_test_1.expect)(hash).toHaveLength(64);
        (0, bun_test_1.expect)(hash).not.toContain(token);
        (0, bun_test_1.expect)((0, dealer_program_1.hashDealerProgramInvitationToken)(token)).toBe(hash);
    });
});
(0, bun_test_1.describe)("dealer partnership status", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const customer = {
        id: 42,
        email: "buyer@example.com",
        dealerOwnerId: null,
    };
    const activeCampaign = {
        id: "campaign-1",
        title: "Summer partnership",
        status: "ACTIVE",
        startsAt: null,
        endsAt: null,
    };
    (0, bun_test_1.it)("marks an office customer with email as eligible for a Super Admin", () => {
        const summary = (0, dealer_program_1.resolveDealerPartnershipSummary)({
            customer,
            activeCampaign,
            canManage: true,
            now,
        });
        (0, bun_test_1.expect)(summary.state).toBe("ELIGIBLE");
        (0, bun_test_1.expect)(summary.canSend).toBe(true);
        (0, bun_test_1.expect)(summary.canResend).toBe(false);
        (0, bun_test_1.expect)(summary.campaign?.id).toBe("campaign-1");
    });
    (0, bun_test_1.it)("gives dealer and application states precedence over invitation state", () => {
        const invitation = {
            id: "invite-1",
            campaignId: "campaign-1",
            recipientEmail: customer.email,
            source: "MANUAL_CUSTOMER",
            deliveryStatus: "SENT",
            deliveredAt: new Date("2026-07-21T08:00:00.000Z"),
            firstOpenedAt: null,
            expiresAt: new Date("2026-08-21T08:00:00.000Z"),
            createdAt: new Date("2026-07-21T08:00:00.000Z"),
            revokedAt: null,
            supersededAt: null,
            campaign: activeCampaign,
            sentBy: null,
        };
        (0, bun_test_1.expect)((0, dealer_program_1.resolveDealerPartnershipSummary)({
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
        }).state).toBe("APPLICATION_PENDING");
        (0, bun_test_1.expect)((0, dealer_program_1.resolveDealerPartnershipSummary)({
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
        }).state).toBe("DEALER_SUSPENDED");
    });
    (0, bun_test_1.it)("allows a controlled resend only after 24 hours", () => {
        const sentAt = new Date("2026-07-22T00:00:00.000Z");
        const retryAt = (0, dealer_program_1.getDealerInvitationRetryAt)({
            deliveryStatus: "SENT",
            deliveredAt: sentAt,
            createdAt: sentAt,
        }, now);
        (0, bun_test_1.expect)(retryAt?.toISOString()).toBe("2026-07-23T00:00:00.000Z");
        (0, bun_test_1.expect)((0, dealer_program_1.getDealerInvitationRetryAt)({
            deliveryStatus: "FAILED",
            deliveredAt: null,
            createdAt: sentAt,
        }, now)).toBeNull();
    });
});
(0, bun_test_1.describe)("manual customer partnership invitations", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    function database(options) {
        const created = [];
        const updates = [];
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
                create: async ({ data }) => {
                    created.push(data);
                    return { id: "invitation-new", ...data };
                },
                updateMany: async ({ data }) => {
                    updates.push(data);
                    return { count: 1 };
                },
            },
            dealerRecruitmentCustomerState: {
                findFirst: async () => options?.ownsLease === false ? null : { customerId: 42 },
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
            $transaction: async (callback) => callback(tx),
        };
        return { db, created, updates };
    }
    (0, bun_test_1.it)("stores only a hash and supersedes older unused links after provider acceptance", async () => {
        const { db, created, updates } = database();
        const result = await (0, dealer_program_1.sendDirectDealerProgramInvitation)(db, 9, { customerId: 42, baseUrl: "https://app.example.com", now }, async (message) => {
            (0, bun_test_1.expect)(message.to).toBe("owner@acme.test");
            (0, bun_test_1.expect)(message.applicationUrl).toContain("/dealer-program/");
            return {
                status: "SENT",
                providerMessageId: "provider-1",
            };
        });
        (0, bun_test_1.expect)(result.deliveryStatus).toBe("SENT");
        (0, bun_test_1.expect)(created[0]?.source).toBe("MANUAL_CUSTOMER");
        (0, bun_test_1.expect)(String(created[0]?.tokenHash)).toHaveLength(64);
        (0, bun_test_1.expect)(created[0]).not.toHaveProperty("token");
        (0, bun_test_1.expect)(updates.some((data) => "supersededAt" in data)).toBe(true);
    });
    (0, bun_test_1.it)("revokes a failed replacement without superseding an older usable link", async () => {
        const { db, updates } = database();
        const result = await (0, dealer_program_1.sendDirectDealerProgramInvitation)(db, 9, { customerId: 42, baseUrl: "https://app.example.com", now }, async () => ({ status: "FAILED", failure: "provider rejected\nsecret" }));
        (0, bun_test_1.expect)(result.deliveryStatus).toBe("FAILED");
        (0, bun_test_1.expect)(updates.some((data) => "supersededAt" in data)).toBe(false);
        (0, bun_test_1.expect)(updates).toContainEqual(bun_test_1.expect.objectContaining({ deliveryStatus: "FAILED" }));
    });
    (0, bun_test_1.it)("rejects simultaneous sends when the customer lease is held", async () => {
        const { db } = database({ leaseCount: 0 });
        await (0, bun_test_1.expect)((0, dealer_program_1.sendDirectDealerProgramInvitation)(db, 9, { customerId: 42, baseUrl: "https://app.example.com", now }, async () => ({ status: "SENT" }))).rejects.toMatchObject({ code: "CONFLICT" });
    });
    (0, bun_test_1.it)("does not let a stale sender supersede a newer invitation", async () => {
        const { db, updates } = database({ ownsLease: false });
        await (0, dealer_program_1.sendDirectDealerProgramInvitation)(db, 9, { customerId: 42, baseUrl: "https://app.example.com", now }, async () => ({ status: "SENT" }));
        (0, bun_test_1.expect)(updates.some((data) => "supersededAt" in data)).toBe(false);
    });
    (0, bun_test_1.it)("accepts delivery results only for a live pending invitation", async () => {
        let update;
        const db = {
            dealerRecruitmentInvitation: {
                updateMany: async (input) => {
                    update = input;
                    return { count: 1 };
                },
            },
        };
        await (0, dealer_program_1.markDealerRecruitmentInvitationDelivery)(db, "invitation-1", { status: "SENT", attemptedAt: now });
        (0, bun_test_1.expect)(update?.where).toEqual(bun_test_1.expect.objectContaining({
            deliveryStatus: "PENDING",
            revokedAt: null,
            supersededAt: null,
        }));
        (0, bun_test_1.expect)(update?.data?.revokedAt).toBeUndefined();
    });
});
