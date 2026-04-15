import type { CopySaleSchema, MoveSaleSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import { createNoteAction } from "@notifications/note";
import { copySales } from "@sales/copy-sales";

export async function copySale(ctx: TRPCContext, input: CopySaleSchema) {
	if (!ctx.userId) {
		throw new Error("Unauthorized");
	}

	const author = await ctx.db.users.findFirstOrThrow({
		where: { id: ctx.userId },
		select: { id: true, name: true },
	});

	const result = await copySales({
		db: ctx.db,
		salesUid: input.salesUid,
		as: input.as,
		type: input.type,
		author: {
			id: author.id,
			name: author.name || "",
		},
	});

	if (result.id) {
		await createNoteAction({
			db: ctx.db,
			authorId: ctx.userId,
			note: `Copied from ${input.salesUid}`,
			headline: "Copy Action",
			type: "general",
			tags: [
				{
					tagName: "salesId",
					tagValue: String(result.id),
				},
				{
					tagName: "type",
					tagValue: "general",
				},
				{
					tagName: "status",
					tagValue: "public",
				},
			],
		});
	}

	return {
		error: result.error,
		id: result.id,
		slug: result.slug,
		isDyke: result.isDyke ?? false,
		data: result,
	};
}

export async function moveSale(ctx: TRPCContext, input: MoveSaleSchema) {
	const copied = await copySale(ctx, {
		salesUid: input.salesUid,
		as: input.to,
		type: input.type,
	});

	if (copied.error || !copied.id) {
		return copied;
	}

	const source = await ctx.db.salesOrders.findFirstOrThrow({
		where: {
			orderId: input.salesUid,
			type: input.type,
		},
		select: {
			id: true,
		},
	});

	await ctx.db.salesOrders.update({
		where: { id: source.id },
		data: {
			deletedAt: new Date(),
		},
	});

	return copied;
}
