import type { Db } from "@gnd/db";
import { resolveDealerRecruitmentBanner } from "@gnd/db/queries";
import { getAppUrl } from "@gnd/utils/envs";

export async function resolveSalesEmailDealerProgramBanner(
	db: Db,
	input: {
		customerEmail: string;
		customerId?: number | null;
		salesIds?: number[] | null;
		salesNos?: string[] | null;
	},
) {
	let customerId = input.customerId || null;
	if (!customerId && (input.salesIds?.length || input.salesNos?.length)) {
		const sale = await db.salesOrders.findFirst({
			where: input.salesIds?.length
				? { id: { in: input.salesIds } }
				: { orderId: { in: input.salesNos || [] } },
			orderBy: { createdAt: "asc" },
			select: { customerId: true },
		});
		customerId = sale?.customerId || null;
	}
	const baseUrl = getAppUrl();
	if (!customerId || !baseUrl) return null;
	return resolveDealerRecruitmentBanner(db, {
		customerId,
		recipientEmail: input.customerEmail,
		baseUrl,
	});
}
