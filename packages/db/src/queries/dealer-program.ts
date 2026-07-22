import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Database, Prisma } from "../index";

const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_RESEND_DELAY_MS = 24 * 60 * 60 * 1000;
const INVITATION_PENDING_STALE_MS = 10 * 60 * 1000;
const INVITATION_SEND_LEASE_MS = 5 * 60 * 1000;

export type DealerPartnershipState =
	| "ELIGIBLE"
	| "INELIGIBLE"
	| "INVITE_PENDING"
	| "INVITE_SENT"
	| "INVITE_OPENED"
	| "INVITE_FAILED"
	| "INVITE_EXPIRED"
	| "CAMPAIGN_INACTIVE"
	| "APPLICATION_PENDING"
	| "APPLICATION_DENIED"
	| "APPLICATION_APPROVED"
	| "DEALER_ACTIVE"
	| "DEALER_SUSPENDED"
	| "DEALER_RESTRICTED";

type PartnershipCampaign = {
	id: string;
	title: string;
	status: string;
	startsAt?: Date | null;
	endsAt?: Date | null;
};

type PartnershipInvitation = {
	id: string;
	campaignId: string;
	recipientEmail: string;
	source: "SALES_EMAIL_BANNER" | "MANUAL_CUSTOMER";
	deliveryStatus: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
	deliveryAttemptedAt?: Date | null;
	deliveredAt?: Date | null;
	firstOpenedAt?: Date | null;
	expiresAt: Date;
	createdAt: Date | null;
	revokedAt?: Date | null;
	supersededAt?: Date | null;
	campaign: PartnershipCampaign;
	sentBy?: { id: number; name: string | null } | null;
};

type PartnershipApplication = {
	id: string;
	status: "PENDING" | "APPROVED" | "DENIED";
	submittedAt: Date;
	reviewedAt?: Date | null;
	decisionNote?: string | null;
};

type PartnershipDealer = {
	id: number;
	status: string | null;
	restricted: boolean | null;
	approvedAt?: Date | null;
	updatedAt?: Date | null;
};

export type DealerPartnershipSummary = {
	state: DealerPartnershipState;
	label: string;
	blockingReason: string | null;
	canSend: boolean;
	canResend: boolean;
	retryAt: Date | null;
	campaign: { id: string; title: string } | null;
	invitation: {
		id: string;
		source: PartnershipInvitation["source"];
		deliveryStatus: PartnershipInvitation["deliveryStatus"];
		recipientEmail: string;
		deliveryAttemptedAt: Date | null;
		deliveredAt: Date | null;
		firstOpenedAt: Date | null;
		expiresAt: Date;
		createdAt: Date | null;
		sentBy: { id: number; name: string | null } | null;
	} | null;
	application: PartnershipApplication | null;
	dealer: PartnershipDealer | null;
};

export class DealerProgramInvitationError extends Error {
	constructor(
		message: string,
		public readonly code: "CONFLICT" | "INELIGIBLE" | "NOT_FOUND" | "TOO_EARLY",
	) {
		super(message);
		this.name = "DealerProgramInvitationError";
	}
}

export type DealerRecruitmentCandidate = {
	customerId: number;
	customerEmail?: string | null;
	recipientEmail?: string | null;
	dealerOwnerId?: number | null;
	hasDealerAccount: boolean;
	hasActiveApplicationSuppression: boolean;
	audienceMatches: boolean;
};

export function buildOfficeCustomerVisibilityWhere(): Prisma.CustomersWhereInput {
	return {
		OR: [{ dealerOwnerId: null }, { officeVisibility: "SHARED" }],
	};
}

function normalizedEmail(value?: string | null) {
	return value?.trim().toLowerCase() || null;
}

function validEmail(value?: string | null) {
	const email = normalizedEmail(value);
	return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function isDealerRecruitmentCandidate(
	input: DealerRecruitmentCandidate,
) {
	const customerEmail = validEmail(input.customerEmail);
	const recipientEmail = validEmail(input.recipientEmail);

	return Boolean(
		input.customerId &&
			customerEmail &&
			recipientEmail &&
			customerEmail === recipientEmail &&
			input.dealerOwnerId == null &&
			!input.hasDealerAccount &&
			!input.hasActiveApplicationSuppression &&
			input.audienceMatches,
	);
}

export function hashDealerProgramInvitationToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export function createDealerProgramInvitationToken() {
	return randomBytes(32).toString("base64url");
}

export function campaignIsInWindow(
	campaign: { startsAt?: Date | null; endsAt?: Date | null },
	now: Date,
) {
	return (
		(!campaign.startsAt || campaign.startsAt <= now) &&
		(!campaign.endsAt || campaign.endsAt >= now)
	);
}

export function getDealerInvitationRetryAt(
	invitation: Pick<
		PartnershipInvitation,
		"deliveryStatus" | "deliveredAt" | "createdAt"
	>,
	now = new Date(),
) {
	if (
		invitation.deliveryStatus === "FAILED" ||
		invitation.deliveryStatus === "SKIPPED"
	) {
		return null;
	}
	const anchor =
		invitation.deliveryStatus === "PENDING"
			? invitation.createdAt
			: invitation.deliveredAt || invitation.createdAt;
	if (!anchor) return null;
	const delay =
		invitation.deliveryStatus === "PENDING"
			? INVITATION_PENDING_STALE_MS
			: INVITATION_RESEND_DELAY_MS;
	const retryAt = new Date(anchor.getTime() + delay);
	return retryAt > now ? retryAt : null;
}

const partnershipLabels: Record<DealerPartnershipState, string> = {
	ELIGIBLE: "Eligible",
	INELIGIBLE: "Ineligible",
	INVITE_PENDING: "Sending invitation",
	INVITE_SENT: "Invitation sent",
	INVITE_OPENED: "Invitation opened",
	INVITE_FAILED: "Invitation failed",
	INVITE_EXPIRED: "Invitation expired",
	CAMPAIGN_INACTIVE: "Campaign inactive",
	APPLICATION_PENDING: "Application pending",
	APPLICATION_DENIED: "Application denied",
	APPLICATION_APPROVED: "Application approved",
	DEALER_ACTIVE: "Registered dealer",
	DEALER_SUSPENDED: "Dealer suspended",
	DEALER_RESTRICTED: "Dealer restricted",
};

export function resolveDealerPartnershipSummary(input: {
	customer: {
		id: number;
		email?: string | null;
		dealerOwnerId?: number | null;
	};
	activeCampaign?: PartnershipCampaign | null;
	invitation?: PartnershipInvitation | null;
	application?: PartnershipApplication | null;
	dealer?: PartnershipDealer | null;
	canManage: boolean;
	now?: Date;
}): DealerPartnershipSummary {
	const now = input.now || new Date();
	const effectiveCampaign =
		input.activeCampaign &&
		input.activeCampaign.status === "ACTIVE" &&
		campaignIsInWindow(input.activeCampaign, now)
			? input.activeCampaign
			: null;
	let state: DealerPartnershipState;
	let blockingReason: string | null = null;

	if (input.dealer) {
		const dealerStatus = input.dealer.status?.toLowerCase() || "restricted";
		if (dealerStatus === "suspended") {
			state = "DEALER_SUSPENDED";
		} else if (
			input.dealer.restricted ||
			!["active", "approved"].includes(dealerStatus)
		) {
			state = "DEALER_RESTRICTED";
		} else {
			state = "DEALER_ACTIVE";
		}
		blockingReason = "This customer is already linked to a dealer account.";
	} else if (input.application) {
		state = `APPLICATION_${input.application.status}` as DealerPartnershipState;
		blockingReason =
			input.application.status === "DENIED"
				? "The denied application must be reset before another invitation."
				: "An application already exists for this customer.";
	} else if (input.invitation) {
		const invitationCampaignActive =
			input.invitation.campaign.status === "ACTIVE" &&
			campaignIsInWindow(input.invitation.campaign, now);
		if (
			input.invitation.deliveryStatus === "FAILED" ||
			input.invitation.deliveryStatus === "SKIPPED"
		) {
			state = "INVITE_FAILED";
			blockingReason =
				"The latest invitation was not accepted by the email provider.";
		} else if (input.invitation.expiresAt <= now) {
			state = "INVITE_EXPIRED";
			blockingReason = "The latest invitation has expired.";
		} else if (!invitationCampaignActive || !effectiveCampaign) {
			state = "CAMPAIGN_INACTIVE";
			blockingReason = "No active recruitment campaign is currently available.";
		} else if (input.invitation.deliveryStatus === "PENDING") {
			state = "INVITE_PENDING";
			blockingReason = getDealerInvitationRetryAt(input.invitation, now)
				? "The latest delivery attempt is still in progress."
				: "The latest delivery attempt is stale and can be retried.";
		} else if (input.invitation.firstOpenedAt) {
			state = "INVITE_OPENED";
		} else {
			state = "INVITE_SENT";
		}
	} else if (input.customer.dealerOwnerId != null) {
		state = "INELIGIBLE";
		blockingReason =
			"Dealer-owned customers cannot receive partnership invitations.";
	} else if (!validEmail(input.customer.email)) {
		state = "INELIGIBLE";
		blockingReason = "Add a valid customer email before sending an invitation.";
	} else if (!effectiveCampaign) {
		state = "CAMPAIGN_INACTIVE";
		blockingReason = "No active recruitment campaign is currently available.";
	} else {
		state = "ELIGIBLE";
	}

	const retryAt =
		input.invitation &&
		input.invitation.expiresAt > now &&
		input.invitation.campaign.status === "ACTIVE" &&
		campaignIsInWindow(input.invitation.campaign, now)
			? getDealerInvitationRetryAt(input.invitation, now)
			: null;
	const canAct =
		input.canManage &&
		Boolean(effectiveCampaign) &&
		!input.dealer &&
		!input.application &&
		input.customer.dealerOwnerId == null &&
		Boolean(validEmail(input.customer.email));
	const canSend = canAct && state === "ELIGIBLE";
	const resendableState = [
		"INVITE_PENDING",
		"INVITE_SENT",
		"INVITE_OPENED",
		"INVITE_FAILED",
		"INVITE_EXPIRED",
		"CAMPAIGN_INACTIVE",
	].includes(state);

	return {
		state,
		label: partnershipLabels[state],
		blockingReason,
		canSend,
		canResend: canAct && resendableState && retryAt == null,
		retryAt,
		campaign: effectiveCampaign
			? { id: effectiveCampaign.id, title: effectiveCampaign.title }
			: input.invitation?.campaign
				? {
						id: input.invitation.campaign.id,
						title: input.invitation.campaign.title,
					}
				: null,
		invitation: input.invitation
			? {
					id: input.invitation.id,
					source: input.invitation.source,
					deliveryStatus: input.invitation.deliveryStatus,
					recipientEmail: input.invitation.recipientEmail,
					deliveryAttemptedAt: input.invitation.deliveryAttemptedAt || null,
					deliveredAt: input.invitation.deliveredAt || null,
					firstOpenedAt: input.invitation.firstOpenedAt || null,
					expiresAt: input.invitation.expiresAt,
					createdAt: input.invitation.createdAt,
					sentBy: input.invitation.sentBy || null,
				}
			: null,
		application: input.application || null,
		dealer: input.dealer || null,
	};
}

export async function resolveDealerRecruitmentBanner(
	db: Database,
	input: {
		customerId: number;
		recipientEmail: string;
		baseUrl: string;
		now?: Date;
	},
) {
	const now = input.now ?? new Date();
	const [campaign, customer, activeApplication] = await Promise.all([
		db.dealerRecruitmentCampaign.findFirst({
			where: {
				status: "ACTIVE",
				deletedAt: null,
			},
			orderBy: {
				activatedAt: "desc",
			},
			include: {
				profiles: {
					select: { customerProfileId: true },
				},
				customers: {
					select: { customerId: true },
				},
			},
		}),
		db.customers.findFirst({
			where: {
				id: input.customerId,
				deletedAt: null,
			},
			select: {
				id: true,
				email: true,
				customerTypeId: true,
				dealerOwnerId: true,
				auth: {
					select: { id: true },
				},
			},
		}),
		db.dealerProgramApplication.findFirst({
			where: {
				customerId: input.customerId,
				deletedAt: null,
				suppressionResetAt: null,
			},
			select: { id: true },
		}),
	]);

	if (!campaign || !customer || !campaignIsInWindow(campaign, now)) {
		return null;
	}

	const selectedProfiles = new Set(
		campaign.profiles.map((profile) => profile.customerProfileId),
	);
	const selectedCustomers = new Set(
		campaign.customers.map((entry) => entry.customerId),
	);
	const audienceMatches =
		campaign.audienceMode === "ALL_ELIGIBLE" ||
		selectedCustomers.has(customer.id) ||
		(customer.customerTypeId != null &&
			selectedProfiles.has(customer.customerTypeId));

	if (
		!isDealerRecruitmentCandidate({
			customerId: customer.id,
			customerEmail: customer.email,
			recipientEmail: input.recipientEmail,
			dealerOwnerId: customer.dealerOwnerId,
			hasDealerAccount: Boolean(customer.auth),
			hasActiveApplicationSuppression: Boolean(activeApplication),
			audienceMatches,
		})
	) {
		return null;
	}
	const candidateEmail = customer.email?.trim().toLowerCase();
	if (!candidateEmail) return null;
	const dealerWithRecipientEmail = await db.dealerAuth.findFirst({
		where: {
			email: candidateEmail,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (dealerWithRecipientEmail) return null;
	const rawToken = createDealerProgramInvitationToken();
	const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
	const invitation = await db.$transaction(
		async (tx) => {
			const suppression = await tx.dealerProgramApplication.findFirst({
				where: {
					customerId: customer.id,
					deletedAt: null,
					suppressionResetAt: null,
				},
				select: { id: true },
			});
			if (suppression) return null;
			return tx.dealerRecruitmentInvitation.create({
				data: {
					campaignId: campaign.id,
					customerId: customer.id,
					recipientEmail: input.recipientEmail.trim().toLowerCase(),
					tokenHash: hashDealerProgramInvitationToken(rawToken),
					expiresAt,
					source: "SALES_EMAIL_BANNER",
					deliveryStatus: "PENDING",
				},
				select: {
					id: true,
				},
			});
		},
		{ isolationLevel: "Serializable" },
	);
	if (!invitation) return null;

	return {
		campaignId: campaign.id,
		invitationId: invitation.id,
		headline: campaign.headline,
		benefitText: campaign.benefitText,
		ctaLabel: campaign.ctaLabel,
		imageUrl: campaign.imageUrl,
		accentColor: campaign.accentColor,
		placement: campaign.placement,
		url: `${input.baseUrl.replace(/\/$/, "")}/dealer-program/${encodeURIComponent(rawToken)}`,
	};
}

export type DealerRecruitmentBanner = NonNullable<
	Awaited<ReturnType<typeof resolveDealerRecruitmentBanner>>
>;

export async function markDealerRecruitmentInvitationDelivered(
	db: Database,
	invitationId: string,
	deliveredAt = new Date(),
) {
	return markDealerRecruitmentInvitationDelivery(db, invitationId, {
		status: "SENT",
		attemptedAt: deliveredAt,
	});
}

export type DealerInvitationDeliveryResult = {
	status: "SENT" | "FAILED" | "SKIPPED";
	attemptedAt?: Date;
	providerMessageId?: string | null;
	providerStatus?: string | null;
	failure?: string | null;
};

function sanitizeDeliveryFailure(value?: string | null) {
	if (!value) return null;
	return (
		value
			.replace(/[\r\n\t]+/g, " ")
			.trim()
			.slice(0, 1000) || null
	);
}

export async function markDealerRecruitmentInvitationDelivery(
	db: Database,
	invitationId: string,
	result: DealerInvitationDeliveryResult,
) {
	const attemptedAt = result.attemptedAt || new Date();
	return db.dealerRecruitmentInvitation.updateMany({
		where: {
			id: invitationId,
			deliveryStatus: "PENDING",
			revokedAt: null,
			supersededAt: null,
			deletedAt: null,
		},
		data: {
			deliveryStatus: result.status,
			deliveryAttemptedAt: attemptedAt,
			deliveredAt: result.status === "SENT" ? attemptedAt : null,
			providerMessageId: result.providerMessageId || null,
			providerStatus: result.providerStatus || null,
			deliveryFailure: sanitizeDeliveryFailure(result.failure),
			revokedAt: result.status === "SENT" ? undefined : attemptedAt,
		},
	});
}

export async function getDealerPartnershipSummaries(
	db: Database,
	customers: Array<{
		id: number;
		email?: string | null;
		dealerOwnerId?: number | null;
	}>,
	input: { canManage: boolean; now?: Date },
) {
	if (!customers.length) return new Map<number, DealerPartnershipSummary>();
	const now = input.now || new Date();
	const customerIds = customers.map((customer) => customer.id);
	const emails = [
		...new Set(
			customers
				.map((customer) => normalizedEmail(customer.email))
				.filter((email): email is string => Boolean(email)),
		),
	];
	const [activeCampaign, invitations, applications, dealers] =
		await Promise.all([
			db.dealerRecruitmentCampaign.findFirst({
				where: { status: "ACTIVE", deletedAt: null },
				orderBy: { activatedAt: "desc" },
				select: {
					id: true,
					title: true,
					status: true,
					startsAt: true,
					endsAt: true,
				},
			}),
			db.dealerRecruitmentInvitation.findMany({
				where: { customerId: { in: customerIds }, deletedAt: null },
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					campaignId: true,
					customerId: true,
					recipientEmail: true,
					source: true,
					deliveryStatus: true,
					deliveryAttemptedAt: true,
					deliveredAt: true,
					firstOpenedAt: true,
					expiresAt: true,
					createdAt: true,
					revokedAt: true,
					supersededAt: true,
					campaign: {
						select: {
							id: true,
							title: true,
							status: true,
							startsAt: true,
							endsAt: true,
						},
					},
					sentBy: { select: { id: true, name: true } },
				},
			}),
			db.dealerProgramApplication.findMany({
				where: {
					customerId: { in: customerIds },
					deletedAt: null,
					suppressionResetAt: null,
				},
				orderBy: { submittedAt: "desc" },
				select: {
					id: true,
					customerId: true,
					status: true,
					submittedAt: true,
					reviewedAt: true,
					decisionNote: true,
				},
			}),
			db.dealerAuth.findMany({
				where: {
					deletedAt: null,
					OR: [
						{ dealerId: { in: customerIds } },
						...(emails.length ? [{ email: { in: emails } }] : []),
					],
				},
				select: {
					id: true,
					dealerId: true,
					email: true,
					status: true,
					restricted: true,
					approvedAt: true,
					updatedAt: true,
				},
			}),
		]);

	const latestInvitationByCustomer = new Map<
		number,
		(typeof invitations)[number]
	>();
	for (const invitation of invitations) {
		if (!latestInvitationByCustomer.has(invitation.customerId)) {
			latestInvitationByCustomer.set(invitation.customerId, invitation);
		}
	}
	const applicationByCustomer = new Map<
		number,
		(typeof applications)[number]
	>();
	for (const application of applications) {
		if (!applicationByCustomer.has(application.customerId)) {
			applicationByCustomer.set(application.customerId, application);
		}
	}
	const dealerByCustomer = new Map<number, (typeof dealers)[number]>();
	for (const customer of customers) {
		const email = normalizedEmail(customer.email);
		const dealer = dealers.find(
			(entry) =>
				entry.dealerId === customer.id ||
				(Boolean(email) && normalizedEmail(entry.email) === email),
		);
		if (dealer) dealerByCustomer.set(customer.id, dealer);
	}

	return new Map(
		customers.map((customer) => [
			customer.id,
			resolveDealerPartnershipSummary({
				customer,
				activeCampaign,
				invitation: latestInvitationByCustomer.get(customer.id),
				application: applicationByCustomer.get(customer.id),
				dealer: dealerByCustomer.get(customer.id),
				canManage: input.canManage,
				now,
			}),
		]),
	);
}

export type SendDealerInvitationDelivery = (input: {
	to: string;
	customerName: string;
	campaign: {
		title: string;
		headline: string;
		benefitText: string;
		ctaLabel: string;
		imageUrl: string | null;
		accentColor: string;
	};
	applicationUrl: string;
}) => Promise<DealerInvitationDeliveryResult>;

export async function sendDirectDealerProgramInvitation(
	db: Database,
	actorId: number,
	input: { customerId: number; baseUrl: string; now?: Date },
	deliver: SendDealerInvitationDelivery,
) {
	const now = input.now || new Date();
	const leaseId = randomUUID();
	const leaseExpiresAt = new Date(now.getTime() + INVITATION_SEND_LEASE_MS);
	await db.dealerRecruitmentCustomerState.upsert({
		where: { customerId: input.customerId },
		create: { customerId: input.customerId },
		update: {},
	});
	const acquired = await db.dealerRecruitmentCustomerState.updateMany({
		where: {
			customerId: input.customerId,
			OR: [
				{ sendLeaseId: null },
				{ sendLeaseExpiresAt: null },
				{ sendLeaseExpiresAt: { lte: now } },
			],
		},
		data: { sendLeaseId: leaseId, sendLeaseExpiresAt: leaseExpiresAt },
	});
	if (acquired.count !== 1) {
		throw new DealerProgramInvitationError(
			"An invitation is already being sent for this customer.",
			"CONFLICT",
		);
	}

	try {
		const prepared = await db.$transaction(
			async (tx) => {
				const [campaign, customer, application] = await Promise.all([
					tx.dealerRecruitmentCampaign.findFirst({
						where: { status: "ACTIVE", deletedAt: null },
						orderBy: { activatedAt: "desc" },
					}),
					tx.customers.findFirst({
						where: {
							id: input.customerId,
							dealerOwnerId: null,
							deletedAt: null,
						},
						select: {
							id: true,
							name: true,
							businessName: true,
							email: true,
							auth: { select: { id: true } },
						},
					}),
					tx.dealerProgramApplication.findFirst({
						where: {
							customerId: input.customerId,
							deletedAt: null,
							suppressionResetAt: null,
						},
						select: { id: true },
					}),
				]);
				if (!campaign || !campaignIsInWindow(campaign, now)) {
					throw new DealerProgramInvitationError(
						"An active recruitment campaign is required.",
						"INELIGIBLE",
					);
				}
				if (!customer) {
					throw new DealerProgramInvitationError(
						"This customer cannot receive a partnership invitation.",
						"NOT_FOUND",
					);
				}
				const email = validEmail(customer.email);
				if (!email) {
					throw new DealerProgramInvitationError(
						"Add a valid customer email before sending an invitation.",
						"INELIGIBLE",
					);
				}
				if (customer.auth || application) {
					throw new DealerProgramInvitationError(
						"This customer already has a dealer account or application.",
						"INELIGIBLE",
					);
				}
				const emailConflict = await tx.dealerAuth.findFirst({
					where: { email, deletedAt: null },
					select: { id: true },
				});
				if (emailConflict) {
					throw new DealerProgramInvitationError(
						"A dealer account already uses this email address.",
						"INELIGIBLE",
					);
				}
				const previous = await tx.dealerRecruitmentInvitation.findFirst({
					where: { customerId: customer.id, deletedAt: null },
					orderBy: { createdAt: "desc" },
					include: { campaign: true },
				});
				if (previous) {
					const previousCampaignActive =
						previous.campaign.status === "ACTIVE" &&
						campaignIsInWindow(previous.campaign, now);
					const retryAt =
						previous.expiresAt <= now || !previousCampaignActive
							? null
							: getDealerInvitationRetryAt(previous, now);
					if (retryAt) {
						throw new DealerProgramInvitationError(
							`This invitation can be resent after ${retryAt.toISOString()}.`,
							"TOO_EARLY",
						);
					}
				}
				const rawToken = createDealerProgramInvitationToken();
				const invitation = await tx.dealerRecruitmentInvitation.create({
					data: {
						campaignId: campaign.id,
						customerId: customer.id,
						recipientEmail: email,
						tokenHash: hashDealerProgramInvitationToken(rawToken),
						expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
						source: "MANUAL_CUSTOMER",
						deliveryStatus: "PENDING",
						deliveryAttemptedAt: now,
						sentById: actorId,
					},
				});
				await tx.dealerRecruitmentCustomerState.update({
					where: { customerId: customer.id },
					data: { latestInvitationId: invitation.id },
				});
				return { campaign, customer, email, invitation, rawToken };
			},
			{ isolationLevel: "Serializable" },
		);
		let result: DealerInvitationDeliveryResult;
		try {
			result = await deliver({
				to: prepared.email,
				customerName:
					prepared.customer.businessName ||
					prepared.customer.name ||
					"Valued customer",
				campaign: {
					title: prepared.campaign.title,
					headline: prepared.campaign.headline,
					benefitText: prepared.campaign.benefitText,
					ctaLabel: prepared.campaign.ctaLabel,
					imageUrl: prepared.campaign.imageUrl,
					accentColor: prepared.campaign.accentColor,
				},
				applicationUrl: `${input.baseUrl.replace(/\/$/, "")}/dealer-program/${encodeURIComponent(prepared.rawToken)}`,
			});
		} catch (error) {
			result = {
				status: "FAILED",
				failure:
					error instanceof Error ? error.message : "Email delivery failed.",
			};
		}
		const attemptedAt = result.attemptedAt || new Date();
		await db.$transaction(async (tx) => {
			const ownsCurrentLease =
				await tx.dealerRecruitmentCustomerState.findFirst({
					where: {
						customerId: prepared.customer.id,
						sendLeaseId: leaseId,
						latestInvitationId: prepared.invitation.id,
					},
					select: { customerId: true },
				});
			const deliveryUpdate = await markDealerRecruitmentInvitationDelivery(
				tx as unknown as Database,
				prepared.invitation.id,
				{ ...result, attemptedAt },
			);
			if (
				result.status === "SENT" &&
				ownsCurrentLease &&
				deliveryUpdate.count === 1
			) {
				await tx.dealerRecruitmentInvitation.updateMany({
					where: {
						customerId: prepared.customer.id,
						id: { not: prepared.invitation.id },
						application: null,
						deletedAt: null,
						revokedAt: null,
						supersededAt: null,
						createdAt: {
							lte: prepared.invitation.createdAt || now,
						},
					},
					data: {
						supersededAt: attemptedAt,
						supersededById: prepared.invitation.id,
					},
				});
			}
		});
		return {
			invitationId: prepared.invitation.id,
			campaignId: prepared.campaign.id,
			deliveryStatus: result.status,
		};
	} finally {
		await db.dealerRecruitmentCustomerState.updateMany({
			where: { customerId: input.customerId, sendLeaseId: leaseId },
			data: { sendLeaseId: null, sendLeaseExpiresAt: null },
		});
	}
}

export type DealerRecruitmentCampaignInput = {
	id?: string;
	title: string;
	audienceMode: "ALL_ELIGIBLE" | "SELECTED";
	headline: string;
	benefitText: string;
	ctaLabel: string;
	imageUrl?: string | null;
	accentColor: string;
	placement: "TOP" | "BOTTOM";
	startsAt?: Date | null;
	endsAt?: Date | null;
	customerProfileIds?: number[];
	customerIds?: number[];
};

export async function listDealerRecruitmentCampaigns(db: Database) {
	return db.dealerRecruitmentCampaign.findMany({
		where: { deletedAt: null },
		orderBy: { createdAt: "desc" },
		include: {
			profiles: { select: { customerProfileId: true } },
			customers: { select: { customerId: true } },
			_count: {
				select: {
					invitations: true,
					applications: true,
				},
			},
			invitations: {
				select: {
					deliveredAt: true,
					firstOpenedAt: true,
				},
			},
			applications: {
				select: { status: true },
			},
		},
	});
}

export async function saveDealerRecruitmentCampaign(
	db: Database,
	actorId: number,
	input: DealerRecruitmentCampaignInput,
) {
	if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
		throw new Error("Campaign end date must be after its start date.");
	}
	const profileIds = [...new Set(input.customerProfileIds || [])];
	const customerIds = [...new Set(input.customerIds || [])];
	const data = {
		title: input.title.trim(),
		audienceMode: input.audienceMode,
		headline: input.headline.trim(),
		benefitText: input.benefitText.trim(),
		ctaLabel: input.ctaLabel.trim(),
		imageUrl: input.imageUrl?.trim() || null,
		accentColor: input.accentColor.trim(),
		placement: input.placement,
		startsAt: input.startsAt || null,
		endsAt: input.endsAt || null,
		updatedById: actorId,
	};

	return db.$transaction(
		async (tx) => {
			const campaign = input.id
				? await tx.dealerRecruitmentCampaign.update({
						where: { id: input.id, deletedAt: null },
						data,
					})
				: await tx.dealerRecruitmentCampaign.create({
						data: { ...data, createdById: actorId },
					});

			await Promise.all([
				tx.dealerRecruitmentCampaignProfile.deleteMany({
					where: { campaignId: campaign.id },
				}),
				tx.dealerRecruitmentCampaignCustomer.deleteMany({
					where: { campaignId: campaign.id },
				}),
			]);
			if (profileIds.length) {
				await tx.dealerRecruitmentCampaignProfile.createMany({
					data: profileIds.map((customerProfileId) => ({
						campaignId: campaign.id,
						customerProfileId,
					})),
				});
			}
			if (customerIds.length) {
				await tx.dealerRecruitmentCampaignCustomer.createMany({
					data: customerIds.map((customerId) => ({
						campaignId: campaign.id,
						customerId,
					})),
				});
			}
			return campaign;
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function setDealerRecruitmentCampaignStatus(
	db: Database,
	actorId: number,
	input: {
		id: string;
		status: "ACTIVE" | "PAUSED" | "ARCHIVED";
	},
) {
	return db.$transaction(
		async (tx) => {
			const campaign = await tx.dealerRecruitmentCampaign.findFirst({
				where: { id: input.id, deletedAt: null },
				select: { id: true, status: true },
			});
			if (!campaign) throw new Error("Recruitment campaign was not found.");
			if (campaign.status === "ARCHIVED") {
				throw new Error("Archived campaigns cannot be changed.");
			}
			if (input.status === "ACTIVE") {
				await tx.dealerRecruitmentCampaign.updateMany({
					where: {
						id: { not: input.id },
						status: "ACTIVE",
						deletedAt: null,
					},
					data: { status: "PAUSED", updatedById: actorId },
				});
			}
			return tx.dealerRecruitmentCampaign.update({
				where: { id: input.id },
				data: {
					status: input.status,
					updatedById: actorId,
					activatedAt: input.status === "ACTIVE" ? new Date() : undefined,
				},
			});
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function getDealerProgramInvitation(
	db: Database,
	rawToken: string,
	input: { recordOpen?: boolean; now?: Date } = {},
) {
	const now = input.now || new Date();
	const invitation = await db.dealerRecruitmentInvitation.findFirst({
		where: {
			tokenHash: hashDealerProgramInvitationToken(rawToken),
			expiresAt: { gt: now },
			revokedAt: null,
			supersededAt: null,
			deletedAt: null,
		},
		include: {
			campaign: true,
			application: {
				select: {
					id: true,
					status: true,
					submittedAt: true,
				},
			},
		},
	});
	if (!invitation) return null;
	if (!invitation.application && invitation.campaign.status !== "ACTIVE") {
		return null;
	}
	if (
		!invitation.application &&
		!campaignIsInWindow(invitation.campaign, now)
	) {
		return null;
	}

	const customer = await db.customers.findFirst({
		where: {
			id: invitation.customerId,
			dealerOwnerId: null,
			deletedAt: null,
		},
		select: {
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			address: true,
			auth: {
				select: { id: true },
			},
			addressBooks: {
				where: { deletedAt: null, isPrimary: true },
				take: 1,
				select: {
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
					meta: true,
				},
			},
		},
	});
	if (
		!customer ||
		normalizedEmail(customer.email) !==
			normalizedEmail(invitation.recipientEmail) ||
		customer.auth
	) {
		return null;
	}
	const dealerEmailConflict = await db.dealerAuth.findFirst({
		where: {
			email: invitation.recipientEmail.trim().toLowerCase(),
			deletedAt: null,
		},
		select: { id: true },
	});
	if (dealerEmailConflict) return null;

	if (input.recordOpen) {
		await db.dealerRecruitmentInvitation.update({
			where: { id: invitation.id },
			data: {
				firstOpenedAt: invitation.firstOpenedAt || now,
				lastOpenedAt: now,
				openCount: { increment: 1 },
			},
		});
	}

	return {
		invitationId: invitation.id,
		campaign: {
			id: invitation.campaign.id,
			title: invitation.campaign.title,
			headline: invitation.campaign.headline,
			benefitText: invitation.campaign.benefitText,
		},
		customer,
		application: invitation.application,
		expiresAt: invitation.expiresAt,
	};
}

export async function submitDealerProgramApplication(
	db: Database,
	rawToken: string,
) {
	const tokenHash = hashDealerProgramInvitationToken(rawToken);
	const now = new Date();
	return db.$transaction(
		async (tx) => {
			const invitation = await tx.dealerRecruitmentInvitation.findFirst({
				where: {
					tokenHash,
					expiresAt: { gt: now },
					revokedAt: null,
					supersededAt: null,
					deletedAt: null,
					campaign: {
						status: "ACTIVE",
						deletedAt: null,
						AND: [
							{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
							{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
						],
					},
				},
				include: { application: true },
			});
			if (!invitation) {
				throw new Error("This dealership invitation is invalid or expired.");
			}
			const customer = await tx.customers.findFirst({
				where: {
					id: invitation.customerId,
					dealerOwnerId: null,
					deletedAt: null,
				},
				select: { email: true, auth: { select: { id: true } } },
			});
			if (
				!customer ||
				customer.auth ||
				normalizedEmail(customer.email) !==
					normalizedEmail(invitation.recipientEmail)
			) {
				throw new Error("This dealership invitation is no longer eligible.");
			}
			const dealerEmailConflict = await tx.dealerAuth.findFirst({
				where: {
					email: invitation.recipientEmail.trim().toLowerCase(),
					deletedAt: null,
				},
				select: { id: true },
			});
			if (dealerEmailConflict) {
				throw new Error("This customer already has a dealer account.");
			}
			if (invitation.application) {
				return { application: invitation.application, created: false };
			}

			const previous = await tx.dealerProgramApplication.findFirst({
				where: {
					customerId: invitation.customerId,
					deletedAt: null,
					suppressionResetAt: null,
				},
			});
			if (previous) return { application: previous, created: false };

			const application = await tx.dealerProgramApplication.create({
				data: {
					campaignId: invitation.campaignId,
					invitationId: invitation.id,
					customerId: invitation.customerId,
					consentAt: new Date(),
				},
			});
			return { application, created: true };
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function listDealerProgramApplications(db: Database) {
	const applications = await db.dealerProgramApplication.findMany({
		where: { deletedAt: null },
		orderBy: { submittedAt: "desc" },
		include: {
			campaign: { select: { id: true, title: true } },
			invitation: { select: { recipientEmail: true } },
		},
	});
	const customerIds = [...new Set(applications.map((row) => row.customerId))];
	const customers = customerIds.length
		? await db.customers.findMany({
				where: { id: { in: customerIds } },
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
					phoneNo: true,
				},
			})
		: [];
	const byId = new Map(customers.map((customer) => [customer.id, customer]));
	return applications.map((application) => ({
		...application,
		customer: byId.get(application.customerId) || null,
	}));
}

export async function decideDealerProgramApplication(
	db: Database,
	actorId: number,
	input: {
		id: string;
		decision: "APPROVED" | "DENIED";
		note?: string | null;
	},
) {
	return db.$transaction(
		async (tx) => {
			const application = await tx.dealerProgramApplication.findFirst({
				where: { id: input.id, deletedAt: null },
				include: {
					invitation: true,
				},
			});
			if (!application) throw new Error("Application was not found.");
			if (application.status !== "PENDING") {
				if (application.status === input.decision) {
					return {
						application,
						onboardingToken: null,
						idempotent: true,
					};
				}
				throw new Error("This application has already been decided.");
			}
			const customer = await tx.customers.findFirst({
				where: {
					id: application.customerId,
					dealerOwnerId: null,
					deletedAt: null,
				},
			});
			if (!customer?.email) {
				throw new Error("The applicant customer has no email address.");
			}

			if (input.decision === "DENIED") {
				const decided = await tx.dealerProgramApplication.update({
					where: { id: application.id },
					data: {
						status: "DENIED",
						reviewedAt: new Date(),
						reviewedById: actorId,
						decisionNote: input.note?.trim() || null,
					},
				});
				return {
					application: decided,
					customer,
					onboardingToken: null,
					idempotent: false,
				};
			}

			const email = customer.email.trim().toLowerCase();
			const existingDealer = await tx.dealerAuth.findFirst({
				where: {
					OR: [{ dealerId: customer.id }, { email }],
					deletedAt: null,
				},
			});
			if (existingDealer?.dealerId && existingDealer.dealerId !== customer.id) {
				throw new Error(
					"Another dealer account already uses this applicant email.",
				);
			}
			const dealer = existingDealer
				? await tx.dealerAuth.update({
						where: { id: existingDealer.id },
						data: {
							dealerId: customer.id,
							email,
							name: customer.name,
							companyName: customer.businessName,
							phoneNo: customer.phoneNo,
							status: "approved",
							restricted: false,
							approvedAt: new Date(),
						},
					})
				: await tx.dealerAuth.create({
						data: {
							dealerId: customer.id,
							email,
							name: customer.name,
							companyName: customer.businessName,
							phoneNo: customer.phoneNo,
							status: "approved",
							restricted: false,
							approvedAt: new Date(),
						},
					});
			await tx.dealerToken.updateMany({
				where: { dealerId: dealer.id, consumedAt: null },
				data: { consumedAt: new Date() },
			});
			const onboardingToken = randomUUID();
			await tx.dealerToken.create({
				data: {
					dealerId: dealer.id,
					token: onboardingToken,
					expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				},
			});
			await tx.dealerStatusHistory.create({
				data: {
					dealerId: dealer.id,
					status: "approved",
					authorId: actorId,
					reason: input.note?.trim() || "Dealership application approved.",
				},
			});
			const decided = await tx.dealerProgramApplication.update({
				where: { id: application.id },
				data: {
					status: "APPROVED",
					reviewedAt: new Date(),
					reviewedById: actorId,
					decisionNote: input.note?.trim() || null,
					dealerAuthId: dealer.id,
				},
			});
			return {
				application: decided,
				customer,
				dealer,
				onboardingToken,
				idempotent: false,
			};
		},
		{ isolationLevel: "Serializable" },
	);
}

export async function resetDealerProgramApplicationSuppression(
	db: Database,
	actorId: number,
	input: { id: string; reason: string },
) {
	return db.dealerProgramApplication.update({
		where: { id: input.id },
		data: {
			suppressionResetAt: new Date(),
			suppressionResetById: actorId,
			suppressionResetReason: input.reason.trim(),
		},
	});
}

export async function setDealerAccountSuspension(
	db: Database,
	actorId: number,
	input: {
		dealerId: number;
		suspended: boolean;
		reason?: string | null;
	},
) {
	return db.$transaction(async (tx) => {
		const dealer = await tx.dealerAuth.findFirst({
			where: { id: input.dealerId, deletedAt: null },
		});
		if (!dealer) throw new Error("Dealer account was not found.");
		const status = input.suspended ? "suspended" : "active";
		if (
			dealer.status === status &&
			Boolean(dealer.restricted) === input.suspended
		) {
			return { dealer, changed: false };
		}
		const updated = await tx.dealerAuth.update({
			where: { id: dealer.id },
			data: {
				status,
				restricted: input.suspended,
			},
		});
		await tx.dealerStatusHistory.create({
			data: {
				dealerId: dealer.id,
				status,
				authorId: actorId,
				reason:
					input.reason?.trim() ||
					(input.suspended
						? "Dealer account suspended."
						: "Dealer account reactivated."),
			},
		});
		return { dealer: updated, changed: true };
	});
}
