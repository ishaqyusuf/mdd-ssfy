import type { RouterInputs } from "@api/trpc/routers/_app";

export const RECENT_SALES_QUERY_INPUT = {
	size: 5,
	showing: null,
	sort: ["createdAt.desc"],
} satisfies RouterInputs["sales"]["getOrders"];
