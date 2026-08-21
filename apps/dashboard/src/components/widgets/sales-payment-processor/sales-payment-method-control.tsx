"use client";

import type { SalesPaymentMethods } from "@gnd/sales/constants";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu, InputGroup } from "@gnd/ui/namespace";
import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";
import {
	buildPaymentMethodControlModel,
	isAvailablePaymentTerminal,
	normalizePaymentTerminalId,
} from "./utils";

export type PaymentMethodOption = {
	label?: string;
	value?: SalesPaymentMethods;
};

export type PaymentTerminalOption = {
	label?: string | null;
	status?: string | null;
	value?: string | null;
};

type LayoutTransition = {
	duration: number;
	ease: [number, number, number, number];
};

export type SalesPaymentMethodControlProps = {
	checkNumber?: string | null;
	deviceId?: string | null;
	disabled?: boolean;
	error?: string | null;
	invalid?: boolean;
	method: SalesPaymentMethods;
	methods: PaymentMethodOption[];
	terminals: PaymentTerminalOption[];
	transition: LayoutTransition;
	onCheckNumberBlur?: () => void;
	onCheckNumberChange: (value: string) => void;
	onMethodChange: (method: SalesPaymentMethods) => void;
	onTerminalChange: (terminal: PaymentTerminalOption) => void;
};

export function SalesPaymentMethodControl({
	checkNumber,
	deviceId,
	disabled,
	error,
	invalid,
	method,
	methods,
	terminals,
	transition,
	onCheckNumberBlur,
	onCheckNumberChange,
	onMethodChange,
	onTerminalChange,
}: SalesPaymentMethodControlProps) {
	const errorId = useId();
	const model = buildPaymentMethodControlModel({
		deviceId,
		method,
		methods,
		terminals,
	});
	const describedBy = error ? errorId : undefined;

	const menuItems = (
		<>
			{model.methods.map((option) => {
				if (option.value === "terminal") {
					return (
						<DropdownMenu.Sub key={option.value}>
							<DropdownMenu.SubTrigger
								disabled={disabled}
								className="gap-2"
							>
								<Icons.terminal className="size-4 text-muted-foreground" />
								<span>Terminal</span>
								<span className="ml-auto mr-1 text-xs tabular-nums text-muted-foreground">
									{model.availableTerminalCount} available
								</span>
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent className="min-w-52">
								{model.terminals.length === 0 ? (
									<DropdownMenu.Item disabled>
										No terminals configured
									</DropdownMenu.Item>
								) : null}
								{model.terminals.map((terminal) => {
									const available = isAvailablePaymentTerminal(terminal);
									const selected =
										Boolean(deviceId) &&
										normalizePaymentTerminalId(terminal.value) ===
											normalizePaymentTerminalId(deviceId);
									return (
										<DropdownMenu.Item
											key={terminal.value || terminal.label}
											disabled={!available}
											className="gap-2"
											onSelect={() => onTerminalChange(terminal)}
										>
											<Icons.terminal className="size-4 text-muted-foreground" />
											<span className="min-w-0 flex-1 truncate">
												{terminal.label || "Unnamed terminal"}
											</span>
											{available ? null : (
												<span className="text-xs text-muted-foreground">
													Offline
												</span>
											)}
											{selected ? <Icons.check className="size-4" /> : null}
										</DropdownMenu.Item>
									);
								})}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					);
				}

				return (
					<DropdownMenu.Item
						key={option.value}
						className="gap-2"
						onSelect={() => onMethodChange(option.value)}
					>
						<Icons.payment className="size-4 text-muted-foreground" />
						<span className="flex-1">{option.label || option.value}</span>
						{method === option.value ? (
							<Icons.check className="size-4" />
						) : null}
					</DropdownMenu.Item>
				);
			})}
		</>
	);

	return (
		<div className="grid min-w-0 gap-1.5">
			<AnimatePresence initial={false} mode="wait">
				{method === "check" ? (
					<motion.div
						key="check-payment-control"
						layout
						initial={{ opacity: 0, y: 3 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -3 }}
						transition={transition}
					>
						<InputGroup
							data-disabled={disabled || undefined}
							aria-invalid={invalid || undefined}
						>
							<InputGroup.Addon align="inline-start">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger asChild>
										<InputGroup.Button
											disabled={disabled}
											aria-label="Change payment method. Current method: Check"
											aria-describedby={describedBy}
										>
											Check
											<Icons.ChevronDown className="size-3.5" />
										</InputGroup.Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start" className="min-w-56">
										{menuItems}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</InputGroup.Addon>
							<InputGroup.Input
								disabled={disabled}
								value={checkNumber || ""}
								onBlur={onCheckNumberBlur}
								onChange={(event) => onCheckNumberChange(event.target.value)}
								placeholder="Enter check number"
								aria-label="Check number"
								aria-invalid={invalid || undefined}
								aria-describedby={describedBy}
							/>
						</InputGroup>
					</motion.div>
				) : (
					<motion.div
						key="standard-payment-control"
						layout
						initial={{ opacity: 0, y: 3 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -3 }}
						transition={transition}
					>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Button
									type="button"
									variant="outline"
									disabled={disabled}
									aria-label={`Payment method: ${model.triggerLabel}`}
									aria-invalid={invalid || undefined}
									aria-describedby={describedBy}
									className={cn(
										"h-9 w-full justify-between px-3 font-normal transition-colors motion-reduce:transition-none",
										invalid &&
											"border-destructive ring-[3px] ring-destructive/20",
									)}
								>
									<span className="truncate">{model.triggerLabel}</span>
									<Icons.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="start" className="min-w-56">
								{menuItems}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</motion.div>
				)}
			</AnimatePresence>
			{error ? (
				<p
					id={errorId}
					role="alert"
					className={cn(
						"text-xs text-destructive",
						method === "check" && "sr-only",
					)}
				>
					{error}
				</p>
			) : null}
		</div>
	);
}
