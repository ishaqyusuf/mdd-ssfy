"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import { Select } from "@gnd/ui/namespace";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

const PAYMENT_METHOD_OPTIONS = [
	"Credit Card",
	"Cash",
	"Check",
	"ACH",
	"Link",
	"Wire Transfer",
	"Zelle",
];

function normalizePaymentMethod(value?: string | null) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replaceAll("_", "-")
		.replaceAll(" ", "-");
}

function formatPaymentMethod(value?: string | null) {
	if (!value) return "Credit Card";
	const normalized = normalizePaymentMethod(value);
	return (
		PAYMENT_METHOD_OPTIONS.find(
			(method) => normalizePaymentMethod(method) === normalized,
		) || value
	);
}

type SalesOverviewPaymentMethodSelectProps = {
	salesId?: number | null;
	value?: string | null;
	disabled?: boolean;
	className?: string;
	variant?: "row" | "inline";
};

export function SalesOverviewPaymentMethodSelect({
	salesId,
	value,
	disabled,
	className,
	variant = "row",
}: SalesOverviewPaymentMethodSelectProps) {
	const trpc = useTRPC();
	const selectedValue = formatPaymentMethod(value);
	const options = PAYMENT_METHOD_OPTIONS.includes(selectedValue)
		? PAYMENT_METHOD_OPTIONS
		: [selectedValue, ...PAYMENT_METHOD_OPTIONS];
	const updatePaymentMethod = useMutation(
		trpc.sales.updatePaymentMethod.mutationOptions({
			onSuccess: () => {
				toast({
					title: "Payment method updated.",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to update payment method.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const isDisabled = disabled || !salesId || updatePaymentMethod.isPending;
	const control = isDisabled ? (
		<span className="text-sm font-medium">{selectedValue}</span>
	) : (
		<Select.Root
			value={selectedValue}
			onValueChange={(paymentMethod) => {
				if (!salesId || paymentMethod === selectedValue) return;
				updatePaymentMethod.mutate({
					salesId,
					paymentMethod,
				});
			}}
		>
			<Select.Trigger
				className={cn(
					"h-8 w-[156px] text-xs",
					variant === "inline" && "w-auto min-w-24",
				)}
			>
				<Select.Value placeholder="Payment Method" />
			</Select.Trigger>
			<Select.Content>
				{options.map((method) => (
					<Select.Item key={method} value={method}>
						{method}
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);

	if (variant === "inline") {
		return <div className={cn("shrink-0", className)}>{control}</div>;
	}

	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 border-b border-border/40 py-3 last:border-b-0",
				className,
			)}
		>
			<span className="text-sm text-muted-foreground">Payment Method</span>
			{control}
		</div>
	);
}
