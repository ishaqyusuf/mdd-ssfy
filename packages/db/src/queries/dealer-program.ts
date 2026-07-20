import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Database, Prisma } from "../index";

const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

export function isDealerRecruitmentCandidate(
	input: DealerRecruitmentCandidate,
) {
	const customerEmail = normalizedEmail(input.customerEmail);
	const recipientEmail = normalizedEmail(input.recipientEmail);

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

function campaignIsInWindow(
	campaign: { startsAt?: Date | null; endsAt?: Date | null },
	now: Date,
) {
	return (
		(!campaign.startsAt || campaign.startsAt <= now) &&
		(!campaign.endsAt || campaign.endsAt >= now)
	);
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
	return db.dealerRecruitmentInvitation.updateMany({
		where: {
			id: invitationId,
			deliveredAt: null,
			deletedAt: null,
		},
		data: {
			deliveredAt,
		},
	});
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
