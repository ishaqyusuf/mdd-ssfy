import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import type { ReactNode } from "react";

interface Props {
	access?: "admin" | "non-admin";
	children?: ReactNode;
}
export function AccessBased({ access = "admin", children }: Props) {
	const ctx = useSalesOverviewQuery();
	if (
		(access === "admin" && ctx.assignedTo) ||
		(access === "non-admin" && !ctx.assignedTo)
	)
		return null;
	return children;
}
