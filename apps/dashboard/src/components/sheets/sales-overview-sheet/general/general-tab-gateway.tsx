"use client";

import dynamic from "next/dynamic";
import { useSaleOverview } from "../context";
import { GeneralTab, type GeneralTabProps } from "../general-tab";
import { GeneralTabV2Skeleton } from "./v2/general-tab-v2-skeleton";
import type { SalesOverviewData } from "./v2/types";

const GeneralTabV2 = dynamic(
	() => import("./v2/general-tab-v2").then((module) => module.GeneralTabV2),
	{
		loading: () => <GeneralTabV2Skeleton />,
	},
);

export function GeneralTabGateway(props: GeneralTabProps) {
	const { data } = useSaleOverview();

	if (!data) return <GeneralTabV2Skeleton />;
	if ((data as SalesOverviewData).generalViewVersion === "v2") {
		return <GeneralTabV2 {...props} />;
	}

	return <GeneralTab {...props} />;
}
