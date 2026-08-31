"use client";

import dynamic from "next/dynamic";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { useSaleOverview } from "../context";
import { ProductionTab } from "../production-tab";
import type { SalesOverviewVersionedData } from "../types";
import { ProductionTabV2Skeleton } from "./v2/production-tab-v2-skeleton";

const ProductionTabV2 = dynamic(
	() =>
		import("./v2/production-tab-v2").then((module) => module.ProductionTabV2),
	{
		loading: () => <ProductionTabV2Skeleton />,
	},
);

export function ProductionTabGateway() {
	const { data } = useSaleOverview();
	const query = useSalesOverviewQuery();
	const workerMode = Boolean(query.assignedTo);

	if (!data) return <ProductionTabV2Skeleton />;
	if (
		workerMode ||
		(data as SalesOverviewVersionedData).generalViewVersion === "v2"
	) {
		return <ProductionTabV2 />;
	}

	return <ProductionTab />;
}
