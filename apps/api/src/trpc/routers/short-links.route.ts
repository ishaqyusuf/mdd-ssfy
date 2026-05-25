import {
	buildShortUrl,
	createShortLink,
	deactivateShortLink,
	deleteShortLink,
	findOrCreateShortLinkForTarget,
	listShortLinks,
	updateShortLink,
} from "@gnd/db/queries";
import {
	createShortLinkSchema,
	listShortLinksSchema,
	shortLinkIdSchema,
	updateShortLinkSchema,
} from "../../schemas/short-links";
import { createTRPCRouter, protectedProcedure } from "../init";

function withShortUrl<T extends { slug: string }>(link: T) {
	return {
		...link,
		shortUrl: buildShortUrl(link.slug),
	};
}

export const shortLinksRouter = createTRPCRouter({
	list: protectedProcedure
		.input(listShortLinksSchema)
		.query(async ({ ctx, input }) => {
			const result = await listShortLinks(ctx.db, input);
			return {
				...result,
				data: result.data.map(withShortUrl),
			};
		}),
	create: protectedProcedure
		.input(createShortLinkSchema)
		.mutation(async ({ ctx, input }) => {
			const link = await createShortLink(ctx.db, {
				...input,
				createdById: ctx.userId,
			});
			return withShortUrl(link);
		}),
	findOrCreateForTarget: protectedProcedure
		.input(createShortLinkSchema)
		.mutation(async ({ ctx, input }) => {
			const link = await findOrCreateShortLinkForTarget(ctx.db, {
				...input,
				createdById: ctx.userId,
			});
			return withShortUrl(link);
		}),
	update: protectedProcedure
		.input(updateShortLinkSchema)
		.mutation(async ({ ctx, input }) => {
			const link = await updateShortLink(ctx.db, input);
			return withShortUrl(link);
		}),
	deactivate: protectedProcedure
		.input(shortLinkIdSchema)
		.mutation(async ({ ctx, input }) => {
			const link = await deactivateShortLink(ctx.db, input.id);
			return withShortUrl(link);
		}),
	delete: protectedProcedure
		.input(shortLinkIdSchema)
		.mutation(async ({ ctx, input }) => {
			const link = await deleteShortLink(ctx.db, input.id);
			return withShortUrl(link);
		}),
});
