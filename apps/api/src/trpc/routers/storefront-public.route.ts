import { createHash } from "node:crypto";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import {
	createStorefrontInvoiceAccess,
	deleteStorefrontAddress,
	getStorefrontAccount,
	getStorefrontOrder,
	listStorefrontOrders,
	saveStorefrontAddress,
	updateStorefrontProfile,
} from "@api/db/queries/storefront-account";
import {
	confirmStorefrontCheckoutPayment,
	createStorefrontCheckout,
	getStorefrontCheckoutState,
} from "@api/db/queries/storefront-checkout";
import {
	assertStorefrontLineOwnership,
	getOrCreateStorefrontCollection,
	getStorefrontCollection,
	storefrontConfigurationInputSchema,
	validateAndPriceStorefrontConfiguration,
} from "@api/db/queries/storefront-commerce";
import {
	storefrontAddressIdSchema,
	storefrontAddressInputSchema,
	storefrontOrderIdSchema,
	storefrontOrderListSchema,
	storefrontProfileInputSchema,
} from "@api/schemas/storefront-account";
import {
	createStorefrontCheckoutSchema,
	storefrontCheckoutIdSchema,
} from "@api/schemas/storefront-checkout";
import type { TRPCContext } from "@api/trpc/init";
import { requireStorefrontRateLimit } from "@api/utils/storefront-rate-limit";
import type { Prisma } from "@gnd/db";
import { multiplyMoney } from "@gnd/sales/payment-system";
import {
	normalizeStorefrontAvailability,
	projectStorefrontOfferRoute,
	resolveStorefrontProductTypes,
} from "@gnd/sales/storefront-configuration";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, customerProcedure, publicProcedure } from "../init";

const slugSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(1)
		.max(191)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
const lineIdSchema = z.object({ lineId: z.string().trim().min(1) });
const quantitySchema = lineIdSchema.extend({
	quantity: z.number().positive().max(10_000),
});
const inquirySchema = z.object({
	type: z.enum(["CONTACT", "CUSTOM_QUOTE"]),
	name: z.string().trim().min(2).max(255),
	email: z.string().trim().email().max(320),
	phone: z.string().trim().max(64).nullable().optional(),
	subject: z.string().trim().max(255).nullable().optional(),
	message: z.string().trim().min(10).max(20_000),
	projectTypes: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
	budget: z.string().trim().max(191).nullable().optional(),
	website: z.string().max(0).optional(),
});

function asJson(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

async function writeCommerceAudit(input: {
	ctx: TRPCContext;
	action: string;
	entityId?: string;
	metadata?: Record<string, unknown>;
}) {
	await input.ctx.db.storefrontAuditEvent.create({
		data: {
			actorUserId: input.ctx.userId,
			guestHash: input.ctx.userId ? null : input.ctx.guestTokenHash,
			action: input.action,
			entityType: "StorefrontCommerceLine",
			entityId: input.entityId,
			requestId: input.ctx.requestId,
			userAgent: input.ctx.userAgent,
			metadata: asJson(input.metadata || {}),
		},
	});
}

export const storefrontPublicRouter = createTRPCRouter({
	inquiry: {
		submit: publicProcedure
			.input(inquirySchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontRateLimit({
					ctx,
					action: "inquiry",
					identity: input.email,
					limit: 5,
					windowSeconds: 60 * 60,
				});
				const inquiry = await ctx.db.storefrontInquiry.create({
					data: {
						type: input.type,
						ownerUserId: ctx.userId,
						name: input.name,
						email: input.email.toLowerCase(),
						phone: input.phone || null,
						subject: input.subject || null,
						message: input.message,
						projectTypes: asJson(input.projectTypes),
						budget: input.budget || null,
						requestId: ctx.requestId,
						ipHash: ctx.ipAddress
							? createHash("sha256").update(ctx.ipAddress).digest("hex")
							: null,
					},
				});
				await ctx.db.storefrontAuditEvent.create({
					data: {
						actorUserId: ctx.userId,
						guestHash: ctx.userId ? null : ctx.guestTokenHash,
						action: "inquiry.submitted",
						entityType: "StorefrontInquiry",
						entityId: inquiry.id,
						requestId: ctx.requestId,
						metadata: { type: inquiry.type },
					},
				});
				return {
					id: inquiry.id,
					message:
						"Thank you. Your request was received and our team will follow up.",
				};
			}),
	},

	catalog: {
		sitemap: publicProcedure.query(async ({ ctx }) => {
			const [categories, offers, pages] = await Promise.all([
				ctx.db.storefrontCategory.findMany({
					where: {
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
					},
					select: { slug: true, updatedAt: true },
					take: 1_000,
				}),
				ctx.db.storefrontOffer.findMany({
					where: {
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
					},
					select: { slug: true, updatedAt: true },
					take: 10_000,
				}),
				ctx.db.storefrontPage.findMany({
					where: {
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
					},
					select: { slug: true, updatedAt: true },
					take: 1_000,
				}),
			]);
			return { categories, offers, pages };
		}),
		categories: publicProcedure.query(async ({ ctx }) => {
			const categories = await ctx.db.storefrontCategory.findMany({
				where: {
					status: "PUBLISHED",
					publishedAt: { lte: new Date() },
					deletedAt: null,
				},
				orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
				take: 250,
				select: {
					id: true,
					slug: true,
					title: true,
					description: true,
					imageUrl: true,
					_count: {
						select: {
							offers: {
								where: {
									status: "PUBLISHED",
									publishedAt: { lte: new Date() },
									deletedAt: null,
								},
							},
						},
					},
				},
			});
			return categories.map(({ _count, ...category }) => ({
				...category,
				href: `/categories/${category.slug}`,
				offerCount: _count.offers,
			}));
		}),
		featured: publicProcedure
			.input(z.object({ limit: z.number().int().min(1).max(24).default(8) }))
			.query(async ({ ctx, input }) => {
				const offers = await ctx.db.storefrontOffer.findMany({
					where: {
						featured: true,
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
						category: {
							status: "PUBLISHED",
							publishedAt: { lte: new Date() },
							deletedAt: null,
						},
					},
					orderBy: [
						{ featuredOrder: "asc" },
						{ sortOrder: "asc" },
						{ title: "asc" },
					],
					take: input.limit,
					select: {
						id: true,
						slug: true,
						title: true,
						description: true,
						imageUrl: true,
						availability: true,
						category: { select: { slug: true, title: true } },
					},
				});
				return {
					items: offers.map((offer) => ({
						...offer,
						availability: normalizeStorefrontAvailability(offer.availability),
						href: `/product/${offer.category.slug}/${offer.slug}`,
					})),
				};
			}),

		category: publicProcedure
			.input(slugSchema)
			.query(async ({ ctx, input }) => {
				const category = await ctx.db.storefrontCategory.findFirst({
					where: {
						slug: input.slug,
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
					},
					select: {
						id: true,
						slug: true,
						title: true,
						description: true,
						imageUrl: true,
						seo: true,
						offers: {
							where: {
								status: "PUBLISHED",
								publishedAt: { lte: new Date() },
								deletedAt: null,
							},
							orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
							take: 1_000,
							select: {
								id: true,
								slug: true,
								title: true,
								description: true,
								imageUrl: true,
								availability: true,
								configurationVersion: true,
							},
						},
					},
				});
				if (!category) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Category not found.",
					});
				}
				return {
					...category,
					offers: category.offers.map((offer) => ({
						...offer,
						availability: normalizeStorefrontAvailability(offer.availability),
						href: `/product/${category.slug}/${offer.slug}`,
					})),
				};
			}),

		offer: publicProcedure.input(slugSchema).query(async ({ ctx, input }) => {
			const offer = await ctx.db.storefrontOffer.findFirst({
				where: {
					slug: input.slug,
					status: "PUBLISHED",
					publishedAt: { lte: new Date() },
					deletedAt: null,
					category: {
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
					},
				},
				include: {
					category: true,
					stepPolicies: { orderBy: { sortOrder: "asc" } },
					componentPolicies: { orderBy: { sortOrder: "asc" } },
				},
			});
			if (!offer) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Product not found.",
				});
			}
			const routeData = await getNewSalesFormStepRouting(ctx, {});
			const productTypes = resolveStorefrontProductTypes({
				routeData,
				rootStepUid: offer.category.rootStepUid,
				fallbackRootComponentUid: offer.category.rootComponentUid,
				offerSourceStepUid: offer.sourceStepUid,
				offerSourceComponentUid: offer.sourceComponentUid,
			});
			const route = routeData.composedRouter[offer.category.rootComponentUid];
			const stepUids = [
				offer.category.rootStepUid,
				...(route?.routeSequence.map((step) => step.uid) ?? []),
			];
			const components = await ctx.db.storefrontComponent.findMany({
				where: {
					sourceStepUid: { in: stepUids },
					availableOnStorefront: true,
					status: "PUBLISHED",
					deletedAt: null,
				},
				take: 5_000,
			});
			const policy = projectStorefrontOfferRoute({
				routeData,
				rootStepUid: offer.category.rootStepUid,
				rootComponentUid: offer.category.rootComponentUid,
				rootComponentUids: productTypes.map((component) => component.uid),
				offerSourceStepUid: offer.sourceStepUid,
				offerSourceComponentUid: offer.sourceComponentUid,
				stepPolicies: offer.stepPolicies.map((step) => ({
					...step,
					metadata: (step.metadata as Record<string, unknown> | null) || null,
				})),
				componentPolicies: offer.componentPolicies.map((component) => ({
					...component,
					metadata:
						(component.metadata as Record<string, unknown> | null) || null,
				})),
				components: components.map((component) => ({
					...component,
					metadata:
						(component.metadata as Record<string, unknown> | null) || null,
				})),
			});
			if (!policy.ready) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "This product is temporarily unavailable.",
				});
			}
			const sourceOverlay = components.find(
				(component) =>
					component.sourceComponentUid === offer.sourceComponentUid,
			);
			const overlayMetadata =
				sourceOverlay?.metadata &&
				typeof sourceOverlay.metadata === "object" &&
				!Array.isArray(sourceOverlay.metadata)
					? (sourceOverlay.metadata as Record<string, unknown>)
					: {};
			const galleryImages = Array.isArray(overlayMetadata.galleryImages)
				? overlayMetadata.galleryImages
						.map((value) => String(value || "").trim())
						.filter(Boolean)
				: [];
			const images = Array.from(
				new Set(
					[offer.imageUrl, sourceOverlay?.imageUrl, ...galleryImages].filter(
						(value): value is string => Boolean(value),
					),
				),
			);
			return {
				id: offer.id,
				slug: offer.slug,
				title: offer.title,
				description: offer.description,
				imageUrl: offer.imageUrl,
				images,
				seo: offer.seo,
				availability: normalizeStorefrontAvailability(offer.availability),
				configurationVersion: offer.configurationVersion,
				category: {
					slug: offer.category.slug,
					title: offer.category.title,
				},
				configuration: policy,
			};
		}),
		search: publicProcedure
			.input(
				z.object({
					query: z.string().trim().max(100).default(""),
					categorySlug: z.string().trim().max(191).optional(),
					limit: z.number().int().min(1).max(100).default(48),
				}),
			)
			.query(async ({ ctx, input }) => {
				const offers = await ctx.db.storefrontOffer.findMany({
					where: {
						status: "PUBLISHED",
						publishedAt: { lte: new Date() },
						deletedAt: null,
						category: {
							status: "PUBLISHED",
							publishedAt: { lte: new Date() },
							deletedAt: null,
							slug: input.categorySlug || undefined,
						},
						...(input.query
							? {
									OR: [
										{ title: { contains: input.query } },
										{ description: { contains: input.query } },
									],
								}
							: {}),
					},
					orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
					take: input.limit,
					select: {
						id: true,
						slug: true,
						title: true,
						description: true,
						imageUrl: true,
						availability: true,
						category: {
							select: { slug: true, title: true },
						},
					},
				});
				return {
					items: offers.map((offer) => ({
						...offer,
						availability: normalizeStorefrontAvailability(offer.availability),
						href: `/product/${offer.category.slug}/${offer.slug}`,
					})),
					count: offers.length,
				};
			}),
	},

	content: {
		page: publicProcedure.input(slugSchema).query(async ({ ctx, input }) => {
			const page = await ctx.db.storefrontPage.findFirst({
				where: {
					slug: input.slug,
					status: "PUBLISHED",
					publishedAt: { lte: new Date() },
					deletedAt: null,
				},
				select: {
					id: true,
					slug: true,
					title: true,
					description: true,
					seo: true,
					updatedAt: true,
					sections: {
						where: {
							status: "PUBLISHED",
							publishedAt: { lte: new Date() },
						},
						orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
						take: 500,
						select: {
							id: true,
							key: true,
							type: true,
							content: true,
							sortOrder: true,
						},
					},
				},
			});
			return page ? { ...page, updatedAt: page.updatedAt.toISOString() } : null;
		}),
	},

	configuration: {
		preview: publicProcedure
			.input(storefrontConfigurationInputSchema)
			.mutation(async ({ ctx, input }) => {
				const priced = await validateAndPriceStorefrontConfiguration(
					ctx,
					input,
					{ allowIncomplete: true },
				);
				return {
					complete: priced.complete,
					currency: "USD" as const,
					unitPrice: priced.unitPrice,
					lineTotal: priced.lineTotal,
					configuration: priced.configuration,
					configurationHash: priced.configurationHash,
					steps: priced.resolvedSteps,
					workflow: priced.workflow,
				};
			}),
	},

	cart: {
		get: publicProcedure.query(async ({ ctx }) => {
			return getStorefrontCollection(ctx, "CART");
		}),
		add: publicProcedure
			.input(storefrontConfigurationInputSchema)
			.mutation(async ({ ctx, input }) => {
				const priced = await validateAndPriceStorefrontConfiguration(
					ctx,
					input,
					{ requireWorkflowConfiguration: true },
				);
				const collection = await getOrCreateStorefrontCollection(ctx, "CART");
				const line = await ctx.db.$transaction(async (tx) => {
					const quantity = priced.normalizedQuantity;
					const duplicate = await tx.storefrontCommerceLine.findFirst({
						where: {
							collectionId: collection.id,
							offerId: input.offerId,
							configurationHash: priced.configurationHash,
						},
					});
					let savedLine: { id: string };
					if (duplicate && !priced.workflow.doorSchedule) {
						const mergedQuantity = Number(duplicate.quantity) + quantity;
						savedLine = await tx.storefrontCommerceLine.update({
							where: { id: duplicate.id },
							data: {
								quantity: mergedQuantity,
								configuration: asJson({
									...priced.configuration,
									qty: mergedQuantity,
									lineTotal: multiplyMoney(mergedQuantity, priced.unitPrice),
								}),
								pricingSnapshot: asJson(priced.pricingSnapshot),
								unitPrice: priced.unitPrice,
								lineTotal: multiplyMoney(mergedQuantity, priced.unitPrice),
								validationStatus: "VALID",
								validationMessage: null,
								lastValidatedAt: new Date(),
							},
						});
					} else {
						savedLine = await tx.storefrontCommerceLine.create({
							data: {
								collectionId: collection.id,
								offerId: priced.offer.id,
								rootStepUid: priced.offer.category.rootStepUid,
								rootComponentUid: priced.rootComponentUid,
								quantity,
								configuration: asJson(priced.configuration),
								configurationHash: priced.configurationHash,
								configurationVersion: priced.offer.configurationVersion,
								pricingSnapshot: asJson(priced.pricingSnapshot),
								unitPrice: priced.unitPrice,
								lineTotal: priced.lineTotal,
								validationStatus: "VALID",
								lastValidatedAt: new Date(),
							},
						});
					}
					await tx.storefrontCommerceCollection.update({
						where: { id: collection.id },
						data: { version: { increment: 1 } },
					});
					return savedLine;
				});
				await writeCommerceAudit({
					ctx,
					action: "cart.line_added",
					entityId: line.id,
					metadata: {
						offerId: priced.offer.id,
						configurationHash: priced.configurationHash,
					},
				});
				return { id: line.id };
			}),
		updateQuantity: publicProcedure
			.input(quantitySchema)
			.mutation(async ({ ctx, input }) => {
				const line = await assertStorefrontLineOwnership(
					ctx,
					input.lineId,
					"CART",
				);
				if (!line.offerId) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "This cart item can no longer be repriced.",
					});
				}
				const configuration =
					line.configuration && typeof line.configuration === "object"
						? (line.configuration as Record<string, unknown>)
						: {};
				const housePackageTool =
					configuration.housePackageTool &&
					typeof configuration.housePackageTool === "object"
						? (configuration.housePackageTool as Record<string, unknown>)
						: null;
				if (
					housePackageTool &&
					Array.isArray(housePackageTool.doors) &&
					housePackageTool.doors.length
				) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message:
							"Edit the door configuration to change scheduled quantities.",
					});
				}
				const priced = await validateAndPriceStorefrontConfiguration(
					ctx,
					{
						offerId: line.offerId,
						quantity: input.quantity,
						configuration:
							storefrontConfigurationInputSchema.shape.configuration.parse(
								line.configuration,
							),
					},
					{ requireWorkflowConfiguration: true },
				);
				await ctx.db.storefrontCommerceLine.update({
					where: { id: line.id },
					data: {
						quantity: priced.normalizedQuantity,
						configuration: asJson(priced.configuration),
						configurationHash: priced.configurationHash,
						configurationVersion: priced.offer.configurationVersion,
						pricingSnapshot: asJson(priced.pricingSnapshot),
						unitPrice: priced.unitPrice,
						lineTotal: priced.lineTotal,
						validationStatus: "VALID",
						validationMessage: null,
						lastValidatedAt: new Date(),
					},
				});
				await ctx.db.storefrontCommerceCollection.update({
					where: { id: line.collectionId },
					data: { version: { increment: 1 } },
				});
				await writeCommerceAudit({
					ctx,
					action: "cart.quantity_updated",
					entityId: line.id,
					metadata: { quantity: input.quantity },
				});
				return { ok: true };
			}),
		remove: publicProcedure
			.input(lineIdSchema)
			.mutation(async ({ ctx, input }) => {
				const line = await assertStorefrontLineOwnership(
					ctx,
					input.lineId,
					"CART",
				);
				await ctx.db.storefrontCommerceLine.delete({
					where: { id: line.id },
				});
				await ctx.db.storefrontCommerceCollection.update({
					where: { id: line.collectionId },
					data: { version: { increment: 1 } },
				});
				await writeCommerceAudit({
					ctx,
					action: "cart.line_removed",
					entityId: line.id,
				});
				return { ok: true };
			}),
		clear: publicProcedure.mutation(async ({ ctx }) => {
			const collection = await getOrCreateStorefrontCollection(ctx, "CART");
			await ctx.db.storefrontCommerceLine.deleteMany({
				where: { collectionId: collection.id },
			});
			await ctx.db.storefrontCommerceCollection.update({
				where: { id: collection.id },
				data: { version: { increment: 1 } },
			});
			await writeCommerceAudit({
				ctx,
				action: "cart.cleared",
				entityId: collection.id,
			});
			return { ok: true };
		}),
		moveToWishlist: publicProcedure
			.input(lineIdSchema)
			.mutation(async ({ ctx, input }) => {
				const line = await assertStorefrontLineOwnership(
					ctx,
					input.lineId,
					"CART",
				);
				const wishlist = await getOrCreateStorefrontCollection(ctx, "WISHLIST");
				await ctx.db.$transaction(async (tx) => {
					const duplicate = await tx.storefrontCommerceLine.findFirst({
						where: {
							collectionId: wishlist.id,
							configurationHash: line.configurationHash,
							offerId: line.offerId,
						},
					});
					if (duplicate) {
						await tx.storefrontCommerceLine.delete({
							where: { id: line.id },
						});
					} else {
						await tx.storefrontCommerceLine.update({
							where: { id: line.id },
							data: { collectionId: wishlist.id },
						});
					}
					await tx.storefrontCommerceCollection.update({
						where: { id: line.collectionId },
						data: { version: { increment: 1 } },
					});
					await tx.storefrontCommerceCollection.update({
						where: { id: wishlist.id },
						data: { version: { increment: 1 } },
					});
				});
				await writeCommerceAudit({
					ctx,
					action: "cart.line_moved_to_wishlist",
					entityId: line.id,
				});
				return { ok: true };
			}),
		addFromWishlist: publicProcedure
			.input(lineIdSchema)
			.mutation(async ({ ctx, input }) => {
				const line = await assertStorefrontLineOwnership(
					ctx,
					input.lineId,
					"WISHLIST",
				);
				if (!line.offerId) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "This saved item is no longer available.",
					});
				}
				const priced = await validateAndPriceStorefrontConfiguration(
					ctx,
					{
						offerId: line.offerId,
						quantity: Number(line.quantity),
						configuration:
							storefrontConfigurationInputSchema.shape.configuration.parse(
								line.configuration,
							),
					},
					{ requireWorkflowConfiguration: true },
				);
				const cart = await getOrCreateStorefrontCollection(ctx, "CART");
				await ctx.db.$transaction(async (tx) => {
					const duplicate = await tx.storefrontCommerceLine.findFirst({
						where: {
							collectionId: cart.id,
							offerId: line.offerId,
							configurationHash: priced.configurationHash,
						},
					});
					if (duplicate && !priced.workflow.doorSchedule) {
						const quantity =
							Number(duplicate.quantity) + priced.normalizedQuantity;
						await tx.storefrontCommerceLine.update({
							where: { id: duplicate.id },
							data: {
								quantity,
								lineTotal: multiplyMoney(quantity, priced.unitPrice),
								configuration: asJson({
									...priced.configuration,
									qty: quantity,
								}),
								configurationVersion: priced.offer.configurationVersion,
								pricingSnapshot: asJson(priced.pricingSnapshot),
								validationStatus: "VALID",
								validationMessage: null,
								lastValidatedAt: new Date(),
							},
						});
						await tx.storefrontCommerceLine.delete({
							where: { id: line.id },
						});
					} else {
						await tx.storefrontCommerceLine.update({
							where: { id: line.id },
							data: {
								collectionId: cart.id,
								quantity: priced.normalizedQuantity,
								configuration: asJson(priced.configuration),
								configurationHash: priced.configurationHash,
								configurationVersion: priced.offer.configurationVersion,
								pricingSnapshot: asJson(priced.pricingSnapshot),
								unitPrice: priced.unitPrice,
								lineTotal: priced.lineTotal,
								validationStatus: "VALID",
								validationMessage: null,
								lastValidatedAt: new Date(),
							},
						});
					}
					await tx.storefrontCommerceCollection.update({
						where: { id: line.collectionId },
						data: { version: { increment: 1 } },
					});
					await tx.storefrontCommerceCollection.update({
						where: { id: cart.id },
						data: { version: { increment: 1 } },
					});
				});
				await writeCommerceAudit({
					ctx,
					action: "wishlist.line_moved_to_cart",
					entityId: line.id,
				});
				return { ok: true };
			}),
	},

	wishlist: {
		get: publicProcedure.query(async ({ ctx }) => {
			return getStorefrontCollection(ctx, "WISHLIST");
		}),
		add: publicProcedure
			.input(storefrontConfigurationInputSchema)
			.mutation(async ({ ctx, input }) => {
				const priced = await validateAndPriceStorefrontConfiguration(
					ctx,
					input,
					{ requireWorkflowConfiguration: true },
				);
				const wishlist = await getOrCreateStorefrontCollection(ctx, "WISHLIST");
				const existing = await ctx.db.storefrontCommerceLine.findFirst({
					where: {
						collectionId: wishlist.id,
						offerId: input.offerId,
						configurationHash: priced.configurationHash,
					},
				});
				if (existing) return { id: existing.id };
				const line = await ctx.db.storefrontCommerceLine.create({
					data: {
						collectionId: wishlist.id,
						offerId: priced.offer.id,
						rootStepUid: priced.offer.category.rootStepUid,
						rootComponentUid: priced.rootComponentUid,
						quantity: priced.normalizedQuantity,
						configuration: asJson(priced.configuration),
						configurationHash: priced.configurationHash,
						configurationVersion: priced.offer.configurationVersion,
						pricingSnapshot: asJson(priced.pricingSnapshot),
						unitPrice: priced.unitPrice,
						lineTotal: priced.lineTotal,
						validationStatus: "VALID",
						lastValidatedAt: new Date(),
					},
				});
				await ctx.db.storefrontCommerceCollection.update({
					where: { id: wishlist.id },
					data: { version: { increment: 1 } },
				});
				await writeCommerceAudit({
					ctx,
					action: "wishlist.line_added",
					entityId: line.id,
					metadata: { offerId: priced.offer.id },
				});
				return { id: line.id };
			}),
		remove: publicProcedure
			.input(lineIdSchema)
			.mutation(async ({ ctx, input }) => {
				const line = await assertStorefrontLineOwnership(
					ctx,
					input.lineId,
					"WISHLIST",
				);
				await ctx.db.storefrontCommerceLine.delete({
					where: { id: line.id },
				});
				await ctx.db.storefrontCommerceCollection.update({
					where: { id: line.collectionId },
					data: { version: { increment: 1 } },
				});
				await writeCommerceAudit({
					ctx,
					action: "wishlist.line_removed",
					entityId: line.id,
				});
				return { ok: true };
			}),
	},

	checkout: {
		state: customerProcedure.query(async ({ ctx }) => {
			return getStorefrontCheckoutState(ctx);
		}),
		create: customerProcedure
			.input(createStorefrontCheckoutSchema)
			.mutation(async ({ ctx, input }) => {
				return createStorefrontCheckout(ctx, input);
			}),
		confirmPayment: customerProcedure
			.input(storefrontCheckoutIdSchema)
			.mutation(async ({ ctx, input }) => {
				return confirmStorefrontCheckoutPayment(ctx, input.checkoutId);
			}),
	},

	account: {
		get: customerProcedure.query(async ({ ctx }) => {
			return getStorefrontAccount(ctx);
		}),
		updateProfile: customerProcedure
			.input(storefrontProfileInputSchema)
			.mutation(async ({ ctx, input }) => {
				return updateStorefrontProfile(ctx, input);
			}),
		saveAddress: customerProcedure
			.input(storefrontAddressInputSchema)
			.mutation(async ({ ctx, input }) => {
				return saveStorefrontAddress(ctx, input);
			}),
		deleteAddress: customerProcedure
			.input(storefrontAddressIdSchema)
			.mutation(async ({ ctx, input }) => {
				return deleteStorefrontAddress(ctx, input.id);
			}),
	},

	orders: {
		list: customerProcedure
			.input(storefrontOrderListSchema)
			.query(async ({ ctx, input }) => {
				return listStorefrontOrders(ctx, input);
			}),
		detail: customerProcedure
			.input(storefrontOrderIdSchema)
			.query(async ({ ctx, input }) => {
				return getStorefrontOrder(ctx, input.orderId);
			}),
		invoice: customerProcedure
			.input(storefrontOrderIdSchema)
			.mutation(async ({ ctx, input }) => {
				return createStorefrontInvoiceAccess(ctx, input.orderId);
			}),
	},
});
