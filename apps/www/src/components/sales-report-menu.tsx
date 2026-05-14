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
		label: "Daily Payment Report",
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
						<Icons.FileSpreadsheet className="size-4" />
						Report
						<Icons.ChevronDown className="size-3.5" />
					</button>
				) : (
					<Button type="button" variant="outline" size="sm" className="gap-2">
						<Icons.FileSpreadsheet className="size-4" />
						<span className="hidden lg:inline">Report</span>
						<Icons.ChevronDown className="size-3.5" />
					</Button>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{allowedReportMenuItems.map((item) => (
					<DropdownMenuItem key={item.href} asChild>
						<Link href={item.href}>
							<Icons.FileSpreadsheet className="mr-2 size-4" />
							{item.label}
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
