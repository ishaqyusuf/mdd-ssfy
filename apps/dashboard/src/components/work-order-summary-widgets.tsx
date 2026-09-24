"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const cards = [
	{
		key: "total",
		label: "All work orders",
		detail: "Open the full queue",
		href: "/community/customer-services",
		Icon: Icons.ListTodo,
		color:
			"border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
		iconColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
	},
	{
		key: "pending",
		label: "Pending",
		detail: "Needs scheduling",
		href: "/community/customer-services?status=Pending",
		Icon: Icons.Clock,
		color:
			"border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
		iconColor:
			"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
	},
	{
		key: "scheduled",
		label: "Scheduled",
		detail: "Appointments arranged",
		href: "/community/customer-services?status=Scheduled",
		Icon: Icons.Calendar,
		color:
			"border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
		iconColor:
			"bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200",
	},
	{
		key: "completed",
		label: "Completed",
		detail: "Work finished",
		href: "/community/customer-services?status=Completed",
		Icon: Icons.CheckCircle,
		color:
			"border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
		iconColor:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
	},
] as const;

export function WorkOrderSummaryWidgets() {
	const trpc = useTRPC();
	const { data } = useQuery(
		trpc.customerService.getSummary.queryOptions(undefined, {
			staleTime: 60_000,
			refetchOnWindowFocus: false,
		}),
	);

	return (
		<section
			aria-label="Work order overview"
			className="grid grid-cols-2 gap-3 lg:grid-cols-4"
		>
			{cards.map(({ key, label, detail, href, Icon, color, iconColor }) => (
				<Link
					key={key}
					href={href}
					className={cn(
						"group flex min-h-32 flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-36 sm:p-5",
						color,
					)}
				>
					<div className="flex items-start justify-between gap-2">
						<span className="text-xs font-semibold uppercase tracking-wide sm:text-sm">
							{label}
						</span>
						<span className={cn("rounded-lg p-2", iconColor)}>
							<Icon className="size-4" />
						</span>
					</div>
					<div>
						<p
							className="text-3xl font-semibold tabular-nums sm:text-4xl"
							aria-label={data ? `${data[key]} ${label}` : `Loading ${label}`}
						>
							{data ? (
								data[key].toLocaleString()
							) : (
								<span className="inline-block h-8 w-12 animate-pulse rounded bg-current/10" />
							)}
						</p>
						<p className="mt-1 text-xs opacity-75 sm:text-sm">{detail}</p>
					</div>
				</Link>
			))}
		</section>
	);
}
