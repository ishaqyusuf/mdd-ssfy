import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { terminalPaymentStatus } from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { generateToken } from "@/actions/token-action";
import { Env } from "@/components/env";
import { _qc, _trpc } from "@/components/static-trpc";
import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	buildSalesPrintViewerUrl,
	openSalesPrintDocument,
	resolveSalesPrintAccess,
} from "@/modules/sales-print/application/sales-print-service";
import { salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import type { PrintMode } from "@gnd/sales/print/types";
import { sendSalesEmail } from "@gnd/sales/utils/email";
import type { TerminalCheckoutStatus } from "@gnd/square";
import { Button, type ButtonProps } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Menu } from "@gnd/ui/custom/menu";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Dialog, Field, InputGroup, Item, Select } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { Spinner } from "@gnd/ui/spinner";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { sum } from "@gnd/utils";
import NumberFlow from "@number-flow/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import React, {
	Suspense,
	useEffect,
	useRef,
	useState,
	useTransition,
} from "react";
import { useFieldArray } from "react-hook-form";
import z from "zod";
interface Props {
	selectedIds: number[];
	phoneNo: string;
	customerId?: number;
	children?;
	buttonProps?: ButtonProps;
	disabled?: boolean;
}

export function SalesPaymentProcessor(props: Props) {
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

function PaymentProcessorSkeleton() {
	return (
		<div className="grid gap-0">
			<div className="border-b bg-muted/30 px-6 py-5">
				<div className="flex items-start gap-3 pr-8">
					<Skeleton className="size-10 shrink-0 rounded-md border bg-background" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-40 rounded" />
						<Skeleton className="h-3 w-28 rounded" />
					</div>
					<div className="space-y-2 text-right">
						<Skeleton className="ml-auto h-3 w-14 rounded" />
						<Skeleton className="h-6 w-24 rounded" />
					</div>
				</div>
			</div>

			<div className="grid gap-5 p-6">
				<section className="grid gap-2">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-14 rounded" />
						<Skeleton className="h-3 w-16 rounded" />
					</div>
					<div className="overflow-hidden rounded-md border">
						{[0, 1, 2].map((row) => (
							<div
								key={row}
								className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
							>
								<Skeleton className="size-7 rounded-md" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-24 rounded" />
									<Skeleton className="h-3 w-36 rounded" />
								</div>
							</div>
						))}
					</div>
				</section>

				<section className="grid gap-3">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-16 rounded" />
						<Skeleton className="h-8 w-16 rounded-md" />
					</div>
					<div className="rounded-md border bg-muted/20 px-3 py-2">
						<div className="flex items-center justify-between gap-3">
							<Skeleton className="h-4 w-28 rounded" />
							<Skeleton className="h-4 w-20 rounded" />
						</div>
					</div>
				</section>

				<section className="grid gap-3">
					<Skeleton className="h-4 w-16 rounded" />
					<div className="grid gap-2 sm:grid-cols-2">
						{[0, 1, 2].map((option) => (
							<div
								key={option}
								className={cn(
									"flex gap-3 rounded-md border p-3",
									option === 2 && "sm:col-span-2",
								)}
							>
								<Skeleton className="size-4 shrink-0 rounded-sm" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-28 rounded" />
									<Skeleton className="h-3 w-full max-w-56 rounded" />
								</div>
							</div>
						))}
					</div>
				</section>

				<Separator />

				<div className="flex items-center gap-3">
					<Skeleton className="h-9 flex-1 rounded-md" />
					<Skeleton className="h-9 w-36 rounded-md" />
				</div>
			</div>
		</div>
	);
}

const formSchema = createPaymentSchema
	.merge(
		z.object({
			linkProcessed: z.boolean().optional().nullable(),
			print: z.boolean().optional().nullable(),
			printPackingSlip: z.boolean().optional().nullable(),
			paymentStatus: z
				.enum(["processing", "completed", "failed", "idle", "cancelled"])
				.optional()
				.nullable(),
			editPrice: z.boolean().default(false),
			sales: z.array(
				z.object({
					id: z.number(),
					selected: z.boolean(),
				}),
			),
		}),
	)
	.superRefine((data, ctx) => {
		if (data?.sales?.filter((s) => s.selected).length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Select at least one sale to proceed",
			});
		}
	});
const formatPaymentAmount = (value?: number | string | null) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));

function normalizePaymentMethod(value?: string | null) {
	if (!value) return null;
	const normalized = value
		.toLowerCase()
		.replaceAll("_", "-")
		.replaceAll(" ", "-");

	return (
		salesPaymentMethods.find((method) => method.value === normalized)?.value ||
		null
	);
}

function resolveDefaultPaymentMethod(
	sales: { id: number; paymentMethod?: string | null }[],
	selectedIds: number[],
) {
	const selectedPaymentMethod = sales.find((sale) =>
		selectedIds.includes(sale.id),
	)?.paymentMethod;
	const firstPaymentMethod = sales.find(
		(sale) => sale.paymentMethod,
	)?.paymentMethod;

	return (
		normalizePaymentMethod(selectedPaymentMethod) ||
		normalizePaymentMethod(firstPaymentMethod) ||
		"terminal"
	);
}

type PendingPrintRequest = {
	mode: PrintMode;
	salesIds: number[];
	windowRef: Window | null;
};

function buildPrintRequests(input: {
	salesIds: number[];
	shouldPrintInvoice?: boolean | null;
	shouldPrintPackingSlip?: boolean | null;
}): PendingPrintRequest[] {
	const requests: PendingPrintRequest[] = [];

	if (input.shouldPrintInvoice) {
		requests.push({
			mode: "invoice",
			salesIds: input.salesIds,
			windowRef: null,
		});
	}

	if (input.shouldPrintPackingSlip) {
		requests.push({
			mode: "packing-slip",
			salesIds: input.salesIds,
			windowRef: null,
		});
	}

	return requests;
}

function reservePrintWindows(formData: z.infer<typeof formSchema>) {
	if (typeof window === "undefined") return [];

	return buildPrintRequests({
		salesIds: formData.sales
			.filter((sale) => sale.selected)
			.map((sale) => sale.id),
		shouldPrintInvoice: formData.print,
		shouldPrintPackingSlip: formData.printPackingSlip,
	}).map((request) => {
		const printWindow = window.open("", "_blank");

		if (printWindow) {
			printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Preparing print...</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8fafc;
        color: #0f172a;
        font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
      }
      .card {
        width: min(360px, calc(100vw - 32px));
        padding: 20px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
      }
      strong { display: block; margin-bottom: 4px; }
      p { margin: 0; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>Preparing print...</strong>
      <p>The document will open after payment is confirmed.</p>
    </div>
  </body>
</html>`);
		}

		return {
			...request,
			windowRef: printWindow,
		};
	});
}

async function resolvePendingPrintRequests(requests: PendingPrintRequest[]) {
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

				await openSalesPrintDocument({
					salesIds: request.salesIds,
					mode: request.mode,
				});
			} catch (error) {
				if (request.windowRef && !request.windowRef.closed) {
					request.windowRef.close();
				}
				throw error;
			}
		}),
	);
}

function closePendingPrintRequests(requests: PendingPrintRequest[]) {
	for (const request of requests) {
		if (request.windowRef && !request.windowRef.closed) {
			request.windowRef.close();
		}
	}
}

function Content(props: Props & { setOpened }) {
	const { selectedIds, setOpened } = props;
	const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
	const { data, refetch } = useSuspenseQuery(
		_trpc.customers.getCustomerPayPortal.queryOptions({
			accountNo,
		}),
	);
	const form = useZodForm(formSchema, {
		defaultValues: {},
	});
	const pendingPrintRequestsRef = useRef<PendingPrintRequest[]>([]);
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
	}, [accountNo, data, form, refetch, selectedIds]);
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
	useEffect(() => {
		// console.log({ paymentStatus });
		if (!paymentStatus) return;
		switch (paymentStatus) {
			case "cancelled":
				toast({
					title: "Payment Cancelled",
					description: "The payment has been cancelled.",
					duration: 3000,
					variant: "destructive",
				});
				form.setValue("paymentStatus", null);
				break;
			case "processing":
				if (terminalPaymentSession)
					toast({
						title: "Terminal Payment",
						description: "Please complete the payment on your terminal device.",
						duration: 3000,
						variant: "spinner",
					});
				else
					toast({
						title: "Payment Processing",
						description: "Your payment is being processed. Please wait...",
						duration: 3000,
						variant: "spinner",
					});
				break;
			case "completed": {
				toast({
					title: "Payment Successful",
					description: "The payment has been completed successfully.",
					duration: 3000,
					variant: "success",
				});
				_qc.invalidateQueries({
					queryKey: _trpc.sales.getOrders.infiniteQueryKey({}),
				});
				const {
					print: shouldPrintInvoice,
					printPackingSlip: shouldPrintPackingSlip,
					sales,
				} = form.getValues();
				const salesIds =
					sales?.filter((a) => a.selected).map((s) => s.id) ?? [];
				setOpened(false);
				void resolvePendingPrintRequests(
					pendingPrintRequestsRef.current.length
						? pendingPrintRequestsRef.current
						: buildPrintRequests({
								salesIds,
								shouldPrintInvoice,
								shouldPrintPackingSlip,
							}),
				).catch(() => {
					toast({
						title: "Unable to open print view",
						description: "The payment was recorded, but the print view failed.",
						variant: "destructive",
					});
				});
				pendingPrintRequestsRef.current = [];

				break;
			}
			case "failed":
				toast({
					title: "Payment Failed",
					description:
						"There was an issue processing your payment. Please try again.",
					duration: 3000,
					variant: "destructive",
				});
				break;
		}
	}, [form, paymentStatus, setOpened, terminalPaymentSession]);
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
	const makePayment = useAction(createSalesPaymentAction, {
		onSuccess: (args) => {
			if (args.data?.terminalPaymentSession) {
				form.setValue(
					"terminalPaymentSession",
					args.data.terminalPaymentSession,
				);
				setTimeout(() => {
					setWaitSeconds(0);
				}, 2000);
			} else {
				if (args.data.status) {
					form.setValue("paymentStatus", "completed");
				}
			}
		},
		onError(error) {
			closePendingPrintRequests(pendingPrintRequestsRef.current);
			pendingPrintRequestsRef.current = [];
			form.setValue("paymentStatus", "failed");
			toast({
				title: "Payment Failed",
				description: error.error?.serverError,
				duration: 5000,
				variant: "destructive",
			});
			setTimeout(() => {
				form.setValue("paymentStatus", null);
			}, 3000);
		},
	});
	const [waitSeconds, setWaitSeconds] = useState(null);
	const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
		onSuccess: (args) => {
			setWaitSeconds(null);
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
	});

	const trigger = useTaskTrigger({
		executingToast: "Sending payment email...",
		successToast: "Payment email sent.",
		errorToast: "Unable to send payment email.",
		onStarted() {
			// setOpened(false);
			// form.reset(defaultValues);
		},
	});
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
		form.setValue("paymentStatus", "processing");
		setMockStatus(null);
		const amount = getAmount(formData);
		if (!amount) return;
		pendingPrintRequestsRef.current = reservePrintWindows(formData);
		makePayment.execute({
			...formData,
			amount,
			salesIds: formData.sales.filter((s) => s.selected).map((s) => s.id),
			orderNos: data?.pendingSales
				?.filter((s) => formData.sales.find((b) => b.id === s.id)?.selected)
				.map((s) => s.orderId),
		});
	};
	const auth = useAuth();
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
			await sendSalesEmail({
				auth,
				tokenGeneratorFn: generateToken,
				trigger,
				data: [
					{
						customer: {
							name: cData?.customerName,
							email: cData?.customerEmail,
						},
						walletId: data.wallet?.id,
						amount,
						type: "order",
						mode: "order",
						ids: sales.map((a) => a.id),
					},
				],
			});
		});
	};
	const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);
	useEffect(() => {
		if (!terminalPaymentSession) return;
		async function checkTerminalPaymentStatus() {
			const rep = mockStatus
				? { status: mockStatus }
				: await terminalPaymentStatus(terminalPaymentSession?.squareCheckoutId);
			console.log({ rep });
			switch (rep.status) {
				case "COMPLETED":
					form.setValue("terminalPaymentSession.status", "COMPLETED");
					makePayment.execute({
						...form.getValues(),
					});
					return null;
				case "CANCELED":
				case "CANCEL_REQUESTED":
					// cancelTerminalPayment.execute({
					//     checkoutId: terminalPaymentSession.squareCheckoutId,
					//     squarePaymentId: terminalPaymentSession.squarePaymentId,
					// });
					__cancel();
					return null;
			}
			// return generateRandomString();
			setTimeout(() => {
				setWaitSeconds(waitSeconds + 1);
			}, 2000);
		}
		if (waitSeconds != null) {
			checkTerminalPaymentStatus();
		}
	}, [
		form,
		makePayment.execute,
		mockStatus,
		terminalPaymentSession,
		waitSeconds,
	]);
	function __cancel() {
		closePendingPrintRequests(pendingPrintRequestsRef.current);
		pendingPrintRequestsRef.current = [];
		const tps = {
			...(terminalPaymentSession || {}),
		};
		form.setValue("terminalPaymentSession", null);
		form.setValue("paymentStatus", "cancelled");
		setTimeout(() => {
			cancelTerminalPayment.execute({
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

					<div className="grid gap-5 p-6">
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
														<span>{formatPaymentAmount(sale?.amountDue)}</span>
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
											<Menu.Item onClick={() => setPercentageAmount(p)} key={p}>
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
							{terminalPaymentSession ? (
								<>
									<Spinner />
									<Label className="text-sm text-muted-foreground">
										Waiting for payment... <NumberFlow value={1} />
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
													{...form.register("paymentMethod")}
													value={pm || "terminal"}
													defaultValue={pm || "terminal"}
													onValueChange={(e) => {
														form.setValue(
															"paymentMethod",
															e as z.infer<typeof formSchema>["paymentMethod"],
														);
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
												makePayment.isExecuting || !!terminalPaymentSession
											}
											className="min-w-36"
										>
											{makePayment.isExecuting || !!terminalPaymentSession ? (
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
				</div>
			</form>
		</Form>
	);
}
