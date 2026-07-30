"use client";

import { ResponsiveMetric } from "@/components/responsive-metric";
import { useAuth } from "@/hooks/use-auth";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	BadgeDollarSign,
	Calculator,
	CircleAlert,
	FileText,
	PackageCheck,
	ShoppingCart,
} from "lucide-react";

function formatChange(value?: number | null) {
	if (value == null) return "No prior-period baseline";
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(1)}% vs previous period`;
}

export function SalesDashboardSummary() {
	const trpc = useTRPC();
	const auth = useAuth();
	const { params } = useSalesDashboardParams();
	const input = { from: params.from, to: params.to };
	const summary = useQuery(trpc.salesDashboard.getKpis.queryOptions(input));
	const canViewFinance = Boolean(
		auth.can?.viewOrderPayment ||
			auth.can?.editOrderPayment ||
			auth.can?.viewSales,
	);
	const finance = useQuery(
		trpc.salesFinance.summary.queryOptions(input, {
			enabled: canViewFinance,
		}),
	);

	if (summary.isLoading) return <SalesDashboardSummarySkeleton />;
	const data = summary.data;

	return (
		<section
			aria-label="Sales summary"
			className="grid grid-cols-2 overflow-hidden rounded-xl border bg-background sm:gap-3 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-3 xl:grid-cols-6"
		>
			<ResponsiveMetric
				title="Booked sales"
				value={formatCurrency.format(data?.bookedSales || 0)}
				subtitle={formatChange(data?.change.bookedSales)}
				icon={BadgeDollarSign}
			/>
			<ResponsiveMetric
				title={canViewFinance ? "Net collections" : "Active production"}
				value={
					canViewFinance
						? formatCurrency.format(finance.data?.netAmount || 0)
						: (data?.activeProductionOrders ?? 0).toLocaleString()
				}
				subtitle={
					canViewFinance
						? "Canonical Sales Finance projection"
						: "Orders currently in production"
				}
				icon={canViewFinance ? PackageCheck : ShoppingCart}
			/>
			<ResponsiveMetric
				title="Orders"
				value={(data?.orderCount || 0).toLocaleString()}
				subtitle={formatChange(data?.change.orderCount)}
				icon={ShoppingCart}
			/>
			<ResponsiveMetric
				title="Quotes"
				value={(data?.quoteCount || 0).toLocaleString()}
				subtitle={formatChange(data?.change.quoteCount)}
				icon={FileText}
			/>
			<ResponsiveMetric
				title="Average order value"
				value={formatCurrency.format(data?.averageOrderValue || 0)}
				subtitle={formatChange(data?.change.averageOrderValue)}
				icon={Calculator}
			/>
			<ResponsiveMetric
				title="Needs attention"
				value={
					canViewFinance
						? (finance.data?.reviewCount || 0).toLocaleString()
						: (data?.activeProductionOrders || 0).toLocaleString()
				}
				subtitle={
					canViewFinance
						? "Payments requiring Finance review"
						: "Active production orders"
				}
				icon={CircleAlert}
			/>
		</section>
	);
}

export function SalesDashboardSummarySkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
			{["booked", "collections", "orders", "quotes", "aov", "attention"].map(
				(id) => (
					<Skeleton key={id} className="h-[126px] rounded-xl" />
				),
			)}
		</div>
	);
}
