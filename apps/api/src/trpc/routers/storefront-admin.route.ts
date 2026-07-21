import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import {
	getStorefrontCatalogDetail,
	getStorefrontCatalogFamilies,
	getStorefrontCatalogList,
	getStorefrontCatalogProfiles,
} from "@api/db/queries/storefront-admin";
import { approveStorefrontCheckoutPayment } from "@api/db/queries/storefront-checkout";
import {
	storefrontCatalogBulkSchema,
	storefrontCatalogDetailSchema,
	storefrontCatalogFeaturedSchema,
	storefrontCatalogImageSchema,
	storefrontCatalogListSchema,
	storefrontCatalogMetadataSchema,
	storefrontCatalogStatusSchema,
} from "@api/schemas/storefront-admin";
import { requireStorefrontEmployeePermission } from "@api/utils/storefront-permissions";
import type { Prisma } from "@gnd/db";
import {
	projectStorefrontOfferRoute,
	storefrontCategoryInputSchema,
	storefrontComponentSchema,
	storefrontOfferInputSchema,
} from "@gnd/sales/storefront-configuration";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const idSchema = z.object({ id: z.string().trim().min(1) });
const operationsListSchema = z.object({
	query: z.string().trim().max(191).optional(),
	status: z.string().trim().max(64).optional(),
	cursor: z.string().trim().min(1).optional(),
	limit: z.number().int().min(1).max(50).default(25),
});
const storefrontSettingsSchema = z.object({
	defaultSalesRepId: z.number().int().positive().nullable(),
	pickupEnabled: z.boolean(),
	deliveryEnabled: z.boolean(),
	deliveryFlatRate: z.number().min(0).max(1_000_000),
	freeDeliveryThreshold: z.number().min(0).max(1_000_000).nullable(),
});
const storefrontPageSchema = z.object({
	id: z.string().optional(),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(191)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	title: z.string().trim().min(1).max(255),
	description: z.string().trim().max(10_000).nullable().optional(),
	seo: z.record(z.string(), z.unknown()).default({}),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
const storefrontSectionSchema = z.object({
	id: z.string().optional(),
	pageId: z.string().trim().min(1),
	key: z.string().trim().min(1).max(191),
	type: z.enum([
		"hero",
		"rich-text",
		"category-grid",
		"offer-grid",
		"faq",
		"cta",
	]),
	content: z.record(z.string(), z.unknown()),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
	sortOrder: z.number().int().min(0).max(10_000),
});
const storefrontInquiryStatusSchema = z.object({
	id: z.string().trim().min(1),
	status: z.enum(["NEW", "IN_REVIEW", "RESPONDED", "CLOSED", "SPAM"]),
});
const commerceStatusSchema = z.enum([
	"ACTIVE",
	"CHECKOUT",
	"COMPLETED",
	"ABANDONED",
	"EXPIRED",
]);
const inquiryStatusSchema = z.enum([
	"NEW",
	"IN_REVIEW",
	"RESPONDED",
	"CLOSED",
	"SPAM",
]);

function asJson(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function publicationDates(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
	return {
		status,
		publishedAt: status === "PUBLISHED" ? new Date() : null,
	};
}

export const storefrontAdminRouter = createTRPCRouter({
	catalog: {
		families: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			return getStorefrontCatalogFamilies(ctx);
		}),
		profiles: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			return getStorefrontCatalogProfiles(ctx);
		}),
		list: protectedProcedure
			.input(storefrontCatalogListSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefront",
				});
				return getStorefrontCatalogList(ctx, input);
			}),
		detail: protectedProcedure
			.input(storefrontCatalogDetailSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefront",
				});
				const detail = await getStorefrontCatalogDetail(
					ctx,
					input.componentUid,
				);
				if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
				return detail;
			}),
		setStatus: protectedProcedure
			.input(storefrontCatalogStatusSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: input.online ? "publishStorefront" : "editStorefront",
				});
				const source = await ctx.db.dykeStepProducts.findUnique({
					where: { uid: input.componentUid },
					select: { step: { select: { uid: true } } },
				});
				if (!source?.step.uid) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Catalog component not found.",
					});
				}
				const component = await ctx.db.storefrontComponent.upsert({
					where: { sourceComponentUid: input.componentUid },
					create: {
						sourceComponentUid: input.componentUid,
						sourceStepUid: source.step.uid,
						availableOnStorefront: input.online,
						status: input.online ? "PUBLISHED" : "DRAFT",
						createdByUserId: ctx.userId,
						updatedByUserId: ctx.userId,
					},
					update: {
						sourceStepUid: source.step.uid,
						availableOnStorefront: input.online,
						status: input.online ? "PUBLISHED" : "DRAFT",
						updatedByUserId: ctx.userId,
						deletedAt: null,
					},
				});
				await ctx.db.storefrontAuditEvent.create({
					data: {
						actorUserId: ctx.userId,
						action: input.online ? "component.online" : "component.offline",
						entityType: "StorefrontComponent",
						entityId: component.id,
						requestId: ctx.requestId,
					},
				});
				return { ok: true };
			}),
		setImage: protectedProcedure
			.input(storefrontCatalogImageSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefront",
				});
				const source = await ctx.db.dykeStepProducts.findUnique({
					where: { uid: input.componentUid },
					select: { step: { select: { uid: true } } },
				});
				if (!source?.step.uid) throw new TRPCError({ code: "NOT_FOUND" });
				await ctx.db.storefrontComponent.upsert({
					where: { sourceComponentUid: input.componentUid },
					create: {
						sourceComponentUid: input.componentUid,
						sourceStepUid: source.step.uid,
						imageUrl: input.imageUrl,
						createdByUserId: ctx.userId,
						updatedByUserId: ctx.userId,
					},
					update: {
						imageUrl: input.imageUrl,
						updatedByUserId: ctx.userId,
						deletedAt: null,
					},
				});
				return { ok: true };
			}),
		saveMetadata: protectedProcedure
			.input(storefrontCatalogMetadataSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefront",
				});
				const source = await ctx.db.dykeStepProducts.findUnique({
					where: { uid: input.componentUid },
					select: { step: { select: { uid: true } } },
				});
				if (!source?.step.uid) throw new TRPCError({ code: "NOT_FOUND" });
				await ctx.db.storefrontComponent.upsert({
					where: { sourceComponentUid: input.componentUid },
					create: {
						sourceComponentUid: input.componentUid,
						sourceStepUid: source.step.uid,
						title: input.title,
						description: input.description,
						imageUrl: input.imageUrl,
						createdByUserId: ctx.userId,
						updatedByUserId: ctx.userId,
					},
					update: {
						title: input.title,
						description: input.description,
						imageUrl: input.imageUrl,
						updatedByUserId: ctx.userId,
						deletedAt: null,
					},
				});
				return { ok: true };
			}),
		setFeatured: protectedProcedure
			.input(storefrontCatalogFeaturedSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefront",
				});
				const offer = await ctx.db.storefrontOffer.findUnique({
					where: { sourceComponentUid: input.componentUid },
					select: { id: true },
				});
				if (!offer) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Create the storefront product before featuring it.",
					});
				}
				await ctx.db.storefrontOffer.update({
					where: { id: offer.id },
					data: {
						featured: input.featured,
						featuredOrder: input.featured ? 0 : null,
						updatedByUserId: ctx.userId,
					},
				});
				return { ok: true };
			}),
		bulkUpdate: protectedProcedure
			.input(storefrontCatalogBulkSchema)
			.mutation(async ({ ctx, input }) => {
				const publishing = input.action === "online";
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: publishing ? "publishStorefront" : "editStorefront",
				});
				if (input.action === "feature" || input.action === "unfeature") {
					const result = await ctx.db.storefrontOffer.updateMany({
						where: {
							sourceComponentUid: { in: input.componentUids },
							deletedAt: null,
						},
						data: {
							featured: input.action === "feature",
							featuredOrder: input.action === "feature" ? 0 : null,
							updatedByUserId: ctx.userId,
						},
					});
					return {
						updated: result.count,
						skipped: input.componentUids.length - result.count,
					};
				}
				const sources = await ctx.db.dykeStepProducts.findMany({
					where: { uid: { in: input.componentUids }, deletedAt: null },
					select: { uid: true, step: { select: { uid: true } } },
				});
				await ctx.db.$transaction(
					sources.flatMap((source) =>
						source.uid && source.step.uid
							? [
									ctx.db.storefrontComponent.upsert({
										where: { sourceComponentUid: source.uid },
										create: {
											sourceComponentUid: source.uid,
											sourceStepUid: source.step.uid,
											availableOnStorefront: publishing,
											status: publishing ? "PUBLISHED" : "DRAFT",
											createdByUserId: ctx.userId,
											updatedByUserId: ctx.userId,
										},
										update: {
											sourceStepUid: source.step.uid,
											availableOnStorefront: publishing,
											status: publishing ? "PUBLISHED" : "DRAFT",
											updatedByUserId: ctx.userId,
											deletedAt: null,
										},
									}),
								]
							: [],
					),
				);
				return {
					updated: sources.length,
					skipped: input.componentUids.length - sources.length,
				};
			}),
	},

	categories: {
		list: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			return ctx.db.storefrontCategory.findMany({
				where: { deletedAt: null },
				orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
				take: 250,
				select: {
					id: true,
					title: true,
					slug: true,
					imageUrl: true,
					status: true,
					rootComponentUid: true,
					listingStepUid: true,
					_count: { select: { offers: true } },
				},
			});
		}),
		setStatus: protectedProcedure
			.input(
				idSchema.extend({
					status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission:
						input.status === "PUBLISHED"
							? "publishStorefront"
							: "editStorefront",
				});
				await ctx.db.storefrontCategory.update({
					where: { id: input.id },
					data: {
						...publicationDates(input.status),
						updatedByUserId: ctx.userId,
					},
				});
				return { ok: true };
			}),
	},

	saveCategory: protectedProcedure
		.input(storefrontCategoryInputSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission:
					input.status === "PUBLISHED" ? "publishStorefront" : "editStorefront",
			});
			const routeData = await getNewSalesFormStepRouting(ctx, {});
			const rootStep = routeData.stepsByUid[input.rootStepUid];
			const rootComponent = rootStep?.components.find(
				(component) => component.uid === input.rootComponentUid,
			);
			if (!rootStep || !rootComponent) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Select an existing Item Type component.",
				});
			}
			const data = {
				rootStepUid: input.rootStepUid,
				rootComponentUid: input.rootComponentUid,
				listingStepUid: input.listingStepUid || null,
				slug: input.slug,
				title: input.title,
				description: input.description || null,
				imageUrl: input.imageUrl || null,
				seo: asJson(input.seo || {}),
				sortOrder: input.sortOrder,
				...publicationDates(input.status),
				updatedByUserId: ctx.userId,
			};
			const category = input.id
				? await ctx.db.storefrontCategory.update({
						where: { id: input.id },
						data,
					})
				: await ctx.db.storefrontCategory.create({
						data: {
							...data,
							createdByUserId: ctx.userId,
						},
					});
			await ctx.db.storefrontAuditEvent.create({
				data: {
					actorUserId: ctx.userId,
					action: input.id ? "category.updated" : "category.created",
					entityType: "StorefrontCategory",
					entityId: category.id,
					requestId: ctx.requestId,
					metadata: { status: category.status },
				},
			});
			return category;
		}),

	saveComponent: protectedProcedure
		.input(storefrontComponentSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission:
					input.status === "PUBLISHED" ? "publishStorefront" : "editStorefront",
			});
			const routeData = await getNewSalesFormStepRouting(ctx, {});
			const source = routeData.stepsByUid[input.sourceStepUid]?.components.find(
				(component) => component.uid === input.sourceComponentUid,
			);
			if (!source) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "The selected Dyke component does not exist.",
				});
			}
			const component = await ctx.db.storefrontComponent.upsert({
				where: { sourceComponentUid: input.sourceComponentUid },
				create: {
					...input,
					description: input.description || null,
					imageUrl: input.imageUrl || null,
					metadata: asJson(input.metadata || {}),
					createdByUserId: ctx.userId,
					updatedByUserId: ctx.userId,
				},
				update: {
					...input,
					description: input.description || null,
					imageUrl: input.imageUrl || null,
					metadata: asJson(input.metadata || {}),
					updatedByUserId: ctx.userId,
				},
			});
			await ctx.db.storefrontAuditEvent.create({
				data: {
					actorUserId: ctx.userId,
					action: "component.saved",
					entityType: "StorefrontComponent",
					entityId: component.id,
					requestId: ctx.requestId,
					metadata: {
						sourceComponentUid: component.sourceComponentUid,
						availableOnStorefront: component.availableOnStorefront,
					},
				},
			});
			return component;
		}),

	saveOffer: protectedProcedure
		.input(storefrontOfferInputSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission:
					input.status === "PUBLISHED" ? "publishStorefront" : "editStorefront",
			});
			const [category, routeData, components] = await Promise.all([
				ctx.db.storefrontCategory.findUnique({
					where: { id: input.categoryId },
				}),
				getNewSalesFormStepRouting(ctx, {}),
				ctx.db.storefrontComponent.findMany({
					where: { deletedAt: null },
					take: 5_000,
				}),
			]);
			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Storefront category not found.",
				});
			}
			const source = routeData.stepsByUid[input.sourceStepUid]?.components.find(
				(component) => component.uid === input.sourceComponentUid,
			);
			if (!source) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "The selected Dyke offer component does not exist.",
				});
			}
			const componentPolicies = input.componentPolicies.some(
				(policy) =>
					policy.stepUid === input.sourceStepUid &&
					policy.sourceComponentUid === input.sourceComponentUid,
			)
				? input.componentPolicies
				: [
						...input.componentPolicies,
						{
							stepUid: input.sourceStepUid,
							sourceComponentUid: input.sourceComponentUid,
							enabled: true,
							defaultSelected: true,
							sortOrder: 0,
						},
					];
			const readiness = projectStorefrontOfferRoute({
				routeData,
				rootStepUid: category.rootStepUid,
				rootComponentUid: category.rootComponentUid,
				offerSourceStepUid: input.sourceStepUid,
				offerSourceComponentUid: input.sourceComponentUid,
				stepPolicies: input.stepPolicies,
				componentPolicies,
				components: components.map((component) => ({
					...component,
					description: component.description || null,
					imageUrl: component.imageUrl || null,
					metadata:
						(component.metadata as Record<string, unknown> | null) || null,
				})),
			});
			if (input.status === "PUBLISHED" && !readiness.ready) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: readiness.issues.map((issue) => issue.message).join(" "),
					cause: readiness.issues,
				});
			}

			const offer = await ctx.db.$transaction(async (tx) => {
				const data = {
					categoryId: input.categoryId,
					sourceStepUid: input.sourceStepUid,
					sourceComponentUid: input.sourceComponentUid,
					slug: input.slug,
					title: input.title,
					description: input.description || null,
					imageUrl: input.imageUrl || null,
					seo: asJson(input.seo || {}),
					availability: asJson(input.availability || {}),
					sortOrder: input.sortOrder,
					configurationVersion: input.configurationVersion,
					...publicationDates(input.status),
					updatedByUserId: ctx.userId,
				};
				const saved = input.id
					? await tx.storefrontOffer.update({
							where: { id: input.id },
							data,
						})
					: await tx.storefrontOffer.create({
							data: {
								...data,
								createdByUserId: ctx.userId,
							},
						});
				await tx.storefrontStepPolicy.deleteMany({
					where: { offerId: saved.id },
				});
				await tx.storefrontOfferComponentPolicy.deleteMany({
					where: { offerId: saved.id },
				});
				if (input.stepPolicies.length) {
					await tx.storefrontStepPolicy.createMany({
						data: input.stepPolicies.map((policy) => ({
							offerId: saved.id,
							...policy,
							title: policy.title || null,
							helpText: policy.helpText || null,
							defaultComponentUid: policy.defaultComponentUid || null,
							metadata: asJson(policy.metadata || {}),
						})),
					});
				}
				if (componentPolicies.length) {
					await tx.storefrontOfferComponentPolicy.createMany({
						data: componentPolicies.map((policy) => ({
							offerId: saved.id,
							...policy,
							metadata: asJson(policy.metadata || {}),
						})),
					});
				}
				await tx.storefrontAuditEvent.create({
					data: {
						actorUserId: ctx.userId,
						action: input.id ? "offer.updated" : "offer.created",
						entityType: "StorefrontOffer",
						entityId: saved.id,
						requestId: ctx.requestId,
						metadata: asJson({
							status: saved.status,
							readiness,
						}),
					},
				});
				return saved;
			});
			return { offer, readiness };
		}),

	deleteCategory: protectedProcedure
		.input(idSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "editStorefront",
			});
			return ctx.db.storefrontCategory.update({
				where: { id: input.id },
				data: {
					status: "ARCHIVED",
					deletedAt: new Date(),
					updatedByUserId: ctx.userId,
				},
			});
		}),

	deleteOffer: protectedProcedure
		.input(idSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "editStorefront",
			});
			return ctx.db.storefrontOffer.update({
				where: { id: input.id },
				data: {
					status: "ARCHIVED",
					deletedAt: new Date(),
					updatedByUserId: ctx.userId,
				},
			});
		}),

	operations: {
		carts: protectedProcedure
			.input(operationsListSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefrontCarts",
				});
				const rows = await ctx.db.storefrontCommerceCollection.findMany({
					where: {
						type: { in: ["CART", "WISHLIST"] },
						...(input.status
							? { status: commerceStatusSchema.parse(input.status) }
							: {}),
					},
					cursor: input.cursor ? { id: input.cursor } : undefined,
					skip: input.cursor ? 1 : 0,
					orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
					take: input.limit + 1,
					include: {
						lines: {
							orderBy: { createdAt: "asc" },
							select: {
								id: true,
								quantity: true,
								lineTotal: true,
								validationStatus: true,
								offerId: true,
							},
						},
					},
				});
				const ownerIds = rows
					.map((row) => row.ownerUserId)
					.filter((id): id is number => Boolean(id));
				const users = ownerIds.length
					? await ctx.db.users.findMany({
							where: {
								id: { in: ownerIds },
								...(input.query
									? {
											OR: [
												{ name: { contains: input.query } },
												{ email: { contains: input.query } },
											],
										}
									: {}),
							},
							select: {
								id: true,
								name: true,
								email: true,
								customer: {
									select: { id: true, name: true, businessName: true },
								},
							},
						})
					: [];
				const usersById = new Map(users.map((user) => [user.id, user]));
				const filtered = input.query
					? rows.filter(
							(row) => !row.ownerUserId || usersById.has(row.ownerUserId),
						)
					: rows;
				const page = filtered.slice(0, input.limit);
				return {
					items: page.map((row) => ({
						id: row.id,
						type: row.type,
						status: row.status,
						version: row.version,
						guest: !row.ownerUserId,
						customer: row.ownerUserId
							? usersById.get(row.ownerUserId) || null
							: null,
						itemCount: row.lines.length,
						subtotal: row.lines.reduce(
							(total, line) => total + Number(line.lineTotal || 0),
							0,
						),
						updatedAt: row.updatedAt.toISOString(),
						expiresAt: row.expiresAt?.toISOString() || null,
					})),
					nextCursor:
						filtered.length > input.limit ? page.at(-1)?.id || null : null,
				};
			}),

		cartDetail: protectedProcedure
			.input(idSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefrontCarts",
				});
				const collection = await ctx.db.storefrontCommerceCollection.findUnique(
					{
						where: { id: input.id },
						include: {
							lines: {
								orderBy: { createdAt: "asc" },
							},
						},
					},
				);
				if (!collection) throw new TRPCError({ code: "NOT_FOUND" });
				const user = collection.ownerUserId
					? await ctx.db.users.findUnique({
							where: { id: collection.ownerUserId },
							select: {
								id: true,
								name: true,
								email: true,
								customer: {
									select: {
										id: true,
										name: true,
										businessName: true,
										phoneNo: true,
									},
								},
							},
						})
					: null;
				const offers = await ctx.db.storefrontOffer.findMany({
					where: {
						id: {
							in: collection.lines
								.map((line) => line.offerId)
								.filter((id): id is string => Boolean(id)),
						},
					},
					select: { id: true, title: true, slug: true },
				});
				const offersById = new Map(offers.map((offer) => [offer.id, offer]));
				return {
					id: collection.id,
					type: collection.type,
					status: collection.status,
					version: collection.version,
					customer: user,
					guest: !collection.ownerUserId,
					createdAt: collection.createdAt.toISOString(),
					updatedAt: collection.updatedAt.toISOString(),
					lines: collection.lines.map((line) => ({
						id: line.id,
						offer: line.offerId ? offersById.get(line.offerId) || null : null,
						quantity: Number(line.quantity),
						unitPrice: Number(line.unitPrice),
						lineTotal: Number(line.lineTotal),
						validationStatus: line.validationStatus,
						validationMessage: line.validationMessage,
						configuration: line.configuration,
					})),
				};
			}),

		orders: protectedProcedure
			.input(operationsListSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefrontOrders",
				});
				const cursor = input.cursor ? Number(input.cursor) : null;
				const rows = await ctx.db.salesOrders.findMany({
					where: {
						salesChannel: "storefront",
						deletedAt: null,
						...(Number.isFinite(cursor) && cursor
							? { id: { lt: cursor } }
							: {}),
						...(input.status ? { status: input.status } : {}),
						...(input.query
							? {
									OR: [
										{ orderId: { contains: input.query } },
										{
											customer: {
												OR: [
													{ name: { contains: input.query } },
													{ businessName: { contains: input.query } },
													{ email: { contains: input.query } },
												],
											},
										},
									],
								}
							: {}),
					},
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					take: input.limit + 1,
					select: {
						id: true,
						orderId: true,
						slug: true,
						status: true,
						prodStatus: true,
						invoiceStatus: true,
						createdAt: true,
						grandTotal: true,
						amountDue: true,
						deliveryOption: true,
						customer: {
							select: {
								id: true,
								name: true,
								businessName: true,
								email: true,
								phoneNo: true,
							},
						},
						salesRep: { select: { id: true, name: true, email: true } },
						_count: { select: { items: true } },
					},
				});
				const page = rows.slice(0, input.limit);
				const checkouts = page.length
					? await ctx.db.storefrontCheckout.findMany({
							where: { salesOrderId: { in: page.map((order) => order.id) } },
							orderBy: { createdAt: "desc" },
							select: { id: true, salesOrderId: true, status: true },
						})
					: [];
				const checkoutBySalesId = new Map(
					checkouts.map((checkout) => [checkout.salesOrderId, checkout]),
				);
				return {
					items: page.map((order) => ({
						...order,
						createdAt: order.createdAt?.toISOString() || null,
						grandTotal: Number(order.grandTotal || 0),
						amountDue: Number(order.amountDue || 0),
						itemCount: order._count.items,
						checkout: checkoutBySalesId.get(order.id) || null,
						_count: undefined,
					})),
					nextCursor:
						rows.length > input.limit ? String(page.at(-1)?.id || "") : null,
				};
			}),

		verifyOrder: protectedProcedure
			.input(z.object({ checkoutId: z.string().trim().min(1) }))
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefrontOrders",
				});
				return approveStorefrontCheckoutPayment(ctx, input.checkoutId);
			}),

		inquiries: protectedProcedure
			.input(operationsListSchema)
			.query(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "viewStorefrontOrders",
				});
				const rows = await ctx.db.storefrontInquiry.findMany({
					where: {
						...(input.status
							? { status: inquiryStatusSchema.parse(input.status) }
							: {}),
						...(input.query
							? {
									OR: [
										{ name: { contains: input.query } },
										{ email: { contains: input.query } },
										{ subject: { contains: input.query } },
									],
								}
							: {}),
					},
					cursor: input.cursor ? { id: input.cursor } : undefined,
					skip: input.cursor ? 1 : 0,
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					take: input.limit + 1,
					select: {
						id: true,
						type: true,
						status: true,
						name: true,
						email: true,
						phone: true,
						subject: true,
						message: true,
						projectTypes: true,
						budget: true,
						createdAt: true,
					},
				});
				const page = rows.slice(0, input.limit);
				return {
					items: page.map((row) => ({
						...row,
						createdAt: row.createdAt.toISOString(),
					})),
					nextCursor:
						rows.length > input.limit ? page.at(-1)?.id || null : null,
				};
			}),

		updateInquiryStatus: protectedProcedure
			.input(storefrontInquiryStatusSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefrontOrders",
				});
				const inquiry = await ctx.db.storefrontInquiry.update({
					where: { id: input.id },
					data: {
						status: input.status,
						assignedToId: input.status === "IN_REVIEW" ? ctx.userId : undefined,
						closedAt:
							input.status === "CLOSED" || input.status === "SPAM"
								? new Date()
								: null,
					},
				});
				await ctx.db.storefrontAuditEvent.create({
					data: {
						actorUserId: ctx.userId,
						action: "inquiry.status_updated",
						entityType: "StorefrontInquiry",
						entityId: inquiry.id,
						requestId: ctx.requestId,
						metadata: { status: inquiry.status },
					},
				});
				return { ok: true };
			}),
	},

	settings: {
		salesReps: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			return ctx.db.users.findMany({
				where: {
					deletedAt: null,
					accessRevokedAt: null,
					roles: {
						some: {
							deletedAt: null,
							role: { name: { contains: "Sales" } },
						},
					},
				},
				orderBy: { name: "asc" },
				select: { id: true, name: true, email: true },
			});
		}),
		get: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			const setting = await ctx.db.settings.findFirst({
				where: { type: "storefront-settings", deletedAt: null },
				orderBy: { id: "desc" },
				select: { id: true, meta: true },
			});
			const meta =
				setting?.meta && typeof setting.meta === "object"
					? (setting.meta as Record<string, unknown>)
					: {};
			const checkout =
				meta.checkout && typeof meta.checkout === "object"
					? (meta.checkout as Record<string, unknown>)
					: {};
			return {
				id: setting?.id || null,
				defaultSalesRepId:
					Number.isInteger(Number(meta.defaultSalesRepId)) &&
					Number(meta.defaultSalesRepId) > 0
						? Number(meta.defaultSalesRepId)
						: null,
				checkout: {
					pickupEnabled: checkout.pickupEnabled !== false,
					deliveryEnabled: checkout.deliveryEnabled === true,
					deliveryFlatRate: Number(checkout.deliveryFlatRate || 0),
					freeDeliveryThreshold:
						Number(checkout.freeDeliveryThreshold || 0) || null,
				},
			};
		}),
		save: protectedProcedure
			.input(storefrontSettingsSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission: "editStorefront",
				});
				const current = await ctx.db.settings.findFirst({
					where: { type: "storefront-settings", deletedAt: null },
					orderBy: { id: "desc" },
				});
				const existingMeta =
					current?.meta && typeof current.meta === "object"
						? (current.meta as Record<string, unknown>)
						: {};
				const {
					defaultSalesRepId,
					pickupEnabled,
					deliveryEnabled,
					deliveryFlatRate,
					freeDeliveryThreshold,
				} = input;
				const data = {
					type: "storefront-settings",
					meta: asJson({
						...existingMeta,
						defaultSalesRepId,
						checkout: {
							pickupEnabled,
							deliveryEnabled,
							deliveryFlatRate,
							freeDeliveryThreshold,
						},
					}),
					deletedAt: null,
				};
				const saved = current
					? await ctx.db.settings.update({
							where: { id: current.id },
							data,
						})
					: await ctx.db.settings.create({ data });
				await ctx.db.storefrontAuditEvent.create({
					data: {
						actorUserId: ctx.userId,
						action: "settings.updated",
						entityType: "StorefrontSettings",
						entityId: String(saved.id),
						requestId: ctx.requestId,
					},
				});
				return { ok: true };
			}),
	},

	content: {
		list: protectedProcedure.query(async ({ ctx }) => {
			await requireStorefrontEmployeePermission({
				db: ctx.db,
				userId: ctx.userId,
				permission: "viewStorefront",
			});
			return ctx.db.storefrontPage.findMany({
				where: { deletedAt: null },
				orderBy: { title: "asc" },
				take: 100,
				include: {
					sections: { orderBy: { sortOrder: "asc" }, take: 100 },
				},
			});
		}),
		savePage: protectedProcedure
			.input(storefrontPageSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission:
						input.status === "PUBLISHED"
							? "publishStorefront"
							: "editStorefront",
				});
				const data = {
					slug: input.slug,
					title: input.title,
					description: input.description || null,
					seo: asJson(input.seo),
					...publicationDates(input.status),
					updatedByUserId: ctx.userId,
					deletedAt: input.status === "ARCHIVED" ? new Date() : null,
				};
				return input.id
					? ctx.db.storefrontPage.update({
							where: { id: input.id },
							data,
						})
					: ctx.db.storefrontPage.create({
							data: { ...data, createdByUserId: ctx.userId },
						});
			}),
		saveSection: protectedProcedure
			.input(storefrontSectionSchema)
			.mutation(async ({ ctx, input }) => {
				await requireStorefrontEmployeePermission({
					db: ctx.db,
					userId: ctx.userId,
					permission:
						input.status === "PUBLISHED"
							? "publishStorefront"
							: "editStorefront",
				});
				const page = await ctx.db.storefrontPage.findUnique({
					where: { id: input.pageId },
					select: { id: true },
				});
				if (!page) throw new TRPCError({ code: "NOT_FOUND" });
				const data = {
					pageId: input.pageId,
					key: input.key,
					type: input.type,
					content: asJson(input.content),
					sortOrder: input.sortOrder,
					...publicationDates(input.status),
				};
				return input.id
					? ctx.db.storefrontSection.update({
							where: { id: input.id },
							data,
						})
					: ctx.db.storefrontSection.create({ data });
			}),
	},
});
