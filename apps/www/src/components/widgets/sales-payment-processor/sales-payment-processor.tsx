import { Env } from "@/components/env";
import { _qc, _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	buildSalesPrintViewerUrl,
	resolveSalesPrintAccess,
} from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import { salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import type { TerminalCheckoutStatus } from "@gnd/square";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Menu } from "@gnd/ui/custom/menu";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Dialog, Field, InputGroup, Item, Select } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { sum } from "@gnd/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import React, {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { useFieldArray } from "react-hook-form";
import type z from "zod";
import { PaymentProcessorSkeleton } from "./payment-processor-skeleton";
import { PaymentStatusOverlay } from "./payment-status-overlay";
import { paymentProcessorFormSchema as formSchema } from "./schema";
import type {
	PaymentOverlayState,
	PendingAppliedPaymentCheck,
	PendingPrintRequest,
	SalesPaymentProcessorProps,
} from "./types";
import {
	buildPrintRequests,
	formatPaymentAmount,
	resolveDefaultPaymentMethod,
} from "./utils";

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
			<Dialog.Content className="w-[min(94vw,560px)] gap-0 overflow-hidden p-0">
				<Suspense fallback={<PaymentProcessorSkeleton />}>
					<Content setOpened={setOpened} {...props} />
				</Suspense>
			</Dialog.Content>
		</Dialog.Root>
	);
}

async function resolvePendingPrintRequests(requests: PendingPrintRequest[]) {
	const blockedUrls: string[] = [];

	await Promise.all(
		requests.map(async (request) => {
			if (!request.salesIds.length) {
				request.windowRef?.close();
				return;
			}

			try {
				const access = await resolveSalesPrintAccess({
					salesIds: request.salesIds,
					mode: request.mode,
				});
				const href = buildSalesPrintViewerUrl(access, {
					preview: false,
					mode: request.mode,
				});

				if (request.windowRef && !request.windowRef.closed) {
					request.windowRef.location.replace(href);
					return;
				}

				const printWindow =
					typeof window === "undefined"
						? null
						: window.open(href, "_blank", "noopener,noreferrer");

				if (!printWindow) {
					blockedUrls.push(href);
				}
			} catch (error) {
				if (request.windowRef && !request.windowRef.closed) {
					request.windowRef.close();
				}
				throw error;
			}
		}),
	);

	return blockedUrls;
}

function closePendingPrintRequests(requests: PendingPrintRequest[]) {
	for (const request of requests) {
		if (request.windowRef && !request.windowRef.closed) {
			request.windowRef.close();
		}
	}
}

function Content(props: SalesPaymentProcessorProps & { setOpened }) {
	const { selectedIds, setOpened } = props;
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
	const { data, refetch } = useSuspenseQuery(
		trpc.customers.getCustomerPayPortal.queryOptions({
			accountNo,
		}),
	);
	const form = useZodForm(formSchema, {
		defaultValues: {},
	});
	const pendingPrintRequestsRef = useRef<PendingPrintRequest[]>([]);
	const pendingAppliedPaymentCheckRef =
		useRef<PendingAppliedPaymentCheck | null>(null);
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

		if (data.error.terminal) {
			toast({
				title: "Unable to load PoS",
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
			selectedIdsKey,
			pendingSalesResetKey,
		].join("|");

		if (lastFormResetKeyRef.current === formResetKey) return;
		lastFormResetKeyRef.current = formResetKey;

		const paymentMethod = resolveDefaultPaymentMethod(
			data.pendingSales,
			selectedIds,
		);

		form.reset({
			deviceId: data?.lastTerminalId,
			terminalPaymentSession: null,
			notifyCustomer: false,
			print: true,
			printPackingSlip: false,
			sales: data.pendingSales.map((s) => ({
				id: s.id,
				selected: selectedIds.includes(s.id),
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
	]);
	const { fields: salesFields, update: updateSalesField } = useFieldArray({
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
	} = form.watch();
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
			form.setValue("paymentStatus", null);
			if (clearSession) {
				form.setValue("terminalPaymentSession", null);
			}
		},
		[form],
	);
	const showTerminalFailure = useCallback(
		(message?: string | null, options?: { clearSession?: boolean }) => {
			closePendingPrintRequests(pendingPrintRequestsRef.current);
			pendingPrintRequestsRef.current = [];
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
		[form],
	);
	useEffect(() => {
		// console.log({ paymentStatus });
		if (!paymentStatus) return;
		switch (paymentStatus) {
			case "cancelled":
				form.setValue("paymentStatus", null);
				break;
			case "processing":
				break;
			case "completed": {
				const isTerminalPayment =
					pm === "terminal" || terminalState === "success";
				_qc.invalidateQueries({
					queryKey: _trpc.sales.getOrders.infiniteQueryKey({}),
				});
				const formData = form.getValues();
				void resolvePendingPrintRequests(
					pendingPrintRequestsRef.current.length
						? pendingPrintRequestsRef.current
						: getPrintableRequests(formData),
				)
					.then((blockedUrls) => {
						if (!blockedUrls.length) return;

						toast({
							title: "Print popup blocked",
							description:
								"The payment was recorded. Click to open the print view.",
							variant: "destructive",
							footer: (
								<ToastAction
									altText="Open print"
									onClick={() => {
										for (const href of blockedUrls) {
											window.open(href, "_blank", "noopener,noreferrer");
										}
									}}
								>
									Open print
								</ToastAction>
							),
						});
					})
					.catch(() => {
						toast({
							title: "Unable to open print view",
							description:
								"The payment was recorded, but the print view failed.",
							variant: "destructive",
						});
					});
				pendingPrintRequestsRef.current = [];
				setTerminalError(null);
				setTerminalState("success");
				pendingAppliedPaymentCheckRef.current = null;
				const closeTimer = setTimeout(
					() => {
						setOpened(false);
						resetTerminalFlow({ clearSession: true });
					},
					isTerminalPayment ? 3000 : 1800,
				);
				if (isTerminalPayment) {
					return () => clearTimeout(closeTimer);
				}
				return () => clearTimeout(closeTimer);
			}
			case "failed":
				setTerminalError(
					(current) =>
						current ||
						"There was an issue processing your payment. Please try again.",
				);
				setTerminalState("failed");
				break;
		}
	}, [
		form,
		getPrintableRequests,
		paymentStatus,
		pm,
		resetTerminalFlow,
		setOpened,
		terminalState,
	]);
	useEffect(() => {
		if (!salesFields?.length) return;
		form.setValue(
			"amount",
			sum(
				// wSales.filter(a => a.selected),
				data?.pendingSales?.filter(
					(a) => wSales?.find((b) => b.id === a.id)?.selected,
				),
				"amountDue",
			),
		);
	}, [data, form, salesFields, wSales]);
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
	}, [data.pendingSales, form, refetch, terminalState]);
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
					form.setValue("paymentStatus", "completed");
					if (terminalState === "recording") {
						setTerminalState("success");
						setTerminalError(null);
					}
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
				closePendingPrintRequests(pendingPrintRequestsRef.current);
				pendingPrintRequestsRef.current = [];
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
			onSuccess: () => {
				setWaitSeconds(null);
				setTerminalState("form");
				setTerminalError(null);
				hasSubmittedCompletedTerminalRef.current = false;
				form.setValue("paymentStatus", "cancelled");
				// form.setValue("terminalPaymentSession", null);
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
		if (formData?.editPrice && customAmount > Number(formData.amount || 0)) {
			toast({
				title: "Amount too high",
				description: "Custom amount cannot exceed the selected balance.",
				variant: "destructive",
			});
			return;
		}
		return formData?.editPrice ? customAmount : formData?.amount;
	};
	const initPayment = async (formData: z.infer<typeof formSchema>) => {
		setMockStatus(null);
		setTerminalError(null);
		const amount = getAmount(formData);
		if (!amount) return;
		const selectedSalesIds = getSelectedSalesIds(formData);
		const selectedOrderNos = getSelectedOrderNos(formData);
		const isTerminalPayment = formData.paymentMethod === "terminal";
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
		pendingPrintRequestsRef.current = [];
		makePayment.mutate({
			...formData,
			amount,
			salesIds: selectedSalesIds,
			orderNos: selectedOrderNos,
		});
	};
	const sendPaymentLink = (formData: z.infer<typeof formSchema>) => {
		// const emails = formData?.
		const amount = getAmount(formData);
		if (!amount) return;
		startTransition(async () => {
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
					: await queryClient.fetchQuery(
							trpc.salesPaymentProcessor.getTerminalPaymentStatus.queryOptions({
								checkoutId: terminalPaymentSession.squareCheckoutId,
							}),
						);
				console.log({ rep });
				switch (rep.status) {
					case "COMPLETED":
						if (hasSubmittedCompletedTerminalRef.current) return null;
						hasSubmittedCompletedTerminalRef.current = true;
						setWaitSeconds(null);
						setTerminalState("recording");
						form.setValue("terminalPaymentSession.status", "COMPLETED");
						makePayment.mutate({
							...form.getValues(),
						});
						return null;
					case "CANCELED":
					case "CANCEL_REQUESTED":
						// cancelTerminalPayment.mutate({
						//     checkoutId: terminalPaymentSession.squareCheckoutId,
						//     squarePaymentId: terminalPaymentSession.squarePaymentId,
						// });
						__cancel();
						return null;
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
	function __cancel() {
		closePendingPrintRequests(pendingPrintRequestsRef.current);
		pendingPrintRequestsRef.current = [];
		const tps = {
			...(terminalPaymentSession || {}),
		};
		setWaitSeconds(null);
		setMockStatus(null);
		setTerminalError(null);
		setTerminalState("form");
		hasSubmittedCompletedTerminalRef.current = false;
		form.setValue("terminalPaymentSession", null);
		form.setValue("paymentStatus", "cancelled");
		setTimeout(() => {
			cancelTerminalPayment.mutate({
				checkoutId: tps?.squareCheckoutId,
				squarePaymentId: tps?.squarePaymentId,
			});
		}, 100);
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

	const sendLink = pm === "link" && !linkProcessed;
	const selectedSalesCount =
		wSales?.filter((sale) => sale.selected).length ?? 0;
	const submitLabel = sendLink ? "Send link" : "Apply payment";
	const selectedTerminal = data?.terminals?.find(
		(terminal) => terminal?.value === deviceId,
	);
	const selectedAmount = editPrice ? form.getValues("_amount") : amount;
	const isTerminalFlowActive = terminalState !== "form";
	const hasActiveTerminalCheckout =
		!!terminalPaymentSession && terminalPaymentSession.status !== "COMPLETED";
	const selectedPaymentMethodLabel =
		salesPaymentMethods.find((method) => method.value === pm)?.label ||
		"Payment";
	const backToPaymentForm = () => {
		resetTerminalFlow({
			clearSession: terminalPaymentSession?.status !== "COMPLETED",
		});
	};
	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(
					(formData: z.infer<typeof formSchema>) => {
						if (sendLink) {
							sendPaymentLink(formData);
						} else {
							initPayment(formData);
						}
					},
					(e) => {
						console.log("Form Errors: ", e);
					},
				)}
			>
				<div className="grid gap-0">
					<div className="border-b bg-muted/30 px-6 py-5">
						<Dialog.Header className="space-y-3">
							<div className="flex items-start gap-3 pr-8">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
									<Icons.payment className="size-5" />
								</div>
								<div className="min-w-0 flex-1">
									<Dialog.Title className="truncate text-base">
										{data?.pendingSales?.[0]?.customerName || "Payment"}
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
					</div>

					<div className="relative">
						<div
							className={cn(
								"grid gap-5 p-6",
								isTerminalFlowActive && "invisible pointer-events-none",
							)}
						>
							<section className="grid gap-2">
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-sm font-medium">Orders</h3>
									<span className="text-xs text-muted-foreground">
										{selectedSalesCount} selected
									</span>
								</div>
								<ScrollArea className="max-h-[220px] rounded-md border">
									<Item.Group className="divide-y">
										{data?.pendingSales?.map((sale, index) => {
											const selected = !!salesFields?.[index]?.selected;

											return (
												<Item
													key={sale?.id}
													size="sm"
													onClick={() => {
														updateSalesField(index, {
															...salesFields?.[index],
															selected: !selected,
														});
													}}
													className={cn(
														"cursor-pointer rounded-none border-0 px-3 py-2.5",
														selected && "bg-emerald-50/80 text-emerald-950",
													)}
												>
													<Item.Media
														variant="icon"
														className={cn(
															"size-7 rounded-md",
															selected
																? "border-emerald-200 bg-emerald-100 text-emerald-700"
																: "bg-background text-muted-foreground",
														)}
													>
														{selected ? (
															<Icons.check className="size-4" />
														) : (
															<Icons.invoice className="size-4" />
														)}
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
												</Item>
											);
										})}
									</Item.Group>
								</ScrollArea>
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
												placeholder="Custom amount"
											/>
											<InputGroup.Addon align="inline-end">
												<InputGroup.Text>
													of {formatPaymentAmount(amount)}
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
											Selected balance
										</span>
										<span className="float-right font-medium tabular-nums">
											{formatPaymentAmount(amount)}
										</span>
									</div>
								)}
							</section>

							<section className="grid gap-3">
								<h3 className="text-sm font-medium">Options</h3>
								<div className="grid gap-2 sm:grid-cols-2">
									<Field
										orientation="horizontal"
										className="rounded-md border p-3"
									>
										<Checkbox
											checked={!!notifyCustomer}
											onCheckedChange={(checked) =>
												form.setValue("notifyCustomer", !!checked)
											}
											id="notify-customer"
										/>
										<Field.Content>
											<Field.Label
												htmlFor="notify-customer"
												className="font-normal"
											>
												Notify customer
											</Field.Label>
											<Field.Description className="text-xs font-normal">
												Send a receipt email after payment.
											</Field.Description>
										</Field.Content>
									</Field>

									<Field
										orientation="horizontal"
										className="rounded-md border p-3"
									>
										<Checkbox
											checked={!!print}
											onCheckedChange={(checked) =>
												form.setValue("print", !!checked)
											}
											id="print-copy"
										/>
										<Field.Content>
											<Field.Label htmlFor="print-copy" className="font-normal">
												Print invoice
											</Field.Label>
											<Field.Description className="text-xs font-normal">
												Open the invoice print view.
											</Field.Description>
										</Field.Content>
									</Field>

									<Field
										orientation="horizontal"
										className="rounded-md border p-3 sm:col-span-2"
									>
										<Checkbox
											checked={!!printPackingSlip}
											onCheckedChange={(checked) =>
												form.setValue("printPackingSlip", !!checked)
											}
											id="print-packing-slip"
										/>
										<Field.Content>
											<Field.Label
												htmlFor="print-packing-slip"
												className="font-normal"
											>
												Print packing slip
											</Field.Label>
											<Field.Description className="text-xs font-normal">
												Open a packing slip after payment is applied.
											</Field.Description>
										</Field.Content>
									</Field>
								</div>

								{pm !== "link" || (
									<Field
										orientation="horizontal"
										className="rounded-md border border-amber-200 bg-amber-50/50 p-3"
									>
										<Checkbox
											checked={!!linkProcessed}
											onCheckedChange={(checked) =>
												form.setValue("linkProcessed", !!checked)
											}
											id="paid"
										/>
										<Field.Content>
											<Field.Label htmlFor="paid" className="font-normal">
												Payment already received
											</Field.Label>
											<Field.Description className="text-xs font-normal">
												Mark this as paid without sending a payment link.
											</Field.Description>
										</Field.Content>
									</Field>
								)}
							</section>

							<Separator />

							<div className="flex items-center gap-3">
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
													onClick={(e) => setMockStatus("CANCELED")}
													size="icon"
													variant="destructive"
												>
													<Icons.X className="size-4" />
												</Button>
												<Button
													type="button"
													size="icon"
													onClick={(e) => setMockStatus("COMPLETED")}
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
										<div className="grid flex-1 gap-2 sm:grid-cols-2">
											<Field>
												<Field.Content>
													<Select.Root
														value={pm || undefined}
														onValueChange={(e) => {
															form.setValue(
																"paymentMethod",
																e as z.infer<
																	typeof formSchema
																>["paymentMethod"],
																{
																	shouldDirty: true,
																	shouldValidate: true,
																},
															);
															if (e !== "terminal") {
																form.setValue("terminalPaymentSession", null);
																setTerminalError(null);
																setTerminalState("form");
																hasSubmittedCompletedTerminalRef.current = false;
															}
														}}
													>
														<Select.Trigger>
															<Select.Value placeholder="Payment Method" />
														</Select.Trigger>
														<Select.Content>
															{salesPaymentMethods.map((s) => (
																<Select.Item key={s.value} value={s.value}>
																	{s.label}
																</Select.Item>
															))}
														</Select.Content>
													</Select.Root>
												</Field.Content>
											</Field>
											{pm === "check" ? (
												<InputGroup>
													<InputGroup.Addon align="inline-start">
														<InputGroup.Text>Check No:</InputGroup.Text>
													</InputGroup.Addon>
													<InputGroup.Input
														className="!pl-1"
														{...form.register("checkNo")}
														placeholder="eg., 12345"
													/>
												</InputGroup>
											) : pm === "terminal" ? (
												<Field>
													<Field.Content>
														<Select.Root
															{...form.register("deviceId")}
															value={deviceId || undefined}
															onValueChange={(e) => {
																form.setValue("deviceId", e);
															}}
														>
															<Select.Trigger>
																<Select.Value placeholder="Select Terminal" />
															</Select.Trigger>
															<Select.Content>
																{data?.terminals?.map((terminal) => (
																	<Select.Item
																		disabled={
																			terminal?.status !== "PAIRED" &&
																			terminal?.status !== "AVAILABLE"
																		}
																		key={terminal?.value || terminal?.label}
																		value={terminal?.value}
																	>
																		{terminal.label}
																	</Select.Item>
																))}
															</Select.Content>
														</Select.Root>
													</Field.Content>
												</Field>
											) : undefined}
										</div>
										{sendLink ? (
											<Button disabled={sendingLink} className="min-w-32">
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
												disabled={
													makePayment.isPending || hasActiveTerminalCheckout
												}
												className="min-w-36"
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
						</div>
						{isTerminalFlowActive ? (
							<div className="absolute inset-0 bg-background">
								<PaymentStatusOverlay
									state={terminalState}
									amount={selectedAmount}
									methodLabel={selectedPaymentMethodLabel}
									terminalName={
										pm === "terminal" ? selectedTerminal?.label : undefined
									}
									elapsedSeconds={waitSeconds}
									error={terminalError}
									onCancel={__cancel}
									onBack={backToPaymentForm}
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
