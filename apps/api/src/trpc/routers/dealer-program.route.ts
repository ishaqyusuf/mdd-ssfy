import {
	dealerAccountSuspensionSchema,
	dealerProgramApplicationDecisionSchema,
	dealerProgramApplicationResetSchema,
	dealerProgramApplicationSubmitSchema,
	dealerProgramTokenSchema,
	dealerRecruitmentCampaignSchema,
	dealerRecruitmentCampaignStatusSchema,
} from "@api/schemas/dealer-program";
import type { TRPCContext } from "@api/trpc/init";
import {
	decideDealerProgramApplication,
	getDealerProgramInvitation,
	listDealerProgramApplications,
	listDealerRecruitmentCampaigns,
	resetDealerProgramApplicationSuppression,
	saveDealerRecruitmentCampaign,
	setDealerAccountSuspension,
	setDealerRecruitmentCampaignStatus,
	submitDealerProgramApplication,
} from "@gnd/db/queries";
import { EmailService } from "@gnd/notifications/services/email-service";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

async function requireSuperAdmin(ctx: TRPCContext) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const user = await ctx.db.users.findFirst({
		where: { id: ctx.userId, deletedAt: null },
		select: {
			roles: {
				where: { deletedAt: null },
				select: { role: { select: { name: true } } },
			},
		},
	});
	if (
		!user?.roles.some(
			(entry) => entry.role?.name?.toLowerCase() === "super admin",
		)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can manage the dealership program.",
		});
	}
	return ctx.userId;
}

async function getActiveSuperAdmins(ctx: TRPCContext) {
	return ctx.db.users.findMany({
		where: {
			deletedAt: null,
			roles: {
				some: {
					deletedAt: null,
					role: { name: { equals: "Super Admin" } },
				},
			},
		},
		select: { id: true, name: true, email: true },
	});
}

async function notifyApplicationSubmitted(
	ctx: TRPCContext,
	application: Awaited<
		ReturnType<typeof submitDealerProgramApplication>
	>["application"],
) {
	const customer = await ctx.db.customers.findUnique({
		where: { id: application.customerId },
		select: { name: true, businessName: true, email: true },
	});
	if (!customer?.email) return;
	const customerName = customer.businessName || customer.name || customer.email;
	const emailService = new EmailService(ctx.db);
	const superAdmins = await getActiveSuperAdmins(ctx);
	await Promise.allSettled([
		emailService.sendTransactional({
			to: customer.email,
			subject: "We received your dealership partnership request",
			template: "dealer-program-status",
			data: {
				preview: "Your dealership partnership request is being reviewed",
				heading: "Request received",
				recipientName: customerName,
				message:
					"We received your request to join the GND dealership partnership program. Our team is reviewing it and will contact you when a decision is ready.",
			},
		}),
		...superAdmins
			.filter((admin): admin is typeof admin & { email: string } =>
				Boolean(admin.email),
			)
			.map((admin) =>
				emailService.sendTransactional({
					to: admin.email,
					subject: `New dealership application from ${customerName}`,
					template: "dealer-program-status",
					data: {
						preview: "A customer submitted a dealership application",
						heading: "New dealership application",
						recipientName: admin.name,
						message: `${customerName} submitted a request to join the dealership program.`,
						actionLabel: "Review applications",
						actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sales-book/dealers?tab=applications`,
					},
				}),
			),
	]);

	const contacts = await ctx.db.notePadContacts.findMany({
		where: {
			role: "employee",
			profileId: { in: superAdmins.map((admin) => admin.id) },
			deletedAt: null,
		},
		select: { id: true, profileId: true },
	});
	const sender = contacts[0];
	if (sender && contacts.length) {
		await ctx.db.notePad.create({
			data: {
				subject: "New dealership application",
				headline: `${customerName} requested dealership partnership.`,
				note: `Application ${application.id} is ready for review.`,
				senderContactId: sender.id,
				recipients: {
					createMany: {
						data: contacts.map((contact) => ({
							notePadContactId: contact.id,
							status: "unread",
						})),
					},
				},
				tags: {
					createMany: {
						data: [
							{ tagName: "channel", tagValue: "dealer_program_application" },
							{ tagName: "applicationId", tagValue: application.id },
						],
					},
				},
			},
		});
	}
}

function dealershipUrl() {
	return (
		process.env.NEXT_PUBLIC_DEALERSHIP_URL || "http://localhost:3016"
	).replace(/\/$/, "");
}

export const dealerProgramRouter = createTRPCRouter({
	invitation: publicProcedure
		.input(dealerProgramTokenSchema)
		.query(({ ctx, input }) =>
			getDealerProgramInvitation(ctx.db, input.token, { recordOpen: true }),
		),
	submitApplication: publicProcedure
		.input(dealerProgramApplicationSubmitSchema)
		.mutation(async ({ ctx, input }) => {
			const result = await submitDealerProgramApplication(ctx.db, input.token);
			if (result.created && result.application.status === "PENDING") {
				try {
					await notifyApplicationSubmitted(ctx, result.application);
				} catch (error) {
					console.error(
						"Dealership application was saved, but its notifications failed.",
						error,
					);
				}
			}
			return {
				id: result.application.id,
				status: result.application.status,
				submittedAt: result.application.submittedAt,
			};
		}),
	campaigns: protectedProcedure.query(async ({ ctx }) => {
		await requireSuperAdmin(ctx);
		return listDealerRecruitmentCampaigns(ctx.db);
	}),
	audienceOptions: protectedProcedure.query(async ({ ctx }) => {
		await requireSuperAdmin(ctx);
		const [profiles, customers] = await Promise.all([
			ctx.db.customerTypes.findMany({
				where: { dealerOwnerId: null, deletedAt: null },
				orderBy: { title: "asc" },
				select: { id: true, title: true },
			}),
			ctx.db.customers.findMany({
				where: {
					dealerOwnerId: null,
					deletedAt: null,
					email: { not: null },
					auth: null,
				},
				orderBy: { updatedAt: "desc" },
				take: 500,
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
				},
			}),
		]);
		return { profiles, customers };
	}),
	saveCampaign: protectedProcedure
		.input(dealerRecruitmentCampaignSchema)
		.mutation(async ({ ctx, input }) => {
			const actorId = await requireSuperAdmin(ctx);
			return saveDealerRecruitmentCampaign(ctx.db, actorId, {
				...input,
				imageUrl: input.imageUrl || null,
			});
		}),
	setCampaignStatus: protectedProcedure
		.input(dealerRecruitmentCampaignStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const actorId = await requireSuperAdmin(ctx);
			return setDealerRecruitmentCampaignStatus(ctx.db, actorId, input);
		}),
	applications: protectedProcedure.query(async ({ ctx }) => {
		await requireSuperAdmin(ctx);
		return listDealerProgramApplications(ctx.db);
	}),
	decideApplication: protectedProcedure
		.input(dealerProgramApplicationDecisionSchema)
		.mutation(async ({ ctx, input }) => {
			const actorId = await requireSuperAdmin(ctx);
			const result = await decideDealerProgramApplication(
				ctx.db,
				actorId,
				input,
			);
			if (result.idempotent) return result;
			const customer = "customer" in result ? result.customer : null;
			if (customer?.email) {
				const approved = input.decision === "APPROVED";
				const onboardingLink =
					approved && result.onboardingToken
						? `${dealershipUrl()}/create-password/${result.onboardingToken}`
						: null;
				await new EmailService(ctx.db)
					.sendTransactional({
						to: customer.email,
						subject: approved
							? "Your dealership application was approved"
							: "Update on your dealership application",
						template: approved ? "dealer-onboarding" : "dealer-program-status",
						data: approved
							? {
									dealerName:
										customer.businessName || customer.name || customer.email,
									onboardingLink,
									expiresAt: new Date(
										Date.now() + 7 * 24 * 60 * 60 * 1000,
									).toISOString(),
								}
							: {
									preview: "An update on your dealership request",
									heading: "Application update",
									recipientName:
										customer.businessName || customer.name || customer.email,
									message:
										"Your request to join the dealership program was not approved at this time.",
									note: input.note || null,
								},
					})
					.catch((error) => {
						console.error(
							"Application decision was saved, but its email failed.",
							error,
						);
					});
			}
			return result;
		}),
	resetSuppression: protectedProcedure
		.input(dealerProgramApplicationResetSchema)
		.mutation(async ({ ctx, input }) => {
			const actorId = await requireSuperAdmin(ctx);
			return resetDealerProgramApplicationSuppression(ctx.db, actorId, input);
		}),
	setDealerSuspension: protectedProcedure
		.input(dealerAccountSuspensionSchema)
		.mutation(async ({ ctx, input }) => {
			const actorId = await requireSuperAdmin(ctx);
			const result = await setDealerAccountSuspension(ctx.db, actorId, input);
			const dealer = result.dealer;
			if (!result.changed) return result;
			await new EmailService(ctx.db)
				.sendTransactional({
					to: dealer.email,
					subject: input.suspended
						? "Your dealer account has been suspended"
						: "Your dealer account has been reactivated",
					template: "dealer-program-status",
					data: {
						preview: input.suspended
							? "Dealer account suspended"
							: "Dealer account reactivated",
						heading: input.suspended
							? "Account suspended"
							: "Account reactivated",
						recipientName: dealer.companyName || dealer.name || dealer.email,
						message: input.suspended
							? "Access to your dealer portal and new dealer operations has been suspended. Existing approved office fulfillment and historical records remain intact."
							: "Your dealer portal access and dealer operations are active again.",
						note: input.reason || null,
						actionLabel: input.suspended ? null : "Open dealer portal",
						actionUrl: input.suspended ? null : dealershipUrl(),
					},
				})
				.catch((error) => {
					console.error(
						"Dealer lifecycle status changed, but its email failed.",
						error,
					);
				});
			return result;
		}),
});
