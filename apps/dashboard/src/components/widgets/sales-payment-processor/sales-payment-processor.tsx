import { Env } from "@/components/env";
import { useAuth } from "@/hooks/use-auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTRPC } from "@/trpc/client";
import { salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import {
	canSetSalesPaymentDate,
	getSalesPaymentBusinessDate,
} from "@gnd/sales/payment-system/payment-date";
import type { TerminalCheckoutStatus } from "@gnd/square";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Menu } from "@gnd/ui/custom/menu";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import {
	Dialog,
	Field,
	InputGroup,
	Item,
	Popover,
} from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { ToastAction } from "@gnd/ui/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, {
	Suspense,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
	type FieldErrors,
	useController,
	useFieldArray,
} from "react-hook-form";
import type z from "zod";
import { PaymentProcessorSkeleton } from "./payment-processor-skeleton";
import { PaymentStatusOverlay } from "./payment-status-overlay";
import {
	type PaymentTerminalOption,
	SalesPaymentMethodControl,
} from "./sales-payment-method-control";
import { paymentProcessorFormSchema as formSchema } from "./schema";
import {
	fetchFreshTerminalPaymentStatus,
	getCompletedTerminalSaleReferences,
} from "./terminal-status-polling";
import type {
	PaymentOverlayState,
	PendingAppliedPaymentCheck,
	SalesPaymentProcessorProps,
} from "./types";
import { usePostPaymentPrintFlow } from "./use-post-payment-print-flow";
import {
	buildPrintRequests,
	calculatePaymentPlanPreview,
	canNotifyPaymentCustomer,
	formatPaymentAmount,
	getAvailablePaymentSales,
	getListedPaymentAmount,
	getListedPaymentSales,
	getPaymentMethodControlFeedback,
	isAvailablePaymentTerminal,
	resolveAvailablePaymentTerminal,
	resolveDefaultPaymentMethod,
	resolveDefaultPaymentTerminal,
	sanitizePaymentMethodFields,
} from "./utils";

type PaymentMethod = NonNullable<z.infer<typeof formSchema>["paymentMethod"]>;
type ExternalPaymentMethod = Exclude<PaymentMethod, "wallet">;

const walletPaymentMethodOption = {
	label: "Wallet",
	value: "wallet",
} as const;

function paymentDateToLocalDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function localDateToPaymentDate(value: Date) {
	return [
		value.getFullYear(),
		String(value.getMonth() + 1).padStart(2, "0"),
		String(value.getDate()).padStart(2, "0"),
	].join("-");
}

function paymentDateLabel(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(paymentDateToLocalDate(value));
}

function PaymentDateControl({
	disabled,
	disabledTitle,
	onChange,
	transition,
	value,
}: {
	disabled: boolean;
	disabledTitle: string;
	onChange: (value: string | null) => void;
	transition: { duration: number; ease: [number, number, number, number] };
	value?: string | null;
}) {
	const [open, setOpen] = useState(false);
	const today = getSalesPaymentBusinessDate();
	const calendarDate = paymentDateToLocalDate(value || today);
	const hasSelectedDate = Boolean(value);
	const title = disabled
		? disabledTitle
		: hasSelectedDate
			? `Payment date: ${paymentDateLabel(value || today)}`
			: "Select payment date (defaults to today)";

	return (
		<motion.div layout transition={transition} className="shrink-0">
			<ButtonGroup aria-label="Payment date">
				<Popover.Root open={open} onOpenChange={setOpen}>
					<Popover.Trigger asChild>
						<Button
							type="button"
							size="icon"
							variant="outline"
							disabled={disabled}
							aria-label={title}
							title={title}
							className={cn(
								"overflow-hidden transition-[width,padding] duration-200 ease-out motion-reduce:transition-none",
								hasSelectedDate ? "w-32 px-3" : "w-9 px-0",
							)}
						>
							<AnimatePresence initial={false} mode="wait">
								{hasSelectedDate ? (
									<motion.span
										key="payment-date"
										initial={{ opacity: 0, y: 3 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -3 }}
										transition={transition}
										className="whitespace-nowrap"
									>
										{paymentDateLabel(value || today)}
									</motion.span>
								) : (
									<motion.span
										key="calendar-icon"
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.9 }}
										transition={transition}
									>
										<Icons.CalendarIcon className="size-4" />
									</motion.span>
								)}
							</AnimatePresence>
						</Button>
					</Popover.Trigger>
					<Popover.Content align="start" className="w-auto p-0">
						<div className="border-b px-4 py-3">
							<p className="text-sm font-semibold">Payment date</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Choose when the payment was received.
							</p>
						</div>
						<Calendar
							mode="single"
							initialFocus
							defaultMonth={calendarDate}
							selected={calendarDate}
							disabled={(date) => localDateToPaymentDate(date) > today}
							onSelect={(date) => {
								if (!date) return;
								onChange(localDateToPaymentDate(date));
								setOpen(false);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				{hasSelectedDate ? (
					<Button
						type="button"
						size="icon"
						variant="outline"
						className="size-9 animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
						onClick={() => onChange(null)}
						aria-label="Clear payment date and use today"
						title="Clear payment date and use today"
					>
						<Icons.X className="size-4" />
					</Button>
				) : null}
			</ButtonGroup>
		</motion.div>
	);
}

function InlinePaymentOptionCopy({
	description,
	htmlFor,
	title,
}: {
	description: string;
	htmlFor: string;
	title: string;
}) {
	return (
		<Field.Content className="min-w-0 flex-row items-baseline gap-1.5">
			<Field.Label
				htmlFor={htmlFor}
				className="shrink-0 whitespace-nowrap font-normal"
			>
				{title}
			</Field.Label>
			<span aria-hidden="true" className="text-xs text-muted-foreground">
				—
			</span>
			<Field.Description className="min-w-0 text-xs font-normal">
				{description}
			</Field.Description>
		</Field.Content>
	);
}

export function SalesPaymentProcessor(props: SalesPaymentProcessorProps) {
	const [open, setOpened] = useState(false);
	return (
		<Dialog.Root open={open} onOpenChange={setOpened}>
			<Dialog.Trigger asChild>
				{props.children || (
					<Button
						disabled={props.disabled}
						onClick={(e) => {
							e.preventDefault();
							setOpened(!open);
						}}
						className=""
						{...props?.buttonProps}
					>
						<Icons.payment className="mr-2 size-4" />
						Pay
					</Button>
				)}
			</Dialog.Trigger>
			<Dialog.Content className="max-h-[90vh] w-[min(94vw,560px)] max-w-none gap-0 overflow-hidden p-0">
				<Suspense fallback={<PaymentProcessorSkeleton />}>
					<Content presentation="dialog" setOpened={setOpened} {...props} />
				</Suspense>
			</Dialog.Content>
		</Dialog.Root>
	);
}

export function SalesPaymentProcessorContent({
	footerTarget,
	onClose,
	...props
}: SalesPaymentProcessorProps & {
	footerTarget?: HTMLElement | null;
	onClose: () => void;
}) {
	return (
		<Suspense fallback={<PaymentProcessorSkeleton />}>
			<Content
				{...props}
				footerTarget={footerTarget}
				presentation="sheet"
				setOpened={(open) => {
					if (!open) onClose();
				}}
			/>
		</Suspense>
	);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function finiteNumber(value: unknown): number | null {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function resolveCccPercentageFromSales(sales: Array<{ meta?: unknown }>) {
	for (const sale of sales) {
		const meta = asRecord(sale.meta);
		const newSalesForm = asRecord(meta?.newSalesForm);
		const settings = asRecord(newSalesForm?.settings);
		const summary = asRecord(newSalesForm?.summary);
		const value =
			finiteNumber(meta?.ccc_percentage) ??
			finiteNumber(meta?.cccPercentage) ??
			finiteNumber(settings?.cccPercentage) ??
			finiteNumber(summary?.cccPercentage);
		if (value != null) return value;
	}
	return 3.5;
}

function Content(
	props: SalesPaymentProcessorProps & {
		footerTarget?: HTMLElement | null;
		presentation: "dialog" | "sheet";
		setOpened: (open: boolean) => void;
	},
) {
	const { presentation, selectedIds, setOpened } = props;
	const isSheet = presentation === "sheet";
	const auth = useAuth();
	const canSetPaymentDate = canSetSalesPaymentDate([auth.roleTitle]);
	const prefersReducedMotion = useReducedMotion();
	const formId = useId();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const salesPrint = useSalesPrintController();
	const postPaymentPrint = usePostPaymentPrintFlow(salesPrint.print);
	const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
	const { data, refetch } = useSuspenseQuery(
		trpc.customers.getCustomerPayPortal.queryOptions({
			accountNo,
		}),
	);
	const terminalPaymentsEnabled = data?.terminalPaymentsEnabled !== false;
	const terminalLoadError =
		data.error.terminal?.[0]?.detail ||
		(data.error.terminal ? "Unable to load Square terminals." : null);
	const availableSalesPaymentMethods = salesPaymentMethods.filter(
		(method) => terminalPaymentsEnabled || method.value !== "terminal",
	);
	const form = useZodForm(formSchema, {
		defaultValues: {},
	});
	const { fieldState: terminalDeviceFieldState } = useController({
			control: form.control,
			name: "deviceId",
		});
	const paymentCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingAppliedPaymentCheckRef =
		useRef<PendingAppliedPaymentCheck | null>(null);
	const lastExternalPaymentMethodRef =
		useRef<ExternalPaymentMethod>("credit-card");
	const lastSubmittedAmountRef = useRef<number | null>(null);
	const lastSubmittedPaymentMethodRef = useRef<
		z.infer<typeof formSchema>["paymentMethod"] | null
	>(null);
	const hasSubmittedCompletedTerminalRef = useRef(false);
	const lastFormResetKeyRef = useRef<string | null>(null);
	const [terminalState, setTerminalState] =
		useState<PaymentOverlayState>("form");
	const [terminalError, setTerminalError] = useState<string | null>(null);
	const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
	const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus | null>(
		null,
	);
	const selectedIdsKey = useMemo(() => selectedIds.join(","), [selectedIds]);
	const pendingSalesResetKey = useMemo(
		() =>
			data.pendingSales
				.map((sale) => `${sale.id}:${sale.paymentMethod ?? ""}`)
				.join("|"),
		[data.pendingSales],
	);
	useEffect(() => {
		console.log(data.error);

		if (terminalPaymentsEnabled && data.error.terminal) {
			toast({
				title: "Unable to load PoS",
				description: terminalLoadError,
				variant: "destructive",
				footer: (
					<div className="">
						<ToastAction
							altText="Yes"
							onClick={(e) => {
								refetch();
							}}
							className=""
						>
							Retry
						</ToastAction>
					</div>
				),
			});
		}

		const formResetKey = [
			accountNo,
			data?.lastTerminalId ?? "",
			data?.recentPaymentMethod ?? "",
			terminalPaymentsEnabled ? "terminal:on" : "terminal:off",
			selectedIdsKey,
			pendingSalesResetKey,
		].join("|");

		if (lastFormResetKeyRef.current === formResetKey) return;
		lastFormResetKeyRef.current = formResetKey;

		let paymentMethod = resolveDefaultPaymentMethod(
			data.pendingSales,
			selectedIds,
			{
				recentPaymentMethod: data.recentPaymentMethod,
				terminalEnabled: terminalPaymentsEnabled,
			},
		);
		const recentTerminal = resolveDefaultPaymentTerminal(
			data.terminals,
			data.lastTerminalId,
		);
		if (paymentMethod === "terminal" && !recentTerminal) {
			paymentMethod = "credit-card";
		}

		form.reset({
			deviceId: terminalPaymentsEnabled ? recentTerminal?.value : undefined,
			deviceName: terminalPaymentsEnabled ? recentTerminal?.label : undefined,
			paymentDate: null,
			terminalPaymentSession: null,
			notifyCustomer: false,
			useWallet: false,
			print: true,
			printPackingSlip: false,
			sales: getListedPaymentSales(data.pendingSales, selectedIds).map((s) => ({
				id: s.id,
				selected: true,
			})),
			accountNo,
			paymentMethod,
		});
		setTerminalError(null);
		setTerminalState("form");
		hasSubmittedCompletedTerminalRef.current = false;
	}, [
		accountNo,
		data,
		form,
		pendingSalesResetKey,
		refetch,
		selectedIds,
		selectedIdsKey,
		terminalLoadError,
		terminalPaymentsEnabled,
	]);
	const {
		fields: salesFields,
		append: appendSalesField,
		remove: removeSalesField,
	} = useFieldArray({
		control: form.control,
		name: "sales",
		keyName: "fieldId",
	});
	const {
		sales: wSales,
		paymentMethod: pm,
		amount,
		editPrice,
		terminalPaymentSession,
		paymentStatus,
		linkProcessed,
		notifyCustomer,
		print,
		printPackingSlip,
		deviceId,
		useWallet,
		paymentDate,
		checkNo,
	} = form.watch();
	const listedSalesIds = useMemo(
		() => salesFields.map((sale) => sale.id),
		[salesFields],
	);
	const pendingSalesById = useMemo(
		() => new Map(data.pendingSales.map((sale) => [sale.id, sale])),
		[data.pendingSales],
	);
	const listedSales = useMemo(
		() => getListedPaymentSales(data.pendingSales, listedSalesIds),
		[data.pendingSales, listedSalesIds],
	);
	const canNotifyCustomer = canNotifyPaymentCustomer(listedSales);
	const availablePaymentSales = useMemo(
		() => getAvailablePaymentSales(data.pendingSales, listedSalesIds),
		[data.pendingSales, listedSalesIds],
	);
	useEffect(() => {
		if (canNotifyCustomer || !notifyCustomer) return;
		form.setValue("notifyCustomer", false);
	}, [canNotifyCustomer, form, notifyCustomer]);
	const getSelectedSalesIds = useCallback(
		(formData: z.infer<typeof formSchema>) =>
			formData.sales.filter((sale) => sale.selected).map((sale) => sale.id),
		[],
	);
	const getSelectedOrderNos = useCallback(
		(formData: z.infer<typeof formSchema>) =>
			data?.pendingSales
				?.filter(
					(sale) =>
						formData.sales.find((field) => field.id === sale.id)?.selected,
				)
				.map((sale) => sale.orderId),
		[data?.pendingSales],
	);
	const getPrintableRequests = useCallback(
		(formData: z.infer<typeof formSchema>) =>
			buildPrintRequests({
				salesIds: getSelectedSalesIds(formData),
				shouldPrintInvoice: formData.print,
				shouldPrintPackingSlip: formData.printPackingSlip,
			}),
		[getSelectedSalesIds],
	);
	const resetTerminalFlow = useCallback(
		({
			clearSession,
		}: {
			clearSession: boolean;
		}) => {
			setWaitSeconds(null);
			setMockStatus(null);
			setTerminalError(null);
			setTerminalState("form");
			hasSubmittedCompletedTerminalRef.current = false;
			pendingAppliedPaymentCheckRef.current = null;
			lastSubmittedAmountRef.current = null;
			lastSubmittedPaymentMethodRef.current = null;
			form.setValue("paymentStatus", null);
			if (clearSession) {
				form.setValue("terminalPaymentSession", null);
			}
		},
		[form],
	);
	const closeCompletedPayment = useCallback(
		(isTerminalPayment: boolean) => {
			if (paymentCloseTimerRef.current) {
				clearTimeout(paymentCloseTimerRef.current);
			}
			paymentCloseTimerRef.current = setTimeout(
				() => {
					setOpened(false);
					resetTerminalFlow({ clearSession: true });
					postPaymentPrint.clear();
				},
				isTerminalPayment ? 3000 : 1800,
			);
		},
		[postPaymentPrint.clear, resetTerminalFlow, setOpened],
	);
	useEffect(
		() => () => {
			if (paymentCloseTimerRef.current) {
				clearTimeout(paymentCloseTimerRef.current);
			}
		},
		[],
	);
	const showTerminalFailure = useCallback(
		(message?: string | null, options?: { clearSession?: boolean }) => {
			postPaymentPrint.clear();
			setWaitSeconds(null);
			setTerminalError(
				message ||
					"There was an issue processing your payment. Please try again.",
			);
			setTerminalState("failed");
			form.setValue("paymentStatus", "failed");
			if (options?.clearSession) {
				form.setValue("terminalPaymentSession", null);
			}
		},
		[form, postPaymentPrint.clear],
	);
	useEffect(() => {
		if (!paymentStatus) return;
		switch (paymentStatus) {
			case "cancelled":
				postPaymentPrint.clear();
				form.setValue("paymentStatus", null);
				break;
			case "processing":
				break;
			case "completed": {
				const isTerminalPayment =
					lastSubmittedPaymentMethodRef.current === "terminal";
				form.setValue("paymentStatus", null);
				pendingAppliedPaymentCheckRef.current = null;
				setTerminalError(null);

				if (!postPaymentPrint.hasPending()) {
					setTerminalState("success");
					closeCompletedPayment(isTerminalPayment);
					break;
				}

				setTerminalState("printing");
				void postPaymentPrint.complete().then((outcome) => {
					if (outcome.status === "failed") {
						setTerminalError(
							"The payment was recorded, but the document could not be prepared.",
						);
						setTerminalState("print_failed");
						return;
					}

					setTerminalState("success");
					closeCompletedPayment(isTerminalPayment);
				});
				break;
			}
			case "failed":
				postPaymentPrint.clear();
				setTerminalError(
					(current) =>
						current ||
						"There was an issue processing your payment. Please try again.",
				);
				setTerminalState("failed");
				break;
		}
	}, [
		closeCompletedPayment,
		form,
		paymentStatus,
		postPaymentPrint.clear,
		postPaymentPrint.complete,
		postPaymentPrint.hasPending,
	]);
	const retryPostPaymentPrint = useCallback(async () => {
		setTerminalError(null);
		setTerminalState("printing");
		const outcome = await postPaymentPrint.retry();
		if (outcome.status === "failed") {
			setTerminalError(
				"The payment was recorded, but the document still could not be prepared.",
			);
			setTerminalState("print_failed");
			return;
		}

		setTerminalState("success");
		closeCompletedPayment(
			lastSubmittedPaymentMethodRef.current === "terminal",
		);
	}, [closeCompletedPayment, postPaymentPrint.retry]);
	useEffect(() => {
		form.setValue(
			"amount",
			getListedPaymentAmount(data.pendingSales, listedSalesIds),
		);
	}, [data.pendingSales, form, listedSalesIds]);
	useEffect(() => {
		if (terminalState !== "applying") return;
		const pendingCheck = pendingAppliedPaymentCheckRef.current;
		if (!pendingCheck?.salesIds.length) return;

		const stillPendingSelectedSale = data.pendingSales.some(
			(sale) =>
				pendingCheck.salesIds.includes(sale.id) &&
				Number(sale.amountDue || 0) > 0,
		);

		if (!stillPendingSelectedSale) {
			form.setValue("paymentStatus", "completed");
			return;
		}

		const elapsed = Date.now() - pendingCheck.startedAt;
		if (elapsed > 12000) {
			postPaymentPrint.clear();
			setTerminalError(
				"Payment is taking longer than expected. Check the invoice balance and try again if it did not apply.",
			);
			setTerminalState("failed");
			pendingAppliedPaymentCheckRef.current = null;
			form.setValue("paymentStatus", null);
			return;
		}

		const timer = setTimeout(() => {
			void refetch();
		}, 2000);

		return () => clearTimeout(timer);
	}, [
		data.pendingSales,
		form,
		postPaymentPrint.clear,
		refetch,
		terminalState,
	]);
	const makePayment = useMutation(
		trpc.salesPaymentProcessor.applyPayment.mutationOptions({
			onSuccess: (data) => {
				if (data?.terminalPaymentSession) {
					form.setValue("terminalPaymentSession", data.terminalPaymentSession);
					setTerminalError(null);
					setTerminalState("awaiting");
					setTimeout(() => {
						setWaitSeconds(0);
					}, 2000);
				} else {
					if (data?.customerReceiptQueueStatus === "failed") {
						toast({
							title: "Payment recorded",
							description: "Receipt email could not be queued",
							duration: 7000,
							variant: "destructive",
						});
					}
					form.setValue("paymentStatus", "completed");
					void props.onPaymentApplied?.();
				}
			},
			onError(error) {
				const serverError =
					error.message ||
					"There was an issue processing your payment. Please try again.";
				if (form.getValues("paymentMethod") === "terminal") {
					showTerminalFailure(serverError, {
						clearSession: terminalState === "creating",
					});
					return;
				}
				postPaymentPrint.clear();
				setTerminalError(serverError);
				setTerminalState("failed");
				form.setValue("paymentStatus", "failed");
				setTimeout(() => {
					form.setValue("paymentStatus", null);
				}, 3000);
			},
		}),
	);
	const cancelTerminalPayment = useMutation(
		trpc.salesPaymentProcessor.cancelTerminalPayment.mutationOptions({
			onSuccess: (result) => {
				if (result.status === "CANCELED") {
					finalizeTerminalCancellation();
					return;
				}
				toast({
					title: "Cancellation requested",
					description:
						"Waiting for Square to confirm that the terminal payment was canceled.",
				});
			},
			onError(e) {
				//toast.error("Unable to cancel payment");
				toast({
					title: "Cancellation Failed",
					description: "Unable to cancel payment. Please try again.",
					duration: 5000,
					variant: "destructive",
				});
			},
		}),
	);
	const sendPaymentLinkMutation = useMutation(
		trpc.salesPaymentProcessor.sendPaymentLink.mutationOptions({
			onSuccess: () => {
				toast({
					title: "Payment email sent.",
				});
			},
			onError: () => {
				toast({
					title: "Unable to send payment email.",
					variant: "destructive",
				});
			},
		}),
	);
	const getAmount = (formData: z.infer<typeof formSchema>) => {
		const customAmount = Number(formData?._amount);
		if (
			formData?.editPrice &&
			(Number.isNaN(customAmount) || customAmount <= 0)
		) {
			toast({
				title: "Invalid amount",
				variant: "destructive",
			});
			return;
		}
		const externalAmount = Number(paymentChargePreview.externalAmount || 0);
		if (
			externalAmount <= 0 &&
			(!formData.useWallet || paymentChargePreview.walletApplied <= 0)
		) {
			toast({
				title: "Invalid amount",
				description: "Enter an amount greater than zero.",
				variant: "destructive",
			});
			return;
		}
		return externalAmount;
	};
	const initPayment = async (formData: z.infer<typeof formSchema>) => {
		setMockStatus(null);
		setTerminalError(null);
		const amount = getAmount(formData);
		if (amount == null) return;
		const selectedSalesIds = getSelectedSalesIds(formData);
		const selectedOrderNos = getSelectedOrderNos(formData);
		postPaymentPrint.clear();
		postPaymentPrint.capture(getPrintableRequests(formData));
		const walletOnly =
			!!formData.useWallet &&
			paymentChargePreview.walletApplied > 0 &&
			amount <= 0;
		const paymentMethod = walletOnly ? "wallet" : formData.paymentMethod;
		const isTerminalPayment = paymentMethod === "terminal";
		lastSubmittedAmountRef.current = amount;
		lastSubmittedPaymentMethodRef.current = paymentMethod;
		form.setValue("paymentStatus", "processing");
		if (isTerminalPayment) {
			const hasCompletedTerminalSession =
				!!formData.terminalPaymentSession?.squarePaymentId;
			setTerminalState(hasCompletedTerminalSession ? "recording" : "creating");
			hasSubmittedCompletedTerminalRef.current = hasCompletedTerminalSession;
		} else {
			setTerminalState("applying");
			pendingAppliedPaymentCheckRef.current = {
				salesIds: selectedSalesIds,
				startedAt: Date.now(),
			};
		}
		makePayment.mutate({
			...sanitizePaymentMethodFields(formData, paymentMethod),
			notifyCustomer: canNotifyCustomer && formData.notifyCustomer === true,
			amount,
			paymentDate: canSetPaymentDate ? formData.paymentDate : null,
			paymentMethod,
			salesIds: selectedSalesIds,
			orderNos: selectedOrderNos,
		});
	};
	const sendPaymentLink = (formData: z.infer<typeof formSchema>) => {
		// const emails = formData?.
		const amount = getAmount(formData);
		if (!amount) return;
		startTransition(async () => {
			if (formData.useWallet || paymentChargePreview.walletCreditAmount > 0) {
				toast({
					title: "Use direct payment",
					description:
						"Wallet application and overpayment credit are only available for direct payments right now.",
					variant: "destructive",
				});
				return;
			}
			const sales = data?.pendingSales?.filter(
				(s) => formData.sales.find((b) => b.id === s.id)?.selected,
			);

			if (sales.length > 1) {
				toast({
					title: "Feature not available",
					description:
						"Payment link can only be sent for single sale at the moment.",
					variant: "destructive",
				});
				return;
			}
			const cData = sales?.find((s) => !!s.customerName && !!s?.customerEmail);
			if (!cData?.customerEmail) {
				toast({
					title: "No customer email",
					description: "Selected sales do not have a valid customer email.",
					variant: "destructive",
				});
				return;
			}
			await sendPaymentLinkMutation.mutateAsync({
				customer: {
					name: cData?.customerName,
					email: cData?.customerEmail,
				},
				walletId: data.wallet?.id,
				amount,
				type: "order",
				mode: "order",
				ids: sales.map((a) => a.id),
			});
		});
	};
	useEffect(() => {
		if (terminalState !== "awaiting") return;
		if (!terminalPaymentSession?.squareCheckoutId) return;
		async function checkTerminalPaymentStatus() {
			try {
				const rep = mockStatus
					? { status: mockStatus }
					: await fetchFreshTerminalPaymentStatus(
							queryClient,
							trpc.salesPaymentProcessor.getTerminalPaymentStatus.queryOptions({
								checkoutId: terminalPaymentSession.squareCheckoutId,
							}),
						);
				switch (rep.status) {
					case "COMPLETED": {
						if (hasSubmittedCompletedTerminalRef.current) return null;
						hasSubmittedCompletedTerminalRef.current = true;
						setWaitSeconds(null);
						setTerminalState("recording");
						form.setValue("terminalPaymentSession.status", "COMPLETED");
						const completedFormData = form.getValues();
						const completedSaleReferences = getCompletedTerminalSaleReferences(
							completedFormData.sales,
							data.pendingSales,
						);
						const completedPaymentMethod =
							lastSubmittedPaymentMethodRef.current ||
							form.getValues("paymentMethod");
						makePayment.mutate({
							...sanitizePaymentMethodFields(
								completedFormData,
								completedPaymentMethod,
							),
							...completedSaleReferences,
							notifyCustomer:
								canNotifyCustomer && completedFormData.notifyCustomer === true,
							paymentDate: canSetPaymentDate
								? completedFormData.paymentDate
								: null,
							amount:
								lastSubmittedAmountRef.current ??
								Number(form.getValues("amount") || 0),
							paymentMethod: completedPaymentMethod,
						});
						return null;
					}
					case "CANCELED":
						// cancelTerminalPayment.mutate({
						//     checkoutId: terminalPaymentSession.squareCheckoutId,
						//     squarePaymentId: terminalPaymentSession.squarePaymentId,
						// });
						finalizeTerminalCancellation();
						return null;
					case "CANCEL_REQUESTED":
						break;
				}
			} catch (error) {
				showTerminalFailure(
					(error as Error)?.message ||
						"Unable to check terminal payment status.",
				);
				return null;
			}
			// return generateRandomString();
			setTimeout(() => {
				setWaitSeconds((current) => (current == null ? null : current + 2));
			}, 2000);
		}
		if (waitSeconds != null) {
			checkTerminalPaymentStatus();
		}
	}, [
		canSetPaymentDate,
		canNotifyCustomer,
		data.pendingSales,
		form,
		makePayment.mutate,
		mockStatus,
		queryClient,
		showTerminalFailure,
		terminalPaymentSession,
		terminalState,
		trpc.salesPaymentProcessor.getTerminalPaymentStatus,
		waitSeconds,
	]);
	function finalizeTerminalCancellation() {
		postPaymentPrint.clear();
		setWaitSeconds(null);
		setMockStatus(null);
		setTerminalError(null);
		setTerminalState("form");
		hasSubmittedCompletedTerminalRef.current = false;
		lastSubmittedAmountRef.current = null;
		lastSubmittedPaymentMethodRef.current = null;
		form.setValue("terminalPaymentSession", null);
		form.setValue("paymentStatus", "cancelled");
		toast({
			title: "Payment canceled",
			description:
				"The terminal payment was canceled and no payment was applied.",
		});
	}
	function __cancel() {
		if (cancelTerminalPayment.isPending) return;
		cancelTerminalPayment.mutate({
			checkoutId: terminalPaymentSession?.squareCheckoutId,
			squarePaymentId: terminalPaymentSession?.squarePaymentId,
		});
	}
	const percentageList = [25, 50, 75, 100];
	const setPercentageAmount = (percentage: number) => {
		const totalAmount = Number(form.getValues("amount") || 0);
		const nextAmount = Math.round(totalAmount * (percentage / 100) * 100) / 100;
		form.setValue("editPrice", true);
		form.setValue("_amount", String(nextAmount), {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const [sendingLink, startTransition] = useTransition();

	const selectedSalesCount = salesFields.length;
	const selectedTerminal = resolveAvailablePaymentTerminal(
		data?.terminals,
		deviceId,
	);
	const availableTerminals =
		data?.terminals?.filter(isAvailablePaymentTerminal) || [];
	const isTerminalFlowActive = terminalState !== "form";
	const hasActiveTerminalCheckout =
		!!terminalPaymentSession && terminalPaymentSession.status !== "COMPLETED";
	const selectedBalanceAmount = Number(amount || 0);
	const walletBalanceAmount = Number(data?.walletBalance || 0);
	const cccPercentage = resolveCccPercentageFromSales(
		data?.pendingSales?.filter(
			(sale) => wSales?.find((field) => field.id === sale.id)?.selected,
		) || [],
	);
	const walletAppliedPreview =
		useWallet && walletBalanceAmount > 0
			? Math.min(walletBalanceAmount, selectedBalanceAmount)
			: 0;
	const defaultExternalAmount = Math.max(
		selectedBalanceAmount - walletAppliedPreview,
		0,
	);
	const selectedAmount = editPrice
		? form.getValues("_amount")
		: defaultExternalAmount;
	const paymentChargePreview = calculatePaymentPlanPreview({
		paymentMethod: pm,
		selectedBalance: selectedBalanceAmount,
		externalAmount: selectedAmount,
		walletBalance: walletBalanceAmount,
		useWallet,
		cccPercentage,
	});
	const payFullWithWallet =
		!!useWallet &&
		selectedBalanceAmount > 0 &&
		paymentChargePreview.walletApplied >= selectedBalanceAmount &&
		paymentChargePreview.externalAmount <= 0;
	const paymentMethodOptions = payFullWithWallet
		? [...availableSalesPaymentMethods, walletPaymentMethodOption]
		: availableSalesPaymentMethods;
	const effectivePaymentMethod = payFullWithWallet
		? walletPaymentMethodOption.value
		: pm;
	const selectedPaymentMethodLabel =
		effectivePaymentMethod === "terminal" && selectedTerminal?.label
			? selectedTerminal.label
			: paymentMethodOptions.find(
					(method) => method.value === effectivePaymentMethod,
				)?.label || "Payment";
	const paymentMethodFeedback = getPaymentMethodControlFeedback({
		availableTerminalCount: availableTerminals.length,
		checkError: form.formState.errors.checkNo?.message,
		method: effectivePaymentMethod || "credit-card",
		terminalError:
			terminalDeviceFieldState.error?.message || terminalLoadError,
		terminalInvalid: terminalDeviceFieldState.invalid,
		terminalPaymentsEnabled,
	});
	const sendLink = effectivePaymentMethod === "link" && !linkProcessed;
	const paymentDateDisabled = effectivePaymentMethod === "terminal" || sendLink;
	const paymentDateUnavailable = !canSetPaymentDate || paymentDateDisabled;
	const paymentDateDisabledTitle =
		effectivePaymentMethod === "terminal"
			? "Square sets the payment date when the terminal payment completes"
			: "The payment date will be recorded when the payment link is paid";
	const paymentLayoutTransition = useMemo(
		() => ({
			duration: prefersReducedMotion ? 0 : 0.22,
			ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
		}),
		[prefersReducedMotion],
	);
	const submitLabel = sendLink
		? "Send link"
		: isSheet
			? "Apply payment"
			: "Apply";
	const paymentDisplayAmount =
		paymentChargePreview.chargeAmount || paymentChargePreview.walletApplied;
	useEffect(() => {
		if (!paymentDateUnavailable || !paymentDate) return;
		form.setValue("paymentDate", null, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}, [form, paymentDate, paymentDateUnavailable]);
	useEffect(() => {
		if (pm && pm !== "wallet") {
			lastExternalPaymentMethodRef.current = pm as ExternalPaymentMethod;
		}
	}, [pm]);
	useEffect(() => {
		if (payFullWithWallet) {
			if (pm !== "wallet") {
				form.setValue("paymentMethod", "wallet", {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
			if (terminalPaymentSession) {
				form.setValue("terminalPaymentSession", null);
			}
			if (terminalState !== "form") {
				setTerminalError(null);
				setTerminalState("form");
				hasSubmittedCompletedTerminalRef.current = false;
			}
			return;
		}

		if (pm === "wallet") {
			form.setValue("paymentMethod", lastExternalPaymentMethodRef.current, {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	}, [form, payFullWithWallet, pm, terminalPaymentSession, terminalState]);
	const backToPaymentForm = () => {
		resetTerminalFlow({
			clearSession: terminalPaymentSession?.status !== "COMPLETED",
		});
	};
	const closePaymentOverlay = () => {
		setOpened(false);
		resetTerminalFlow({ clearSession: true });
		postPaymentPrint.clear();
	};
	const handlePaymentMethodChange = (method: PaymentMethod) => {
		form.setValue("paymentMethod", method, {
			shouldDirty: true,
			shouldValidate: true,
		});
		if (method !== "terminal") {
			form.clearErrors("deviceId");
			form.setValue("deviceId", null);
			form.setValue("deviceName", null);
			form.setValue("terminalPaymentSession", null);
			setTerminalError(null);
			setTerminalState("form");
			hasSubmittedCompletedTerminalRef.current = false;
		}
	};
	const handleTerminalChange = (terminal: PaymentTerminalOption) => {
		if (!isAvailablePaymentTerminal(terminal)) return;
		form.setValue("paymentMethod", "terminal", {
			shouldDirty: true,
			shouldValidate: true,
		});
		form.setValue("deviceId", terminal.value, {
			shouldDirty: true,
			shouldValidate: true,
		});
		form.setValue("deviceName", terminal.label || null, {
			shouldDirty: true,
		});
		form.setValue("terminalPaymentSession", null);
		form.clearErrors("deviceId");
		setTerminalError(null);
		setTerminalState("form");
		hasSubmittedCompletedTerminalRef.current = false;
	};
	const handleInvalidPaymentForm = (
		errors: FieldErrors<z.infer<typeof formSchema>>,
	) => {
		const message =
			errors.deviceId?.message ||
			errors.paymentDate?.message ||
			errors.amount?.message ||
			errors.checkNo?.message ||
			errors.root?.message ||
			"Review the payment details and try again.";

		toast({
			title: "Payment details required",
			description: message,
			variant: "destructive",
		});
	};
	const paymentActions = (
		<div
			className={cn(
				"flex w-full min-w-0 gap-3",
				isSheet
					? "flex-col sm:flex-row sm:items-center"
					: "sticky bottom-0 z-20 -mx-6 w-[calc(100%+3rem)] flex-col items-stretch border-t bg-background/95 px-6 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center",
			)}
		>
			{hasActiveTerminalCheckout ? (
				<>
					<Spinner />
					<Label className="text-sm text-muted-foreground">
						Waiting for payment...
					</Label>
					<div className="flex-1" />
					<Env isDev>
						<div className="flex gap-2">
							<Button
								type="button"
								onClick={() => setMockStatus("CANCELED")}
								size="icon"
								variant="destructive"
							>
								<Icons.X className="size-4" />
							</Button>
							<Button
								type="button"
								size="icon"
								onClick={() => setMockStatus("COMPLETED")}
							>
								<Icons.check className="size-4" />
							</Button>
						</div>
					</Env>
					<Button
						type="button"
						onClick={__cancel}
						size="icon"
						variant="destructive"
					>
						<Icons.X className="size-4" />
					</Button>
				</>
			) : (
				<>
					<motion.div
						layout
						transition={paymentLayoutTransition}
						className={cn(
							"grid min-w-0 flex-1 gap-2",
							canSetPaymentDate
								? "grid-cols-[auto_minmax(0,1fr)]"
								: "grid-cols-1",
						)}
					>
						{canSetPaymentDate ? (
							<PaymentDateControl
								value={paymentDate}
								disabled={paymentDateDisabled}
								disabledTitle={paymentDateDisabledTitle}
								transition={paymentLayoutTransition}
								onChange={(value) =>
									form.setValue("paymentDate", value, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
						) : null}
						<SalesPaymentMethodControl
							method={effectivePaymentMethod || "credit-card"}
							methods={paymentMethodOptions}
							terminals={data.terminals || []}
							deviceId={deviceId}
							checkNumber={checkNo}
							disabled={payFullWithWallet}
							invalid={paymentMethodFeedback.invalid}
							error={paymentMethodFeedback.error}
							transition={paymentLayoutTransition}
							onMethodChange={handlePaymentMethodChange}
							onTerminalChange={handleTerminalChange}
							onCheckNumberChange={(value) =>
								form.setValue("checkNo", value, {
									shouldDirty: true,
									shouldValidate: true,
								})
							}
							onCheckNumberBlur={() => void form.trigger("checkNo")}
						/>
					</motion.div>
					{sendLink ? (
						<Button
							type="submit"
							form={formId}
							disabled={sendingLink || selectedSalesCount === 0}
							className="w-full min-w-32 sm:w-auto"
						>
							{sendingLink ? (
								<Spinner />
							) : (
								<>
									<Icons.Email className="size-4" />
									{submitLabel}
								</>
							)}
						</Button>
					) : (
						<Button
							type="submit"
							form={formId}
							aria-label="Apply payment"
							disabled={
								selectedSalesCount === 0 ||
								(effectivePaymentMethod === "terminal" && !selectedTerminal) ||
								makePayment.isPending ||
								hasActiveTerminalCheckout
							}
							className={cn(
								"w-full sm:w-auto",
								isSheet ? "min-w-36" : "min-w-24",
							)}
						>
							{makePayment.isPending || hasActiveTerminalCheckout ? (
								<Spinner />
							) : (
								<>
									{submitLabel}
									<Icons.arrowRight className="size-4" />
								</>
							)}
						</Button>
					)}
				</>
			)}
		</div>
	);
	return (
		<Form {...form}>
			<form
				id={formId}
				className={cn(
					"flex w-full min-w-0 flex-col",
					isSheet ? "min-h-0" : "max-h-[90vh]",
				)}
				onSubmit={form.handleSubmit((formData) => {
					const paymentFormData = formSchema.parse(formData);
					if (sendLink) {
						sendPaymentLink(paymentFormData);
					} else {
						initPayment(paymentFormData);
					}
				}, handleInvalidPaymentForm)}
			>
				<div className="flex min-h-0 flex-col">
					<div
						className={cn(
							"shrink-0 border-b bg-muted/30",
							isSheet ? "py-4" : "px-6 py-5",
						)}
					>
						{isSheet ? (
							<div className="flex items-start gap-3">
								<div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
									<Icons.payment className="size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold">
										{listedSales[0]?.customerName || "Payment"}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Account {data?.wallet?.accountNo || accountNo}
									</p>
								</div>
								<div className="text-right">
									<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
										Total due
									</p>
									<p className="mt-1 text-lg font-semibold tabular-nums">
										{formatPaymentAmount(amount)}
									</p>
								</div>
							</div>
						) : (
							<Dialog.Header className="space-y-3">
								<div className="flex items-start gap-3 pr-8">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
										<Icons.payment className="size-5" />
									</div>
									<div className="min-w-0 flex-1">
										<Dialog.Title className="truncate text-base">
											{listedSales[0]?.customerName || "Payment"}
										</Dialog.Title>
										<Dialog.Description className="mt-1">
											Account {data?.wallet?.accountNo || accountNo}
										</Dialog.Description>
									</div>
									<div className="text-right">
										<p className="text-xs font-medium uppercase text-muted-foreground">
											Total due
										</p>
										<p className="mt-1 text-xl font-semibold tabular-nums">
											{formatPaymentAmount(amount)}
										</p>
									</div>
								</div>
							</Dialog.Header>
						)}
					</div>

					<div
						className={cn(
							"relative min-h-0 flex-1",
							isSheet ? "overflow-visible" : "overflow-y-auto",
						)}
					>
						<div
							className={cn(
								"grid gap-5 pb-0",
								isSheet ? "pt-5" : "p-6",
								isTerminalFlowActive && "invisible pointer-events-none",
							)}
						>
							<section className="grid gap-2">
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-sm font-medium">Orders</h3>
									<ComboboxDropdown
										items={availablePaymentSales.map((sale) => ({
											id: String(sale.id),
											label: `${sale.orderId} — ${formatPaymentAmount(sale.amountDue)}`,
											sale,
										}))}
										onSelect={(item) =>
											appendSalesField({
												id: item.sale.id,
												selected: true,
											})
										}
										searchPlaceholder="Search customer orders"
										emptyResults="No more pending orders"
										disabled={!availablePaymentSales.length}
										triggerClassName="w-auto shrink-0"
										popoverProps={{ align: "end" }}
										Trigger={
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={!availablePaymentSales.length}
											>
												<Icons.Plus className="size-4" />
												Add order
											</Button>
										}
									/>
								</div>
								<ScrollArea className="max-h-[220px] rounded-md border">
									<Item.Group className="divide-y">
										{salesFields.map((field, index) => {
											const sale = pendingSalesById.get(field.id);
											if (!sale) return null;

											return (
												<Item
													key={field.fieldId}
													size="sm"
													className="rounded-none border-0 bg-emerald-50/80 px-3 py-2.5 text-emerald-950"
												>
													<Item.Media
														variant="icon"
														className="size-7 rounded-md border-emerald-200 bg-emerald-100 text-emerald-700"
													>
														<Icons.check className="size-4" />
													</Item.Media>
													<Item.Content className="min-w-0">
														<Item.Title className="truncate">
															{sale?.orderId}
														</Item.Title>
														<Item.Description className="flex flex-wrap items-center gap-x-2 text-xs">
															<span>{formatDate(sale?.createdAt)}</span>
															<span>
																{formatPaymentAmount(sale?.amountDue)}
															</span>
														</Item.Description>
													</Item.Content>
													<Item.Actions>
														<Button
															type="button"
															size="icon"
															variant="ghost"
															className="size-8 text-muted-foreground hover:text-destructive"
															aria-label={`Remove order ${sale.orderId}`}
															onClick={() => removeSalesField(index)}
														>
															<Icons.X className="size-4" />
														</Button>
													</Item.Actions>
												</Item>
											);
										})}
									</Item.Group>
								</ScrollArea>
								<p className="text-xs text-muted-foreground">
									{selectedSalesCount} order
									{selectedSalesCount === 1 ? "" : "s"} in this payment.
								</p>
							</section>

							<section className="grid gap-2">
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-sm font-medium">Wallet</h3>
									<span className="text-xs text-muted-foreground">
										Available {formatPaymentAmount(walletBalanceAmount)}
									</span>
								</div>
								<Field
									orientation="horizontal"
									className="min-h-10 py-2"
								>
									<Checkbox
										checked={!!useWallet}
										disabled={walletBalanceAmount <= 0}
										onCheckedChange={(checked) =>
											form.setValue("useWallet", !!checked, {
												shouldDirty: true,
												shouldValidate: true,
											})
										}
										id="use-wallet"
									/>
									<InlinePaymentOptionCopy
										htmlFor="use-wallet"
										title="Use wallet balance"
										description={`Apply up to ${formatPaymentAmount(
											Math.min(walletBalanceAmount, selectedBalanceAmount),
										)}.`}
									/>
								</Field>
							</section>

							<section className="grid gap-3">
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-sm font-medium">Amount</h3>
									{!editPrice && (
										<Button
											type="button"
											onClick={() => {
												form.setValue("editPrice", true);
											}}
											size="sm"
											variant="ghost"
										>
											<Icons.edit className="size-4" />
											Edit
										</Button>
									)}
								</div>
								{editPrice ? (
									<div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
										<Menu Icon={Icons.Calculator}>
											{percentageList.map((p) => (
												<Menu.Item
													onClick={() => setPercentageAmount(p)}
													key={p}
												>
													{p} %
												</Menu.Item>
											))}
										</Menu>
										<InputGroup>
											<InputGroup.Input
												{...form.register("_amount")}
												placeholder="External amount"
											/>
											<InputGroup.Addon align="inline-end">
												<InputGroup.Text>
													after wallet{" "}
													{formatPaymentAmount(defaultExternalAmount)}
												</InputGroup.Text>
											</InputGroup.Addon>
										</InputGroup>
										<Button
											type="button"
											onClick={() => {
												form.setValue("editPrice", null);
												form.setValue("_amount", null);
											}}
											size="icon"
											variant="ghost"
										>
											<Icons.X className="size-4" />
										</Button>
									</div>
								) : (
									<div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
										<span className="text-muted-foreground">
											External amount
										</span>
										<span className="float-right font-medium tabular-nums">
											{formatPaymentAmount(defaultExternalAmount)}
										</span>
									</div>
								)}
							</section>

							<section className="grid gap-2">
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-sm font-medium">Payment breakdown</h3>
									<span className="text-xs text-muted-foreground">
										{selectedPaymentMethodLabel}
									</span>
								</div>
								<div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
									<div className="flex items-center justify-between gap-3">
										<span className="text-muted-foreground">
											Selected balance
										</span>
										<span className="font-medium tabular-nums">
											{formatPaymentAmount(
												paymentChargePreview.selectedBalance,
											)}
										</span>
									</div>
									{paymentChargePreview.walletApplied > 0 ? (
										<div className="mt-1 flex items-center justify-between gap-3">
											<span className="text-muted-foreground">
												Wallet applied
											</span>
											<span className="font-medium tabular-nums text-emerald-700">
												-
												{formatPaymentAmount(
													paymentChargePreview.walletApplied,
												)}
											</span>
										</div>
									) : null}
									<div className="mt-1 flex items-center justify-between gap-3">
										<span className="text-muted-foreground">
											External payment
										</span>
										<span className="font-medium tabular-nums">
											{formatPaymentAmount(paymentChargePreview.baseAmount)}
										</span>
									</div>
									{paymentChargePreview.applies ? (
										<div className="mt-1 flex items-center justify-between gap-3">
											<span className="text-muted-foreground">
												C.C.C {paymentChargePreview.percentage}%
											</span>
											<span className="font-medium tabular-nums">
												{formatPaymentAmount(paymentChargePreview.feeAmount)}
											</span>
										</div>
									) : null}
									{paymentChargePreview.walletCreditAmount > 0 ? (
										<div className="mt-1 flex items-center justify-between gap-3">
											<span className="text-muted-foreground">
												Wallet credit after payment
											</span>
											<span className="font-medium tabular-nums text-emerald-700">
												{formatPaymentAmount(
													paymentChargePreview.walletCreditAmount,
												)}
											</span>
										</div>
									) : null}
									<div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 font-semibold">
										<span>Amount to charge</span>
										<span className="tabular-nums">
											{formatPaymentAmount(paymentChargePreview.chargeAmount)}
										</span>
									</div>
								</div>
							</section>

							{paymentChargePreview.walletCreditAmount > 0 ? (
								<section className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
									<div className="flex items-start gap-2">
										<Icons.Wallet className="mt-0.5 size-4 shrink-0 text-emerald-700" />
										<div className="grid gap-1">
											<p className="font-medium">
												Extra payment will be saved to the customer wallet.
											</p>
											<p className="text-xs text-emerald-800">
												{formatPaymentAmount(
													paymentChargePreview.walletCreditAmount,
												)}{" "}
												will be available for future orders.
											</p>
										</div>
									</div>
								</section>
							) : null}

							<section className="grid gap-3">
								<h3 className="text-sm font-medium">Options</h3>
								<div className="divide-y">
									<TooltipProvider delayDuration={100}>
										<Tooltip>
											<TooltipTrigger asChild>
												<Field
													orientation="horizontal"
													aria-disabled={!canNotifyCustomer}
													tabIndex={canNotifyCustomer ? undefined : 0}
													className={cn(
														"min-h-10 py-2",
														!canNotifyCustomer &&
															"cursor-not-allowed opacity-60",
													)}
												>
													<Checkbox
														checked={!!notifyCustomer}
														disabled={!canNotifyCustomer}
														onCheckedChange={(checked) =>
															form.setValue("notifyCustomer", !!checked)
														}
														id="notify-customer"
													/>
													<InlinePaymentOptionCopy
														htmlFor="notify-customer"
														title="Notify customer"
														description="Email a receipt after payment."
													/>
												</Field>
											</TooltipTrigger>
											{!canNotifyCustomer ? (
												<TooltipContent>Customer have no email</TooltipContent>
											) : null}
										</Tooltip>
									</TooltipProvider>

									<Field
										orientation="horizontal"
										className="min-h-10 py-2"
									>
										<Checkbox
											checked={!!print}
											onCheckedChange={(checked) =>
												form.setValue("print", !!checked)
											}
											id="print-copy"
										/>
										<InlinePaymentOptionCopy
											htmlFor="print-copy"
											title="Print invoice"
											description="Print after payment succeeds."
										/>
									</Field>

									<Field
										orientation="horizontal"
										className="min-h-10 py-2"
									>
										<Checkbox
											checked={!!printPackingSlip}
											onCheckedChange={(checked) =>
												form.setValue("printPackingSlip", !!checked)
											}
											id="print-packing-slip"
										/>
										<InlinePaymentOptionCopy
											htmlFor="print-packing-slip"
											title="Print packing slip"
											description="Print after payment is applied."
										/>
									</Field>

									{effectivePaymentMethod === "link" ? (
										<Field
											orientation="horizontal"
											className="min-h-10 py-2"
										>
											<Checkbox
												checked={!!linkProcessed}
												onCheckedChange={(checked) =>
													form.setValue("linkProcessed", !!checked)
												}
												id="paid"
											/>
											<InlinePaymentOptionCopy
												htmlFor="paid"
												title="Payment already received"
												description="Skip sending a payment link."
											/>
										</Field>
									) : null}
								</div>
							</section>

							{isSheet
								? props.footerTarget
									? createPortal(paymentActions, props.footerTarget)
									: null
								: paymentActions}
						</div>
						{isTerminalFlowActive ? (
							<div className="absolute inset-0 bg-background">
								<PaymentStatusOverlay
									state={terminalState}
									amount={paymentDisplayAmount}
									methodLabel={selectedPaymentMethodLabel}
									terminalName={
										effectivePaymentMethod === "terminal"
											? selectedTerminal?.label
											: undefined
									}
									printMode={postPaymentPrint.activePrintMode}
									elapsedSeconds={waitSeconds}
									error={terminalError}
									onCancel={__cancel}
									onBack={backToPaymentForm}
									onRetryPrint={() => void retryPostPaymentPrint()}
									onClose={closePaymentOverlay}
									onMockCancel={() => setMockStatus("CANCELED")}
									onMockComplete={() => setMockStatus("COMPLETED")}
								/>
							</div>
						) : null}
					</div>
				</div>
			</form>
		</Form>
	);
}
