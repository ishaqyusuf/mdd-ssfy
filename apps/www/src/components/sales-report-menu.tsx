"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

import type { PermissionScope } from "@/types/auth";

const reportMenuItems = [
	{
		label: "Payment Report",
		href: "/task-events/sales-daily-payment-report-schedule",
		permission: "generateSalesPaymentReport",
	},
] satisfies {
	label: string;
	href: string;
	permission: PermissionScope;
}[];

type Props = {
	variant?: "nav" | "header";
};

export function SalesReportMenu({ variant = "header" }: Props) {
	const auth = useAuth();
	const allowedReportMenuItems = reportMenuItems.filter(
		(item) => auth.can?.[item.permission],
	);

	if (!allowedReportMenuItems.length) {
		return null;
	}

	// Use a direct CTA while there is only one report; switch to the dropdown once more report items are available.
	if (allowedReportMenuItems.length === 1) {
		const item = allowedReportMenuItems[0];

		return (
			<Link
				href={item.href}
				aria-label={item.label}
				className={cn(
					buttonVariants({
						variant: variant === "nav" ? "ghost" : "outline",
						size: variant === "nav" ? undefined : "sm",
					}),
					variant === "nav"
						? "h-8 gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800"
						: "gap-2",
				)}
			>
				<Icons.ChartSpline className="size-4" />
				<span className={variant === "nav" ? undefined : "hidden lg:inline"}>
					{item.label}
				</span>
			</Link>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{variant === "nav" ? (
					<button
						type="button"
						className={cn(
							buttonVariants({
								variant: "ghost",
							}),
							"gap-1.5",
						)}
					>
						<Icons.ChartSpline className="size-4" />
						Payment Report
						<Icons.ChevronDown className="size-3.5" />
					</button>
				) : (
					<Button type="button" variant="outline" size="sm" className="gap-2">
						<Icons.ChartSpline className="size-4" />
						<span className="hidden lg:inline">Payment Report</span>
						<Icons.ChevronDown className="size-3.5" />
					</Button>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{allowedReportMenuItems.map((item) => (
					<DropdownMenuItem key={item.href} asChild>
						<Link href={item.href} className="gap-2">
							<Icons.ChartSpline className="size-4 shrink-0" />
							<span className="flex-1">{item.label}</span>
							<Icons.ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
