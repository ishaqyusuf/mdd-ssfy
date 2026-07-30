"use client";

import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	ArrowRight,
	Boxes,
	CalendarClock,
	FileSpreadsheet,
	ReceiptText,
	Users,
	WalletCards,
} from "lucide-react";
import Link from "next/link";

const reports = [
	{
		title: "Sales Finance",
		description:
			"Canonical payments, refunds, applications, reconciliation, and exports.",
		href: "/sales-book/finance",
		icon: WalletCards,
		permissions: ["viewOrderPayment", "editOrderPayment", "viewSales"],
		badge: "Canonical",
	},
	{
		title: "Receivables aging",
		description:
			"Open invoices, aging buckets, due dates, and receivable exports.",
		href: "/sales-book/finance?tab=receivables",
		icon: ReceiptText,
		permissions: ["viewOrderPayment", "editOrderPayment", "viewSales"],
	},
	{
		title: "Customer statements",
		description:
			"Review customer balances and create statement PDFs or delivery runs.",
		href: "/sales-book/reports?report=customer-statements",
		icon: Users,
		permissions: ["generateSalesStatementReport"],
	},
	{
		title: "Product report",
		description: "Detailed product volume and sales statistics table.",
		href: "/product-report",
		icon: Boxes,
		roles: ["Super Admin"],
	},
	{
		title: "Scheduled payment report",
		description:
			"Manage the existing daily payment report schedule and delivery.",
		href: "/task-events/sales-daily-payment-report-schedule",
		icon: CalendarClock,
		permissions: ["generateSalesPaymentReport"],
	},
] as const;

export function SalesReportCatalog() {
	const auth = useAuth();
	const visibleReports = reports.filter((report) => {
		if ("roles" in report && report.roles.includes(auth.roleTitle as never)) {
			return true;
		}
		if ("permissions" in report) {
			return report.permissions.some(
				(permission) => auth.can?.[permission as keyof typeof auth.can],
			);
		}
		return false;
	});

	return (
		<section className="space-y-3" aria-labelledby="report-catalog-heading">
			<div>
				<h2 id="report-catalog-heading" className="text-lg font-semibold">
					Report catalog
				</h2>
				<p className="text-sm text-muted-foreground">
					Operational reports remain in their governed source workspaces.
				</p>
			</div>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{visibleReports.map((report) => {
					const Icon = report.icon;
					return (
						<Card key={report.title} className="group">
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between gap-3">
									<span className="flex size-9 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-4" />
									</span>
									{"badge" in report ? (
										<Badge variant="outline">{report.badge}</Badge>
									) : null}
								</div>
								<CardTitle className="pt-2 text-base">{report.title}</CardTitle>
								<CardDescription>{report.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<Button
									asChild
									variant="ghost"
									className="-ml-3 gap-2 group-hover:bg-muted"
								>
									<Link href={report.href}>
										Open report
										<ArrowRight className="size-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>
					);
				})}
				{visibleReports.length === 0 ? (
					<Card className="md:col-span-2 xl:col-span-3">
						<CardContent className="flex min-h-32 items-center gap-3 text-sm text-muted-foreground">
							<FileSpreadsheet className="size-5" />
							No additional report exports are available for your permissions.
						</CardContent>
					</Card>
				) : null}
			</div>
		</section>
	);
}
