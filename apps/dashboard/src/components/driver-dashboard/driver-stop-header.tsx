"use client";

import {
	DRIVER_STOP_URL_OPTIONS,
	useDriverDashboardParams,
} from "@/hooks/use-driver-dashboard-params";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ArrowLeft, CircleHelp, X } from "lucide-react";
import Link from "next/link";
import type { DriverStopDetail } from "./driver-stop-types";

export function DriverStopHeader({
	detail,
	modal,
	onClose,
}: {
	detail: DriverStopDetail;
	modal: boolean;
	onClose: () => void;
}) {
	const { params, setParams } = useDriverDashboardParams();
	const order = detail.order;
	const dispatch = detail.dispatch;
	const title =
		params.mode === "proof"
			? "Complete delivery"
			: params.mode === "help"
				? "I need help"
				: "Today’s route";
	const isSubflow = params.mode === "proof" || params.mode === "help";

	if (!modal && !isSubflow) return null;

	const backAction = isSubflow ? (
		<Button
			variant="outline"
			size="icon"
			aria-label="Back to stop overview"
			onClick={() =>
				void setParams({ mode: "details" }, DRIVER_STOP_URL_OPTIONS)
			}
		>
			<ArrowLeft className="size-4" />
		</Button>
	) : modal ? (
		<Button
			variant="outline"
			size="icon"
			aria-label="Back to Dispatch Tasks"
			onClick={onClose}
		>
			<ArrowLeft className="size-4" />
		</Button>
	) : (
		<Button asChild variant="outline" size="icon">
			<Link
				href="/sales-book/dispatch-task"
				aria-label="Back to Dispatch Tasks"
			>
				<ArrowLeft className="size-4" />
			</Link>
		</Button>
	);

	return (
		<header className="flex shrink-0 items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
			{modal ? (
				<span className="hidden size-9 shrink-0 overflow-hidden rounded-lg sm:block [&_img]:size-9">
					<Icons.Logo />
				</span>
			) : null}
			{backAction}
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<p className="truncate text-base font-medium sm:text-lg">{title}</p>
					{!isSubflow && order?.orderId ? (
						<>
							<span className="text-muted-foreground">›</span>
							<span className="truncate text-sm font-semibold sm:text-base">
								Stop {order.orderId}
							</span>
						</>
					) : null}
				</div>
				<p className="mt-1 truncate text-sm text-muted-foreground">
					{order
						? `${order.orderId} · ${order.customer?.businessName || order.customer?.name || "Customer"}`
						: "Review this assigned stop and its guarded delivery workflow."}
				</p>
			</div>
			{!isSubflow ? (
				<>
					<Badge
						variant="outline"
						className="hidden shrink-0 gap-2 font-normal text-muted-foreground md:flex"
					>
						<span className="size-2 rounded-full bg-emerald-600" />
						Manifest synced
					</Badge>
					<Button
						variant="outline"
						size="sm"
						className="hidden sm:flex"
						onClick={() =>
							void setParams({ mode: "help" }, DRIVER_STOP_URL_OPTIONS)
						}
					>
						<CircleHelp className="mr-2 size-4" /> Help
					</Button>
				</>
			) : null}
			{dispatch?.status ? (
				<Badge variant="outline" className="hidden shrink-0 capitalize lg:flex">
					{dispatch.status}
				</Badge>
			) : null}
			{modal ? (
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close stop workspace"
					onClick={onClose}
				>
					<X className="size-4" />
				</Button>
			) : null}
		</header>
	);
}
