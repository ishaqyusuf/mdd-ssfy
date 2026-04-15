"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@gnd/ui/skeleton";

const CommunityInstallCostRate = dynamic(
	() => import("@/components/community-install-costs"),
	{
		loading: () => (
			<div className="space-y-4">
				<Skeleton className="h-10 w-40" />
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton
							key={index.toString()}
							className="h-14 w-full rounded-lg"
						/>
					))}
				</div>
			</div>
		),
	},
);

export function InstallCostsClient() {
	return <CommunityInstallCostRate />;
}
