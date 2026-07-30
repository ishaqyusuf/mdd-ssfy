"use client";

import { SalesReportingPeriodControl } from "@/components/sales-dashboard/period-control";
import { Button } from "@gnd/ui/button";
import { ArrowRight, BarChart3, WalletCards } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SalesDashboardHeader({
	title = "Sales dashboard",
	description = "A period-aware view of bookings, order activity, and operational follow-up.",
	showReportsLink = true,
	actions,
}: {
	title?: string;
	description?: string;
	showReportsLink?: boolean;
	actions?: ReactNode;
}) {
	return (
		<header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
			<div className="min-w-0">
				<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
					<BarChart3 className="size-3.5" />
					Sales intelligence
				</div>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
				<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
					{description}
				</p>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<SalesReportingPeriodControl />
				<Button asChild variant="outline" className="h-9 gap-2">
					<Link href="/sales-book/finance">
						<WalletCards className="size-4" />
						Finance
					</Link>
				</Button>
				{actions}
				{showReportsLink ? (
					<Button asChild className="h-9 gap-2">
						<Link href="/sales-book/reports">
							Reports
							<ArrowRight className="size-4" />
						</Link>
					</Button>
				) : null}
			</div>
		</header>
	);
}
