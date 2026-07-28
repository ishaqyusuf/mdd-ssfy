"use client";

import dynamic from "next/dynamic";

import { ProductionV2BoardSkeleton } from "./skeleton";

const ProductionAdminBoardV2 = dynamic(
	() => import("./shared").then((module) => module.ProductionAdminBoardV2),
	{
		loading: () => <ProductionV2BoardSkeleton rows={4} />,
	},
);

const ProductionWorkerDashboardV2 = dynamic(
	() => import("./shared").then((module) => module.ProductionWorkerDashboardV2),
	{
		loading: () => <ProductionV2BoardSkeleton rows={4} />,
	},
);

export function LazyProductionAdminBoardV2() {
	return <ProductionAdminBoardV2 />;
}

export function LazyProductionWorkerDashboardV2() {
	return <ProductionWorkerDashboardV2 />;
}
