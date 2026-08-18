"use client";

import { Skeleton } from "@gnd/ui/skeleton";
import dynamic from "next/dynamic";

import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";

const ProductionMaterialReviewPanel = dynamic(
	() =>
		import("@/components/production-v2/shared").then(
			(module) => module.ProductionMaterialReviewPanel,
		),
	{
		loading: () => <Skeleton className="h-72 rounded-lg" />,
	},
);

export function SalesProductionReviews() {
	const { filters } = useSalesProductionFilterParams();

	return <ProductionMaterialReviewPanel standalone search={filters.q} />;
}
