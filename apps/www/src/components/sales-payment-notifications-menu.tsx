"use client";

import { _trpc } from "@/components/static-trpc";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { Button } from "@gnd/ui/button";
import { DropdownMenu, InputGroup } from "@gnd/ui/namespace";
import { useQuery } from "@gnd/ui/tanstack";
import { formatMoney } from "@gnd/utils";
import {
	reminderPresetPayPlans,
	resolveReminderAmount,
} from "@sales/utils/reminder-pay-plan";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { BellRing, CreditCard, Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
	disabled?: boolean;
	onSent?: () => void;
	salesIds: number[];
	type?: string;
};

export function SalesPaymentNotificationsMenu({
	disabled,
	onSent,
	salesIds,
	type,
}: Props) {
	const [customOpen, setCustomOpen] = useState(false);
	const [customAmount, setCustomAmount] = useState("");
	const saleId = salesIds.length === 1 ? salesIds[0] : null;
	const { data, isPending } = useQuery(
		_trpc.sales.getOrders.queryOptions(
			{
				salesIds: saleId ? [saleId] : [],
			},
			{
				enabled: !!saleId,
			},
		),
	);
	const trigger = useNotificationTrigger({
		successToast: "Payment reminder sent!",
		errorToast: "Unable to send payment reminder.",
		onSuccess() {
			setCustomAmount("");
			setCustomOpen(false);
			onSent?.();
		},
		onError() {
			setCustomOpen(false);
		},
	});

	const sale = data?.data?.[0];
	const dueAmount = Number(sale?.due || 0);
	const isSingleSale = salesIds.length === 1;
	const hasEmail = !saleId || isPending || !!sale?.email;
	const isDisabled =
		disabled ||
		type === "quote" ||
		!isSingleSale ||
		!saleId ||
		dueAmount <= 0 ||
		!hasEmail ||
		trigger.isActionPending;

	const presetOptions = useMemo(
		() =>
			reminderPresetPayPlans.map((payPlan) => ({
				payPlan,
				amount: resolveReminderAmount({
					due: dueAmount,
					payPlan,
				}),
			})),
		[dueAmount],
	);

	const sendReminder = (
		payPlan: number | "full" | "custom",
		preferredAmount?: number,
	) => {
		if (!saleId) return;

		trigger.simpleSalesEmailReminder({
			salesId: saleId,
			payPlan,
			preferredAmount,
			attachInvoice: true,
		});
	};

	const customValue = Number(customAmount);
	const customAmountIsValid =
		Number.isFinite(customValue) && customValue > 0 && customValue <= dueAmount;

	if (type === "quote") {
		return null;
	}

	return (
		<DropdownMenu.Sub>
			<TooltipProvider disableHoverableContent>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>
						<DropdownMenu.SubTrigger
							disabled={disabled || !hasEmail || trigger.isActionPending}
						>
							<CreditCard className="mr-2 size-4 text-muted-foreground/70" />
							Payment Notifications
						</DropdownMenu.SubTrigger>
					</TooltipTrigger>
					{!hasEmail && (
						<TooltipContent>Customer email not available!</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
			<DropdownMenu.SubContent className="w-[250px]">
				{!isSingleSale ? (
					<DropdownMenu.Item disabled>
						<BellRing className="mr-2 size-4 text-muted-foreground/70" />
						Single sale only
					</DropdownMenu.Item>
				) : null}

				{isPending ? (
					<DropdownMenu.Item disabled>
						<Loader2 className="mr-2 size-4 animate-spin text-muted-foreground/70" />
						Loading payment details
					</DropdownMenu.Item>
				) : null}

				{!isPending && isSingleSale && dueAmount <= 0 ? (
					<DropdownMenu.Item disabled>
						<BellRing className="mr-2 size-4 text-muted-foreground/70" />
						No balance due
					</DropdownMenu.Item>
				) : null}

				{!isPending && isSingleSale && dueAmount > 0
					? presetOptions.map((option) => (
							<DropdownMenu.Item
								key={option.payPlan}
								disabled={isDisabled}
								onSelect={(event) => {
									event.preventDefault();
									sendReminder(option.payPlan);
								}}
							>
								<CreditCard className="mr-2 size-4 text-muted-foreground/70" />
								{option.payPlan}% (${formatMoney(option.amount)})
							</DropdownMenu.Item>
						))
					: null}

				{!isPending && isSingleSale && dueAmount > 0 ? (
					<DropdownMenu.Item
						disabled={isDisabled}
						onSelect={(event) => {
							event.preventDefault();
							sendReminder("full");
						}}
					>
						<CreditCard className="mr-2 size-4 text-muted-foreground/70" />
						Full (${formatMoney(dueAmount)})
					</DropdownMenu.Item>
				) : null}

				{!isPending && isSingleSale && dueAmount > 0 ? (
					<DropdownMenu.Item
						disabled={isDisabled}
						onSelect={(event) => {
							event.preventDefault();
							setCustomOpen(true);
						}}
					>
						<BellRing className="mr-2 size-4 text-muted-foreground/70" />
						Custom
					</DropdownMenu.Item>
				) : null}

        {customOpen && isSingleSale && dueAmount > 0 ? (
          <div
            className="border-t px-2 py-3"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
						<div className="mb-2 text-xs font-medium text-muted-foreground">
							Send a custom payment amount
						</div>
						<InputGroup>
							<InputGroup.Input
								autoFocus
								inputMode="decimal"
								min={0}
								max={dueAmount}
								placeholder="Enter amount"
								value={customAmount}
								onChange={(event) => {
									setCustomAmount(event.target.value);
								}}
								onKeyDown={(event) => {
									event.stopPropagation();
									if (event.key === "Enter" && customAmountIsValid) {
										event.preventDefault();
										sendReminder("custom", customValue);
									}
								}}
							/>
							<InputGroup.Addon align="inline-end">
								/${formatMoney(dueAmount)}
							</InputGroup.Addon>
						</InputGroup>
						<div className="mt-2 flex justify-end gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setCustomOpen(false);
									setCustomAmount("");
								}}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								disabled={!customAmountIsValid || trigger.isActionPending}
								onClick={() => {
									sendReminder("custom", customValue);
								}}
							>
								{trigger.isActionPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Send className="size-4" />
								)}
								Send
							</Button>
						</div>
					</div>
				) : null}
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}
