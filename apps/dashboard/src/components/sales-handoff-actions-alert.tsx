"use client";

import { useTRPC } from "@/trpc/client";
import { Alert, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	SALES_NEEDS_ACTION_HREF,
	getSalesNeedsActionLabel,
} from "./sales-handoff-actions-alert-model";

export function SalesHandoffActionsAlertSkeleton() {
	return (
		<div
			className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-border/70 px-4 py-2.5"
			aria-hidden="true"
		>
			<Skeleton className="h-4 w-48" />
			<Skeleton className="h-8 w-32" />
		</div>
	);
}

export function SalesHandoffActionsAlertContent({ count }: { count: number }) {
	if (count <= 0) return null;

	return (
		<Alert
			aria-live="polite"
			className="border-amber-200 bg-amber-50/50 py-2.5 pr-2.5 [&>svg+div]:translate-y-0 [&>svg]:top-3.5"
		>
			<Icons.Info />
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<AlertTitle className="mb-0 text-sm">
					{getSalesNeedsActionLabel(count)}
				</AlertTitle>
				<Button
					asChild
					variant="outline"
					size="sm"
					className="h-8 shrink-0 bg-background/80"
				>
					<Link href={SALES_NEEDS_ACTION_HREF}>View needs action</Link>
				</Button>
			</div>
		</Alert>
	);
}

export function SalesHandoffActionsAlert() {
	const trpc = useTRPC();
	const [isHydrated, setIsHydrated] = useState(false);
	const scopeQuery = useQuery(
		trpc.sales.getOpenSalesHandoffOrderScope.queryOptions(
			{ limit: 200 },
			{
				staleTime: 15_000,
				refetchOnWindowFocus: true,
			},
		),
	);
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	if (!isHydrated || scopeQuery.isPending) {
		return <SalesHandoffActionsAlertSkeleton />;
	}
	if (scopeQuery.isError) {
		return (
			<Alert
				variant="destructive"
				className="py-2.5 pr-2.5 [&>svg+div]:translate-y-0 [&>svg]:top-3.5"
			>
				<Icons.Info />
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<AlertTitle className="mb-0 text-sm">
						Unable to load paid sales actions
					</AlertTitle>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 shrink-0"
						onClick={() => void scopeQuery.refetch()}
					>
						Retry
					</Button>
				</div>
			</Alert>
		);
	}

	return (
		<SalesHandoffActionsAlertContent count={scopeQuery.data.uniqueOrderCount} />
	);
}
