"use client";

import dynamic from "next/dynamic";

import { useSaleOverview } from "../context";
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

	if (!data) return <ProductionTabV2Skeleton />;
	return <ProductionTabV2 />;
}
