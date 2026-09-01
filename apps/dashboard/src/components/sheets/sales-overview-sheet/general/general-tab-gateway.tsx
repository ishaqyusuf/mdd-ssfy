"use client";

import dynamic from "next/dynamic";
import { useSaleOverview } from "../context";
import type { GeneralTabProps } from "../general-tab";
import { GeneralTabV2Skeleton } from "./v2/general-tab-v2-skeleton";

const GeneralTabV2 = dynamic(
	() => import("./v2/general-tab-v2").then((module) => module.GeneralTabV2),
	{
		loading: () => <GeneralTabV2Skeleton />,
	},
);

export function GeneralTabGateway(props: GeneralTabProps) {
	const { data } = useSaleOverview();

	if (!data) return <GeneralTabV2Skeleton />;
	return <GeneralTabV2 {...props} />;
}
