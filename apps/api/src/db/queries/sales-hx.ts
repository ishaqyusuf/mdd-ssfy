import type { TRPCContext } from "@api/trpc/init";
import {
	transformActivityTags,
	type ActivityType,
} from "@gnd/notifications/utils";
import type { NoteTagNames } from "@gnd/utils/constants";
import { z } from "zod";

export const getSalesHxSchema = z.object({
	salesNo: z.string().trim().min(1),
});
export type GetSalesHx = z.infer<typeof getSalesHxSchema>;

export async function getSalesHx(ctx: TRPCContext, data: GetSalesHx) {
	const payload = getSalesHxSchema.parse(data);
	const historyPrefix = `${payload.salesNo}-hx`;
	const [activities, snapshots] = await Promise.all([
		ctx.db.notePad.findMany({
			where: {
				AND: [
					{
						tags: {
							some: {
								tagName: "salesNo" as NoteTagNames,
								tagValue: {
									startsWith: historyPrefix,
								},
							},
						},
					},
					{
						tags: {
							some: {
								tagName: `activity` as NoteTagNames,
								tagValue: {
									in: [
										"sales_invoice_updated",
										"quote_invoice_updated",
									] as ActivityType[],
								},
							},
						},
					},
				],
			},
			select: {
				id: true,
				createdAt: true,
				senderContact: {
					select: {
						name: true,
					},
				},
				tags: true,
			},
		}),
		ctx.db.salesOrders.findMany({
			where: {
				deletedAt: null,
				orderId: {
					startsWith: historyPrefix,
				},
				type: {
					in: ["order-hx", "quote-hx"],
				},
			},
			select: {
				id: true,
				orderId: true,
				slug: true,
				type: true,
				createdAt: true,
				updatedAt: true,
				subTotal: true,
				tax: true,
				grandTotal: true,
				customerProfileId: true,
				salesProfile: {
					select: {
						title: true,
					},
				},
				_count: {
					select: {
						items: true,
					},
				},
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		}),
	]);
	const activityBySnapshot = new Map(
		activities.map((activity) => {
			const tags = transformActivityTags(...(activity.tags as any));
			return [tags.salesNo, { ...activity, tags }] as const;
		}),
	);

	return snapshots.map((snapshot) => {
		const activity = activityBySnapshot.get(snapshot.orderId);
		return {
			id: snapshot.id,
			orderId: snapshot.orderId,
			slug: snapshot.slug,
			type: snapshot.type,
			createdAt: activity?.createdAt || snapshot.createdAt,
			updatedAt: snapshot.updatedAt,
			authorName: activity?.senderContact?.name || null,
			subTotal: Number(snapshot.subTotal || 0),
			taxTotal: Number(snapshot.tax || 0),
			grandTotal: Number(snapshot.grandTotal || 0),
			customerProfileId: snapshot.customerProfileId,
			customerProfileName: snapshot.salesProfile?.title || null,
			lineItemCount: snapshot._count.items,
		};
	});
}
