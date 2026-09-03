"use client";

import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useRef, useState } from "react";

type SalesOrder = RouterOutputs["sales"]["getOrders"]["data"][number];

export type SalesOrderTablePresentation = Pick<
	SalesOrder,
	| "id"
	| "uuid"
	| "slug"
	| "orderId"
	| "email"
	| "customerPhone"
	| "customerName"
	| "customerId"
	| "accountNo"
	| "baseInvoiceTotal"
	| "displayCcc"
	| "invoiceTotal"
	| "amountDue"
	| "latestPaymentReview"
	| "due"
	| "status"
	| "statusLabel"
	| "productionState"
	| "pipeline"
>;

function baseInvoiceTotal(item: SalesOrderTablePresentation) {
	return item.baseInvoiceTotal ?? item.invoiceTotal;
}

function amountTone(item: SalesOrderTablePresentation) {
	if (item.amountDue === baseInvoiceTotal(item)) return "text-red-600";
	if (item.amountDue > 0) return "text-violet-600";
	return "text-emerald-600";
}

export function SalesOrderStatusCell({
	item,
	canEdit,
}: {
	item: SalesOrderTablePresentation;
	canEdit?: boolean;
}) {
	const auth = useAuth();
	const editable = canEdit ?? Boolean(auth.can?.editOrders);
	const className = cn(
		buttonVariants({ variant: "ghost", size: "sm" }),
		"h-7 max-w-full justify-start gap-1.5 whitespace-nowrap border-0 px-2 font-medium shadow-none",
		getSalesOrderLifecycleStatusBadgeClassName(item.status),
	);

	if (!editable) {
		return (
			<span className={className} aria-label={`${item.statusLabel} status`}>
				<span className="truncate">{item.statusLabel}</span>
			</span>
		);
	}

	return (
		<SalesMenu
			id={item.id}
			slug={item.slug}
			type="order"
			orderNo={item.orderId}
			customerEmail={item.email}
			customerPhone={item.customerPhone}
			customerName={item.customerName}
			align="start"
			contentClassName="min-w-56"
			trigger={
				<span
					aria-label={`Change status for ${item.orderId}`}
					// biome-ignore lint/a11y/useSemanticElements: Product design requires the status badge to remain a non-button trigger.
					role="button"
					tabIndex={0}
					className={cn(className, "cursor-pointer")}
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
				>
					<span className="truncate">{item.statusLabel}</span>
					<Icons.ChevronDown className="size-3 shrink-0 opacity-70" />
				</span>
			}
		>
			<SalesMenu.MarkAs
				asSubmenu={false}
				currentStatus={item.status}
				productionStatus={item.productionState}
				pipelineCapabilities={item.pipeline?.capabilities}
				statusCandidates={[
					{
						salesId: item.id,
						status: item.status,
						pipelineRevision: item.pipeline?.revision,
					},
				]}
			/>
		</SalesMenu>
	);
}

export function SalesOrderInvoiceCell({
	item,
	canEdit,
}: {
	item: SalesOrderTablePresentation;
	canEdit?: boolean;
}) {
	const auth = useAuth();
	const editable = canEdit ?? Boolean(auth.can?.editOrders);
	const [opened, setOpened] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const pending = item.amountDue;
	const total = item.invoiceTotal;
	const baseTotal = baseInvoiceTotal(item);
	const ccc = item.displayCcc || 0;
	const paid = Math.max(baseTotal - pending, 0);
	const paymentReview = item.latestPaymentReview;
	const amountContent = formatCurrency.format(total);
	const amountClassName = cn(
		"block truncate text-right font-mono font-medium",
		amountTone(item),
	);

	if (pending <= 0) {
		return (
			<div className="flex min-w-0 flex-col items-end gap-0.5">
				<span className={amountClassName}>{amountContent}</span>
				<PaymentReviewBadge paymentReview={paymentReview} />
			</div>
		);
	}

	return (
		<div className="relative z-10 flex min-w-0 flex-col items-end gap-0.5 text-right">
			{editable ? (
				<SalesPaymentProcessor
					phoneNo={item.accountNo || item.customerPhone}
					selectedIds={[item.id]}
					customerId={item.customerId}
				>
					<button
						ref={buttonRef}
						type="button"
						className="hidden"
						onClick={(event) => event.stopPropagation()}
					/>
				</SalesPaymentProcessor>
			) : null}
			<TooltipProvider delayDuration={70}>
				<Tooltip open={opened} onOpenChange={setOpened}>
					<TooltipTrigger asChild>
						<button
							type="button"
							className={cn("w-full", amountClassName)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
						>
							{amountContent}
						</button>
					</TooltipTrigger>
					<TooltipContent
						align="end"
						side="left"
						sideOffset={10}
						className="relative z-[999] w-52 space-y-3 px-3 py-2 text-xs"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
					>
						<div className="space-y-2">
							<InvoiceBreakdownLine label="Base Total" value={baseTotal} />
							{ccc > 0 ? (
								<InvoiceBreakdownLine label="C.C.C" value={ccc} />
							) : null}
							<InvoiceBreakdownLine label="Pending" value={pending} />
							<InvoiceBreakdownLine label="Paid" value={paid} />
							<InvoiceBreakdownLine label="Total" value={total} />
							{paymentReview ? (
								<InvoiceBreakdownLine
									label="Latest payment"
									value={paymentReview.amount}
								/>
							) : null}
						</div>
						{editable ? (
							<Button
								className="w-full"
								disabled={!item.due}
								size="sm"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									setOpened(false);
									buttonRef.current?.click();
								}}
							>
								Apply Payment
							</Button>
						) : null}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PaymentReviewBadge paymentReview={paymentReview} />
		</div>
	);
}

function PaymentReviewBadge({
	paymentReview,
}: {
	paymentReview: SalesOrderTablePresentation["latestPaymentReview"];
}) {
	if (!paymentReview) return null;

	return (
		<Badge
			variant="outline"
			className="h-4 max-w-full gap-1 rounded-full border-amber-200 bg-amber-50 px-1.5 text-[9px] font-semibold uppercase text-amber-700"
			title={`${paymentReview.origin || "office"} payment needs review`}
		>
			<Icons.CheckCircle className="size-2.5 shrink-0" />
			<span className="truncate">
				{paymentReview.origin === "online" ? "Online" : "Office"}
			</span>
		</Badge>
	);
}

function InvoiceBreakdownLine({
	label,
	value,
}: { label: string; value: number }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="font-medium text-muted-foreground">{label}</span>
			<span className="font-mono font-medium">
				{formatCurrency.format(value)}
			</span>
		</div>
	);
}
