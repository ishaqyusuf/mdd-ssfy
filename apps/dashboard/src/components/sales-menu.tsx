import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { generateToken } from "@/actions/token-action";
import Link from "@/components/link";
import { CustomerEmailRequiredDialog } from "@/components/modals/customer-email-required-dialog";
import { SalesDocumentEmailDialog } from "@/components/sales-document-email-dialog";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { getSalesOrderStatusMenuActions } from "@/components/sales-status-menu-actions";
import { SalesWorkflowCancellationDialog } from "@/components/sales-workflow-cancellation-dialog";
import { reviewSelectedPayments } from "@/components/tables-2/sales-orders/review-selected-payments";
import { useAuth } from "@/hooks/use-auth";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { openLink } from "@/lib/open-link";
import type { SalesQueryRef } from "@/lib/query-events/types";
import { createSalesEmailContinuation } from "@/lib/sales-email-continuation";
import { resolveSalesPrintMode } from "@/modules/sales-print/application/sales-print-service";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTestEmailMode } from "@/store/test-email-mode";
import { useTRPC } from "@/trpc/client";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import type { SalesOrderLifecycleStatus } from "@gnd/sales/order-status";
import type {
	SalesInventoryMarkAsAction,
	SalesInventoryMarkAsPreflightResult,
} from "@gnd/sales/sales-inventory-mark-as-preflight";
import type { SalesStatusMarkAsPreflightResult } from "@gnd/sales/sales-status-mark-as-resolution";
import type { SalesWorkflowCancellationAction } from "@gnd/sales/sales-workflow-cancellation";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog, DropdownMenu } from "@gnd/ui/namespace";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import type { QuoteAcceptanceTokenSchema } from "@gnd/utils/tokenizer";
import type { UpdateSalesControl } from "@sales/schema";
import { useMutation } from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
	type ComponentProps,
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

type SalesType = "order" | "quote";

type SalesMenuState = {
	id?: number;
	slug?: string;
	type?: SalesType;
	salesRefs: SalesQueryRef[];
	salesIds: number[];
	orderNo?: string | null;
	customerId?: number | null;
	customerEmail?: string | null;
	customerPhone?: string | null;
	customerName?: string | null;
	documentTitle?: string | null;
};

type EmailOptions = {
	withPayment?: boolean;
	partPayment?: boolean;
};

type SalesMenuEmailController = {
	didSucceed: boolean;
	isPending: boolean;
	sendEmail: (options?: EmailOptions) => void;
	emailRequirementOpen: boolean;
	dismissEmailRequirement: () => void;
	continueWithCustomerEmail: (email: string) => void;
};

type SalesMenuActions = {
	closeMenu: () => void;
	openComposeEmail: () => void;
	openWorkflowCancellation: (action: SalesWorkflowCancellationAction) => void;
	copyAs: (as: SalesType) => Promise<void>;
	move: () => Promise<void>;
};

type SalesMenuContextValue = {
	state: SalesMenuState;
	actions: SalesMenuActions;
	email: SalesMenuEmailController;
	meta: {
		isOpen: boolean;
	};
};

const SalesMenuContext = createContext<SalesMenuContextValue | null>(null);

function useSalesMenuContext() {
	const ctx = useContext(SalesMenuContext);
	if (!ctx) {
		throw new Error("SalesMenu components must be used within <SalesMenu>");
	}
	return ctx;
}

type SalesMenuProps = {
	id?: number;
	slug?: string;
	type?: SalesType;
	salesIds?: number[];
	salesRefs?: readonly SalesQueryRef[];
	orderNo?: string | null;
	customerId?: number | null;
	customerEmail?: string | null;
	customerPhone?: string | null;
	customerName?: string | null;
	documentTitle?: string | null;
	children: ReactNode;
	trigger?: ReactNode;
	triggerVariant?: ComponentProps<typeof Button>["variant"];
	triggerSize?: ComponentProps<typeof Button>["size"];
	contentClassName?: string;
	align?: "start" | "center" | "end";
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

function SalesMenuRoot({
	id,
	slug,
	type,
	salesIds,
	salesRefs,
	orderNo,
	customerId,
	customerEmail,
	customerPhone,
	customerName,
	documentTitle,
	children,
	trigger,
	triggerVariant = "outline",
	triggerSize = "sm",
	contentClassName,
	align = "end",
	open,
	onOpenChange,
}: SalesMenuProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [composeOpen, setComposeOpen] = useState(false);
	const [workflowCancellationAction, setWorkflowCancellationAction] =
		useState<SalesWorkflowCancellationAction | null>(null);
	const isControlled = typeof open === "boolean";
	const isOpen = isControlled ? (open as boolean) : internalOpen;
	const setOpen = onOpenChange || setInternalOpen;

	const sq = useSalesQueryClient();
	const loader = useLoadingToast();
	const trpc = useTRPC();
	const copySaleMutation = useMutation(trpc.sales.copySale.mutationOptions());
	const moveSaleMutation = useMutation(trpc.sales.moveSale.mutationOptions());
	const refreshCreatedOrder = useCallback(
		async (salesId: number, orderNo: string) => {
			const results = await Promise.allSettled([
				resetSalesStatAction(salesId, orderNo),
				sq.events.productionUpdated({
					orderNo,
					salesId,
					salesType: "order",
				}),
			]);
			for (const result of results) {
				if (result.status === "rejected") {
					console.error(
						"Unable to refresh a created sales order",
						result.reason,
					);
				}
			}
		},
		[sq],
	);

	const state = useMemo<SalesMenuState>(() => {
		const resolvedType = type ?? "order";
		const resolvedIds = salesIds?.length ? salesIds : id ? [id] : [];
		const resolvedRefs = salesRefs?.length
			? [...salesRefs]
			: orderNo
				? [
						{
							orderNo,
							...(id ? { salesId: id } : {}),
							salesType: resolvedType,
						},
					]
				: [];

		return {
			id,
			slug,
			type: resolvedType,
			salesRefs: resolvedRefs,
			salesIds: resolvedIds,
			orderNo,
			customerId,
			customerEmail,
			customerPhone,
			customerName,
			documentTitle,
		};
	}, [
		customerEmail,
		customerId,
		customerPhone,
		customerName,
		documentTitle,
		id,
		orderNo,
		salesRefs,
		salesIds,
		slug,
		type,
	]);

	const actions = useMemo<SalesMenuActions>(
		() => ({
			closeMenu() {
				setOpen(false);
			},
			openComposeEmail() {
				setOpen(false);
				setComposeOpen(true);
			},
			openWorkflowCancellation(action) {
				setOpen(false);
				setWorkflowCancellationAction(action);
			},
			async copyAs(as) {
				if (!state.slug || !state.type) return;
				loader.loading("Copying...");
				try {
					const result = await copySaleMutation.mutateAsync({
						salesUid: state.slug,
						as,
						type: state.type,
					});

					const createdOrderRefresh =
						as === "order" && result.id && result.slug
							? refreshCreatedOrder(result.id, result.slug)
							: null;

					if (result.slug) {
						loader.success(`Copied as ${as}`, {
							duration: 3000,
							action: (
								<ToastAction
									onClick={() => {
										openLink(
											salesFormUrl(as, result.slug, result.isDyke),
											{},
											true,
										);
									}}
									altText="edit"
								>
									Edit
								</ToastAction>
							),
						});
					}
					setOpen(false);
					await createdOrderRefresh;
				} catch {
					loader.error("Unable to complete");
				}
			},
			async move() {
				if (!state.slug || !state.type) return;

				const isQuote = state.type === "quote";
				const to: SalesType = isQuote ? "order" : "quote";
				try {
					loader.loading(isQuote ? "Creating invoice..." : "Moving...");
					const result = isQuote
						? await copySaleMutation.mutateAsync({
								salesUid: state.slug,
								as: "order",
								type: state.type,
							})
						: await moveSaleMutation.mutateAsync({
								salesUid: state.slug,
								to,
								type: state.type,
							});

					const createdOrderRefresh =
						to === "order" && result.id && result.slug
							? refreshCreatedOrder(result.id, result.slug)
							: null;

					if (result.slug) {
						loader.success(isQuote ? "Invoice created" : `Moved to ${to}`, {
							duration: 3000,
							action: (
								<ToastAction altText="Open" asChild>
									<Link href={salesFormUrl(to, result.slug, result.isDyke)}>
										Open
									</Link>
								</ToastAction>
							),
						});
					}
					setOpen(false);
					await createdOrderRefresh;
				} catch {
					loader.error("Unable to complete");
				}
			},
		}),
		[
			copySaleMutation,
			loader,
			moveSaleMutation,
			refreshCreatedOrder,
			setOpen,
			state.slug,
			state.type,
		],
	);
	const email = useSendSalesEmailAction({
		state,
		closeMenu: actions.closeMenu,
	});
	const composeSalesOrderId = state.id ?? state.salesIds[0] ?? null;
	const composeDocumentTitle =
		state.documentTitle ||
		`${state.type === "quote" ? "Quote" : "Invoice"}${
			state.orderNo ? ` ${state.orderNo}` : ""
		}`;

	const value = useMemo<SalesMenuContextValue>(
		() => ({
			state,
			actions,
			email,
			meta: {
				isOpen,
			},
		}),
		[actions, email, isOpen, state],
	);

	return (
		<SalesMenuContext.Provider value={value}>
			<DropdownMenu.Root open={isOpen} onOpenChange={setOpen}>
				<DropdownMenu.Trigger asChild>
					{trigger || (
						<Button variant={triggerVariant} size={triggerSize}>
							<Icons.Menu className="size-4" />
						</Button>
					)}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					align={align}
					className={contentClassName || "w-[185px]"}
					onClick={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
				>
					{children}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<SalesDocumentEmailDialog
				salesOrderId={composeSalesOrderId}
				mode={state.type === "quote" ? "quote" : "invoice"}
				documentTitle={composeDocumentTitle}
				orderNo={state.orderNo}
				customerEmail={state.customerEmail}
				customerPhone={state.customerPhone}
				customerName={state.customerName}
				trigger={null}
				open={composeOpen}
				onOpenChange={setComposeOpen}
			/>
			<CustomerEmailRequiredDialog
				open={email.emailRequirementOpen}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) email.dismissEmailRequirement();
				}}
				customerId={state.customerId}
				customerName={state.customerName}
				description="Save it now and the pending Sales email will send automatically."
				onSaved={(address) => email.continueWithCustomerEmail(address)}
			/>
			{composeSalesOrderId && workflowCancellationAction ? (
				<SalesWorkflowCancellationDialog
					open
					onOpenChange={(nextOpen) => {
						if (!nextOpen) setWorkflowCancellationAction(null);
					}}
					salesOrderId={composeSalesOrderId}
					orderNo={state.orderNo}
					action={workflowCancellationAction}
					salesRefs={state.salesRefs}
				/>
			) : null}
		</SalesMenuContext.Provider>
	);
}

type ActionProps = {
	disabled?: boolean;
};

type MarkAsProps = ActionProps & {
	asSubmenu?: boolean;
	includePaymentReviewed?: boolean;
	onPaymentReviewed?: () => void;
	currentStatus?: SalesOrderLifecycleStatus;
	productionStatus?: string | null;
};

const markAsActionLabels: Record<SalesInventoryMarkAsAction, string> = {
	production_completed: "Production completed",
	fulfilled: "Fulfilled",
};

function markAsInventoryReasonLabel(
	reason: SalesInventoryMarkAsPreflightResult["blockers"][number]["reason"],
) {
	if (reason === "awaiting_inbound") return "Awaiting inbound";
	return "Needs allocation";
}

function formatInventoryQty(value: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function useSendSalesEmailAction({
	state,
	closeMenu,
}: {
	state: SalesMenuState;
	closeMenu: () => void;
}): SalesMenuEmailController {
	const isQuote = state.type === "quote";
	const [didSucceed, setDidSucceed] = useState(false);
	const [emailRequirementOpen, setEmailRequirementOpen] = useState(false);
	const emailContinuation = useRef(
		createSalesEmailContinuation<EmailOptions>(),
	);
	const auth = useAuth();
	const testEmailMode = useTestEmailMode((store) => store.enabled);
	const shouldUseTestEmailMode =
		auth.roleTitle?.toLowerCase() === "super admin" && testEmailMode;
	const notification = useNotificationTrigger({
		monitor: true,
		silent: true,
		taskTitle: isQuote ? "Sending quote email" : "Sending invoice email",
		taskDescription: "Watch this email job in the task monitor.",
		debug: true,
		onStarted() {
			closeMenu();
		},
		onSuccess() {
			setDidSucceed(true);
		},
		onError() {
			setDidSucceed(false);
			closeMenu();
		},
	});
	const isSending =
		notification.isActionPending || notification.status === "SYNCING";
	const dispatchEmail = useCallback(
		(options: EmailOptions, recipientEmail?: string | null) => {
			setDidSucceed(false);
			notification.simpleSalesDocumentEmail({
				emailType: options.withPayment
					? options.partPayment
						? "with part payment"
						: "with payment"
					: "with payment",
				printType: isQuote ? "quote" : "order",
				salesIds: state.id ? [state.id] : state.salesIds,
				customerEmail: recipientEmail?.trim() || undefined,
				testEmailMode: shouldUseTestEmailMode,
			});
			closeMenu();
		},
		[
			closeMenu,
			isQuote,
			notification,
			shouldUseTestEmailMode,
			state.id,
			state.salesIds,
		],
	);
	const sendEmail = useCallback(
		(options: EmailOptions = {}) => {
			const customerEmail = state.customerEmail?.trim();
			if (state.customerEmail !== undefined && !customerEmail) {
				if (!state.customerId) {
					toast({
						title: "Customer email not available",
						description:
							"This sale does not have an editable customer record. Open the customer and add an email before sending.",
						variant: "destructive",
					});
					closeMenu();
					return;
				}
				emailContinuation.current.queue(options);
				setEmailRequirementOpen(true);
				closeMenu();
				return;
			}
			dispatchEmail(options, customerEmail);
		},
		[closeMenu, dispatchEmail, state.customerEmail, state.customerId],
	);
	const continueWithCustomerEmail = useCallback(
		(email: string) => {
			const options = emailContinuation.current.consume();
			setEmailRequirementOpen(false);
			if (options) dispatchEmail(options, email);
		},
		[dispatchEmail],
	);
	const dismissEmailRequirement = useCallback(() => {
		emailContinuation.current.cancel();
		setEmailRequirementOpen(false);
	}, []);

	return useMemo(
		() => ({
			didSucceed,
			isPending: isSending,
			sendEmail,
			emailRequirementOpen,
			dismissEmailRequirement,
			continueWithCustomerEmail,
		}),
		[
			continueWithCustomerEmail,
			didSucceed,
			dismissEmailRequirement,
			emailRequirementOpen,
			isSending,
			sendEmail,
		],
	);
}

function SalesMenuCopy({ disabled }: ActionProps) {
	const { actions, state } = useSalesMenuContext();

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.slug}>
				<Icons.Copy className="mr-2 size-4 text-muted-foreground/70" />
				Copy As
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void actions.copyAs("order");
					}}
				>
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void actions.copyAs("quote");
					}}
				>
					Quote
				</DropdownMenu.Item>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}

function SalesMenuMove({ disabled }: ActionProps) {
	const { actions, state } = useSalesMenuContext();
	const isQuote = state.type === "quote";

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.slug || !state.type}
			onSelect={(e) => {
				e.preventDefault();
				void actions.move();
			}}
		>
			<Icons.Move className="mr-2 size-4 text-muted-foreground/70" />
			{isQuote ? "Create Invoice" : "Move to Quote"}
		</DropdownMenu.Item>
	);
}

function SalesMenuAcceptQuote({ disabled }: ActionProps) {
	const { actions, state } = useSalesMenuContext();
	const loader = useLoadingToast();
	const isQuote = state.type === "quote";
	const canOpen = isQuote && Boolean(state.id && state.orderNo);

	if (!isQuote) return null;

	return (
		<DropdownMenu.Item
			disabled={disabled || !canOpen}
			onSelect={(event) => {
				event.preventDefault();
				if (!state.id || !state.orderNo) return;

				void (async () => {
					try {
						const token = await generateToken({
							salesId: state.id,
							orderId: state.orderNo,
							expiry: addDays(new Date(), 14).toISOString(),
						} satisfies QuoteAcceptanceTokenSchema);

						actions.closeMenu();
						openLink(
							`/sales/accept-quote/${state.orderNo}?token=${encodeURIComponent(
								token,
							)}`,
							null,
							true,
						);
					} catch {
						loader.error("Unable to open accept quote page");
					}
				})();
			}}
		>
			<Icons.CheckCircle2 className="mr-2 size-4 text-muted-foreground/70" />
			Accept Quote
		</DropdownMenu.Item>
	);
}

type PrintActionProps = {
	pdf?: boolean;
	openInNewTab?: boolean;
};

function useSalesPrintAction() {
	const { state, actions } = useSalesMenuContext();
	const salesPrint = useSalesPrintController();

	return async function runPrint(
		params?: SalesPrintProps,
		options?: PrintActionProps,
	) {
		if (!state.salesIds.length) return;
		const mode = resolveSalesPrintMode(
			params?.mode,
			state.type === "quote" ? "quote" : "order",
		);

		const dispatchId =
			params?.mode === "packing list" && params?.dispatchId !== "all"
				? Number(params?.dispatchId)
				: null;
		if (options?.pdf) {
			actions.closeMenu();
			await salesPrint.downloadPdf({
				salesIds: state.salesIds,
				mode,
				dispatchId,
				salesType: state.type === "quote" ? "quote" : "order",
			});
			return;
		}

		actions.closeMenu();
		await salesPrint.print({
			salesIds: state.salesIds,
			mode,
			dispatchId,
			openInNewTab: options?.openInNewTab,
			salesType: state.type === "quote" ? "quote" : "order",
		});
	};
}

function SalesMenuShare({ disabled }: ActionProps) {
	const { actions, state } = useSalesMenuContext();

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.salesIds.length}
			onSelect={(e) => {
				e.preventDefault();
				actions.openComposeEmail();
			}}
		>
			<Icons.Share2 className="mr-2 size-4 text-muted-foreground/70" />
			Send Document
		</DropdownMenu.Item>
	);
}

function SalesMenuPrint({ disabled }: ActionProps) {
	const runPrint = useSalesPrintAction();
	const { state } = useSalesMenuContext();
	const isQuote = state.type === "quote";
	const shiftClickRef = useRef(false);
	const captureShiftClick = (event: { shiftKey: boolean }) => {
		shiftClickRef.current = event.shiftKey;
	};
	const consumeShiftClick = () => {
		const openInNewTab = shiftClickRef.current;
		shiftClickRef.current = false;
		return openInNewTab;
	};

	if (isQuote) {
		return (
			<DropdownMenu.Item
				disabled={disabled || !state.salesIds.length}
				onPointerDown={captureShiftClick}
				onSelect={(e) => {
					e.preventDefault();
					void runPrint(
						{ mode: "quote" },
						{ pdf: false, openInNewTab: consumeShiftClick() },
					);
				}}
			>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
				<span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
					v2
				</span>
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.salesIds.length}>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.Item
					onPointerDown={captureShiftClick}
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(
							{ mode: "order-packing", dispatchId: "all" },
							{ pdf: false, openInNewTab: consumeShiftClick() },
						);
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order & Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onPointerDown={captureShiftClick}
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(undefined, {
							pdf: false,
							openInNewTab: consumeShiftClick(),
						});
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onPointerDown={captureShiftClick}
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(
							{ mode: "packing list" },
							{ pdf: false, openInNewTab: consumeShiftClick() },
						);
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onPointerDown={captureShiftClick}
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(
							{ mode: "production" },
							{ pdf: false, openInNewTab: consumeShiftClick() },
						);
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Production
				</DropdownMenu.Item>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}

function SalesMenuPDF({ disabled }: ActionProps) {
	const runPrint = useSalesPrintAction();
	const { state } = useSalesMenuContext();
	const isQuote = state.type === "quote";

	if (isQuote) {
		return (
			<DropdownMenu.Item
				disabled={disabled || !state.salesIds.length}
				onSelect={(e) => {
					e.preventDefault();
					void runPrint({ mode: "quote" }, { pdf: true });
				}}
			>
				<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
				PDF
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.salesIds.length}>
				<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
				PDF
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(
							{ mode: "order-packing", dispatchId: "all" },
							{ pdf: true },
						);
					}}
				>
					<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
					Order & Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(undefined, { pdf: true });
					}}
				>
					<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "packing list" }, { pdf: true });
					}}
				>
					<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
					Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "production" }, { pdf: true });
					}}
				>
					<Icons.FileText className="mr-2 size-4 text-muted-foreground/70" />
					Production
				</DropdownMenu.Item>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}

function SalesMenuNotifications({ disabled }: ActionProps) {
	const { email, state } = useSalesMenuContext();
	const { didSucceed, isPending, sendEmail } = email;
	const isQuote = state.type === "quote";

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.salesIds.length || isPending}
			onSelect={(e) => {
				e.preventDefault();
				sendEmail({ withPayment: true });
			}}
		>
			{isPending ? (
				<Icons.Loader2 className="mr-2 size-4 animate-spin text-muted-foreground/70" />
			) : didSucceed ? (
				<Icons.Check className="mr-2 size-4 text-emerald-600" />
			) : (
				<Icons.Mail className="mr-2 size-4 text-muted-foreground/70" />
			)}
			{isPending
				? "Sending..."
				: didSucceed
					? "Sent!"
					: isQuote
						? "Quote Email"
						: "Invoice Email"}
		</DropdownMenu.Item>
	);
}

function SalesMenuPaymentNotifications({ disabled }: ActionProps) {
	const { state, actions } = useSalesMenuContext();

	return (
		<SalesPaymentNotificationsMenu
			disabled={disabled}
			salesIds={state.salesIds}
			type={state.type}
			onSent={actions.closeMenu}
		/>
	);
}

type DeleteProps = {
	onDeleted?: () => void;
};

function SalesMenuDelete({ onDeleted }: DeleteProps) {
	const { state, actions } = useSalesMenuContext();
	const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [confirm, setConfirm] = useState(false);
	const mutation = useMutation(
		useTRPC().sales.deleteSale.mutationOptions({
			onSuccess: () => {
				onDeleted?.();
				actions.closeMenu();
			},
			meta: {
				queryEventScope: {
					sales: state.salesRefs,
				},
				toastTitle: {
					error: "Unable to complete",
					loading: "Delete...",
					success: "Deleted!.",
				},
			},
		}),
	);

	return (
		<DropdownMenu.Item
			className="text-destructive focus:text-destructive"
			disabled={!state.id || mutation.isPending}
			onSelect={(e) => {
				e.preventDefault();
				if (!state.id) return;

				if (!confirm) {
					setConfirm(true);
					if (confirmTimerRef.current) {
						clearTimeout(confirmTimerRef.current);
					}
					confirmTimerRef.current = setTimeout(() => {
						setConfirm(false);
					}, 3000);
					return;
				}

				setConfirm(false);
				mutation.mutate({
					salesId: state.id,
				});
			}}
		>
			{confirm ? (
				<Icons.Check className="mr-2 size-4" />
			) : (
				<Icons.Trash2 className="mr-2 size-4" />
			)}
			{confirm ? "Sure?" : "Delete"}
		</DropdownMenu.Item>
	);
}

function SalesMenuMarkAs({
	disabled,
	asSubmenu = true,
	includePaymentReviewed = false,
	onPaymentReviewed,
	currentStatus,
	productionStatus,
}: MarkAsProps) {
	const { state, actions } = useSalesMenuContext();
	const auth = useAuth();
	const trpc = useTRPC();
	const sq = useSalesQueryClient(state.salesRefs);
	const salesIds = state.salesIds;
	const [inventoryPreflight, setInventoryPreflight] =
		useState<SalesStatusMarkAsPreflightResult | null>(null);
	const [preflightLoadingAction, setPreflightLoadingAction] =
		useState<SalesInventoryMarkAsAction | null>(null);
	const isDisabled = disabled || !salesIds.length;
	const expectedTaskStartsRef = useRef(0);
	const completedTaskStartsRef = useRef(0);
	const taskStartedToastShownRef = useRef(false);
	const statusActionInFlightRef = useRef(false);
	const [statusActionPending, setStatusActionPending] = useState(false);
	const beginStatusAction = () => {
		if (statusActionInFlightRef.current) return false;
		statusActionInFlightRef.current = true;
		setStatusActionPending(true);
		return true;
	};
	const releaseStatusAction = () => {
		statusActionInFlightRef.current = false;
		setStatusActionPending(false);
	};
	const ensureFulfillmentDispatchMutation = useMutation(
		trpc.dispatch.ensureSalesOrderFulfillmentDispatch.mutationOptions({
			meta: {
				queryEventScope: {
					sales: state.salesRefs,
				},
			},
		}),
	);
	const resolveInventoryMarkAsMutation = useMutation(
		trpc.inventories.overrideSalesInventoryMarkAsAvailabilityForContinue.mutationOptions(),
	);
	const markPaymentsReviewedMutation = useMutation(
		trpc.sales.markPaymentsReviewed.mutationOptions({
			meta: {
				queryEvents: false,
			},
		}),
	);
	const invalidateOrders = async () => {
		await Promise.all([
			sq.invalidate.salesList(),
			sq.invalidate.productionOverview(),
		]);
	};
	const closeMenuAfterExpectedTaskStarts = () => {
		completedTaskStartsRef.current += 1;

		if (
			expectedTaskStartsRef.current > 0 &&
			completedTaskStartsRef.current >= expectedTaskStartsRef.current
		) {
			expectedTaskStartsRef.current = 0;
			completedTaskStartsRef.current = 0;
			actions.closeMenu();
			releaseStatusAction();
		}
	};
	const salesControlTask = useTaskTrigger({
		successToast: "Sales control updated",
		errorToast: "Unable to update sales control",
		executingToast: "Updating sales control...",
		monitor: true,
		onStarted() {
			closeMenuAfterExpectedTaskStarts();
			if (!taskStartedToastShownRef.current) {
				taskStartedToastShownRef.current = true;
				toast({
					title: "Sales status update started",
					description: "You can keep working while the order status updates.",
				});
			}
		},
		onSuccess() {
			void invalidateOrders();
			toast({
				title: "Sales status updated",
				description: "The order list and saved tab counts are refreshing.",
				variant: "success",
			});
		},
		onError() {
			expectedTaskStartsRef.current = 0;
			completedTaskStartsRef.current = 0;
			actions.closeMenu();
			releaseStatusAction();
		},
	});

	if (state.type !== "order") {
		return null;
	}

	const getTaskMeta = (salesId: number) => ({
		salesId,
		authorId: Number(auth.id || 0),
		authorName: auth.name || "System",
	});

	const runInventoryMarkAsPreflight = async (
		action: SalesInventoryMarkAsAction,
	) => {
		setPreflightLoadingAction(action);
		try {
			const preflight = await sq.qc.fetchQuery(
				trpc.inventories.salesInventoryMarkAsPreflight.queryOptions(
					{
						salesOrderIds: salesIds,
						action,
					},
					{ staleTime: 0 },
				),
			);

			if (!preflight.ok) {
				setInventoryPreflight(preflight);
				return false;
			}

			return true;
		} catch {
			toast({
				title: "Unable to verify inventory readiness",
				description: "Please review the Inventory tab before using Mark as.",
				variant: "destructive",
			});
			return false;
		} finally {
			setPreflightLoadingAction(null);
		}
	};

	const resolveDispatchId = async (salesId: number) => {
		const dispatch = await ensureFulfillmentDispatchMutation.mutateAsync({
			salesId,
		});
		return dispatch.id;
	};

	const startMarkProductionCompletedTask = async () => {
		try {
			expectedTaskStartsRef.current = salesIds.length;
			completedTaskStartsRef.current = 0;
			taskStartedToastShownRef.current = false;
			for (const salesId of salesIds) {
				await salesControlTask.trigger(
					{
						taskName: "update-sales-control",
						payload: {
							meta: getTaskMeta(salesId),
							submitAll: {
								submissionSource: "sales_mark_as_completed",
							},
						} as UpdateSalesControl,
					},
					{
						intent: {
							name: "sales.mark-as-production-completed",
							version: 1,
							args: {
								salesIds: [salesId],
								sales: state.salesRefs.filter(
									(sale) => sale.salesId === salesId,
								),
							},
						},
					},
				);
			}
			await invalidateOrders();
		} catch {
			releaseStatusAction();
			toast({
				title: "Unable to mark production completed",
				variant: "destructive",
			});
		}
	};

	const startMarkFulfilledTask = async () => {
		try {
			expectedTaskStartsRef.current = salesIds.length;
			completedTaskStartsRef.current = 0;
			taskStartedToastShownRef.current = false;
			for (const salesId of salesIds) {
				const dispatchId = await resolveDispatchId(salesId);
				await salesControlTask.trigger(
					{
						taskName: "update-sales-control",
						payload: {
							meta: getTaskMeta(salesId),
							markAsCompleted: {
								dispatchId,
								receivedBy: auth.name || "System",
								receivedDate: new Date(),
							},
						} as UpdateSalesControl,
					},
					{
						intent: {
							name: "sales.mark-as-fulfilled",
							version: 1,
							args: {
								salesIds: [salesId],
								sales: state.salesRefs.filter(
									(sale) => sale.salesId === salesId,
								),
								dispatchIds: [dispatchId],
							},
						},
					},
				);
			}
			await invalidateOrders();
		} catch {
			releaseStatusAction();
			toast({
				title: "Unable to mark fulfilled",
				variant: "destructive",
			});
		}
	};

	const markProductionCompleted = async () => {
		if (!beginStatusAction()) return;
		const inventoryReady = await runInventoryMarkAsPreflight(
			"production_completed",
		);
		if (!inventoryReady) {
			releaseStatusAction();
			return;
		}
		await startMarkProductionCompletedTask();
	};

	const markFulfilled = async () => {
		if (!auth.can.viewMarkSalesOrderFulfilled) {
			toast({
				title: "Mark as Fulfilled is not permitted",
				description:
					"Ask an administrator for the Mark Sales Order Fulfilled permission.",
				variant: "destructive",
			});
			return;
		}
		if (statusActionInFlightRef.current) return;
		if (!beginStatusAction()) return;
		const inventoryReady = await runInventoryMarkAsPreflight("fulfilled");
		if (!inventoryReady) {
			releaseStatusAction();
			return;
		}
		await startMarkFulfilledTask();
	};

	const markPaymentReviewed = async () => {
		try {
			const result = await reviewSelectedPayments({
				salesIds,
				review: (input) => markPaymentsReviewedMutation.mutateAsync(input),
				invalidate: (sales) => sq.invalidate.salesPaymentChanged(sales),
				onPaymentReviewed,
				closeMenu: actions.closeMenu,
			});
			const successCount = result.reviewed.length;
			const failedCount = result.skipped.length;

			if (successCount > 0) {
				toast({
					duration: 2000,
					variant: "success",
					title: "Payments reviewed",
					description: `${successCount} order${
						successCount === 1 ? "" : "s"
					} removed from the review queue.`,
				});
			}

			if (failedCount > 0) {
				toast({
					duration: 3000,
					variant: "destructive",
					title: "Some payments were not reviewed",
					description: `${failedCount} selected order${
						failedCount === 1 ? "" : "s"
					} had no payment needing review.`,
				});
			}
		} catch (error) {
			toast({
				title: "Unable to review payments",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	};

	const resolveInventoryAndContinue = async () => {
		if (!inventoryPreflight) return;

		try {
			const result = await resolveInventoryMarkAsMutation.mutateAsync({
				salesOrderIds: salesIds,
				action: inventoryPreflight.action,
			});

			if (!result.continueAllowed) {
				setInventoryPreflight(result.remainingPreflight);
				toast({
					title: "Inventory still needs review",
					description:
						"The availability override could not be saved for every selected order.",
					variant: "destructive",
				});
				return;
			}

			setInventoryPreflight(null);
			toast({
				title: "Inventory and production resolved",
				description:
					"Inbound receipts and production approvals are complete. The status update is continuing.",
				variant: "success",
			});

			if (result.action === "production_completed") {
				if (!beginStatusAction()) return;
				await startMarkProductionCompletedTask();
			} else {
				if (!beginStatusAction()) return;
				await startMarkFulfilledTask();
			}
		} catch (error) {
			releaseStatusAction();
			toast({
				title: "Unable to resolve inventory",
				description:
					error instanceof Error
						? error.message
						: "The inventory and production dependencies could not be resolved.",
				variant: "destructive",
			});
		}
	};

	const statusMenuActions = (
		currentStatus
			? getSalesOrderStatusMenuActions({
					status: currentStatus,
					productionStatus,
				})
			: [
					{
						action: "production_completed" as const,
						label: "Production completed",
					},
					{
						action: "fulfilled" as const,
						label: "Fulfilled",
					},
				]
	)
		.filter(
			(item) =>
				item.action !== "fulfilled" || auth.can.viewMarkSalesOrderFulfilled,
		)
		.filter(
			(item) =>
				salesIds.length === 1 ||
				(item.action !== "cancel_production" &&
					item.action !== "cancel_fulfillment"),
		);
	const items = (
		<>
			{statusMenuActions.map((item) => (
				<SalesMenuItem
					key={item.action}
					disabled={
						isDisabled ||
						item.disabled ||
						preflightLoadingAction !== null ||
						statusActionPending ||
						salesIds.length === 0
					}
					onSelect={(event) => {
						event.preventDefault();
						if (item.action === "production_completed") {
							void markProductionCompleted();
							return;
						}
						if (item.action === "fulfilled") {
							void markFulfilled();
							return;
						}
						if (item.action === "cancel_production") {
							actions.openWorkflowCancellation("production");
							return;
						}
						actions.openWorkflowCancellation("fulfillment");
					}}
				>
					{item.label}
				</SalesMenuItem>
			))}
			{includePaymentReviewed ? (
				<SalesMenuItem
					disabled={isDisabled || markPaymentsReviewedMutation.isPending}
					onSelect={(event) => {
						event.preventDefault();
						void markPaymentReviewed();
					}}
				>
					Reviewed
				</SalesMenuItem>
			) : null}
		</>
	);
	const blockerPreview = inventoryPreflight?.blockers.slice(0, 4) || [];
	const isResolvingInventory = resolveInventoryMarkAsMutation.isPending;
	const primaryInventoryActionLabel = isResolvingInventory
		? "Resolving..."
		: "Receive, approve and continue";
	const dialog = (
		<AlertDialog
			open={Boolean(inventoryPreflight)}
			onOpenChange={(open) => {
				if (!open) setInventoryPreflight(null);
			}}
		>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>
						Inventory and production need attention
					</AlertDialog.Title>
					<AlertDialog.Description>
						{inventoryPreflight
							? `${markAsActionLabels[inventoryPreflight.action]} is paused while inventory and production dependencies are resolved.`
							: "Inventory and production dependencies still need resolution."}
					</AlertDialog.Description>
				</AlertDialog.Header>
				{inventoryPreflight ? (
					<div className="space-y-3">
						<div className="grid gap-2 sm:grid-cols-3">
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Orders affected
								</div>
								<div className="text-base font-semibold">
									{inventoryPreflight.automation.affectedSalesOrderCount}
								</div>
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Inbound to receive
								</div>
								<div className="text-base font-semibold">
									{inventoryPreflight.automation.inboundShipmentCount}
								</div>
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Reviews to approve
								</div>
								<div className="text-base font-semibold">
									{inventoryPreflight.automation.pendingProductionReviewCount}
								</div>
							</div>
						</div>
						<div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
							<div className="font-medium text-foreground">
								One click will complete these steps:
							</div>
							<ul className="mt-1 list-disc space-y-1 pl-4">
								{inventoryPreflight.automation
									.productionSubmissionCountToPrepare > 0 ? (
									<li>
										Submit{" "}
										{
											inventoryPreflight.automation
												.productionSubmissionCountToPrepare
										}{" "}
										production item
										{inventoryPreflight.automation
											.productionSubmissionCountToPrepare === 1
											? ""
											: "s"}{" "}
										(
										{formatInventoryQty(
											inventoryPreflight.automation.productionQtyToPrepare,
										)}{" "}
										units)
									</li>
								) : null}
								{inventoryPreflight.automation.inboundShipmentCount > 0 ? (
									<li>
										Receive {inventoryPreflight.automation.inboundShipmentCount}{" "}
										inbound shipment
										{inventoryPreflight.automation.inboundShipmentCount === 1
											? ""
											: "s"}{" "}
										(
										{formatInventoryQty(
											inventoryPreflight.automation.inboundQtyToReceive,
										)}{" "}
										remaining)
									</li>
								) : null}
								{inventoryPreflight.automation.pendingProductionReviewCount >
								0 ? (
									<li>
										Approve all{" "}
										{inventoryPreflight.automation.pendingProductionReviewCount}{" "}
										production material review
										{inventoryPreflight.automation
											.pendingProductionReviewCount === 1
											? ""
											: "s"}
									</li>
								) : null}
								{inventoryPreflight.automation
									.manualAvailabilityComponentCount > 0 ? (
									<li>
										Resolve or override{" "}
										{
											inventoryPreflight.automation
												.manualAvailabilityComponentCount
										}{" "}
										remaining component
										{inventoryPreflight.automation
											.manualAvailabilityComponentCount === 1
											? ""
											: "s"}{" "}
										availability checks with an audit record
									</li>
								) : null}
								<li>
									{inventoryPreflight.automation.willCompleteDispatch
										? "Pack the order and complete its dispatch"
										: "Submit and complete production"}
								</li>
							</ul>
						</div>
						<div className="max-h-64 overflow-y-auto rounded-md border uppercase">
							{blockerPreview.map((blocker) => (
								<div
									key={blocker.salesOrderId}
									className="border-b px-3 py-2 last:border-b-0"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">
												{blocker.orderId ||
													blocker.title ||
													blocker.salesOrderId}
											</div>
											<div className="text-xs text-muted-foreground">
												{markAsInventoryReasonLabel(blocker.reason)} ·{" "}
												{blocker.unresolvedComponentCount} component
												{blocker.unresolvedComponentCount === 1 ? "" : "s"}
											</div>
										</div>
										<div className="shrink-0 text-right text-xs text-muted-foreground">
											{formatInventoryQty(blocker.pendingQty)} pending
										</div>
									</div>
									{blocker.components.length ? (
										<div className="mt-2 space-y-1">
											{blocker.components
												.slice(0, 2)
												.map((component, index) => (
													<div
														key={`${blocker.salesOrderId}-${component.componentId ?? component.lineItemId ?? index}`}
														className="flex items-center justify-between gap-2 text-xs"
													>
														<span className="min-w-0 truncate text-muted-foreground">
															{component.name ||
																component.sku ||
																"Inventory component"}
														</span>
														<span className="shrink-0 text-muted-foreground">
															{markAsInventoryReasonLabel(component.reason)}
														</span>
													</div>
												))}
										</div>
									) : null}
								</div>
							))}
							{inventoryPreflight.blockers.length > blockerPreview.length ? (
								<div className="px-3 py-2 text-xs text-muted-foreground">
									+{inventoryPreflight.blockers.length - blockerPreview.length}{" "}
									more blocked order
									{inventoryPreflight.blockers.length -
										blockerPreview.length ===
									1
										? ""
										: "s"}
								</div>
							) : null}
						</div>
					</div>
				) : null}
				<AlertDialog.Footer>
					<AlertDialog.Cancel disabled={isResolvingInventory}>
						Review inventory first
					</AlertDialog.Cancel>
					<AlertDialog.Action
						disabled={isResolvingInventory}
						onClick={(event) => {
							event.preventDefault();
							void resolveInventoryAndContinue();
						}}
					>
						{primaryInventoryActionLabel}
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog>
	);

	if (!asSubmenu) {
		return (
			<>
				{items}
				{dialog}
			</>
		);
	}

	return (
		<>
			<SalesMenuSub>
				<SalesMenuSubTrigger disabled={isDisabled}>
					<Icons.CheckCheck className="mr-2 size-4 text-muted-foreground/70" />
					Mark as
				</SalesMenuSubTrigger>
				<SalesMenuSubContent>{items}</SalesMenuSubContent>
			</SalesMenuSub>
			{dialog}
		</>
	);
}

function SalesMenuItem(props: ComponentProps<typeof DropdownMenu.Item>) {
	return <DropdownMenu.Item {...props} />;
}

function SalesMenuSalesPrintMenuItems({ disabled }: ActionProps) {
	return (
		<>
			<SalesMenuPDF disabled={disabled} />
			<SalesMenuPrint disabled={disabled} />
		</>
	);
}

function SalesMenuQuotePrintMenuItems({ disabled }: ActionProps) {
	return <SalesMenuSalesPrintMenuItems disabled={disabled} />;
}

function SalesMenuSalesEmailMenuItems({ disabled }: ActionProps) {
	return (
		<>
			<SalesMenuComposeEmail disabled={disabled} />
			<SalesMenuNotifications disabled={disabled} />
			<SalesMenuPaymentNotifications disabled={disabled} />
		</>
	);
}

function SalesMenuQuoteEmailMenuItems({ disabled }: ActionProps) {
	return (
		<>
			<SalesMenuComposeEmail disabled={disabled} />
			<SalesMenuNotifications disabled={disabled} />
		</>
	);
}

function SalesMenuComposeEmail({ disabled }: ActionProps) {
	const { state, actions } = useSalesMenuContext();

	return (
		<DropdownMenu.Item
			disabled={disabled || !(state.id ?? state.salesIds[0])}
			onSelect={(event) => {
				event.preventDefault();
				actions.openComposeEmail();
			}}
		>
			<Icons.Edit3 className="mr-2 size-4 text-muted-foreground/70" />
			Compose
		</DropdownMenu.Item>
	);
}

function SalesMenuSeparator() {
	return <DropdownMenu.Separator />;
}

function SalesMenuLabel(props: ComponentProps<typeof DropdownMenu.Label>) {
	return <DropdownMenu.Label {...props} />;
}

function SalesMenuSub(props: ComponentProps<typeof DropdownMenu.Sub>) {
	return <DropdownMenu.Sub {...props} />;
}

function SalesMenuSubTrigger(
	props: ComponentProps<typeof DropdownMenu.SubTrigger>,
) {
	return <DropdownMenu.SubTrigger {...props} />;
}

function SalesMenuSubContent(
	props: ComponentProps<typeof DropdownMenu.SubContent>,
) {
	return <DropdownMenu.SubContent {...props} />;
}

export const SalesMenu = Object.assign(SalesMenuRoot, {
	AcceptQuote: SalesMenuAcceptQuote,
	Copy: SalesMenuCopy,
	Move: SalesMenuMove,
	Share: SalesMenuShare,
	Print: SalesMenuPrint,
	PDF: SalesMenuPDF,
	SalesPrintMenuItems: SalesMenuSalesPrintMenuItems,
	QuotePrintMenuItems: SalesMenuQuotePrintMenuItems,
	Notifications: SalesMenuNotifications,
	PaymentNotifications: SalesMenuPaymentNotifications,
	SalesEmailMenuItems: SalesMenuSalesEmailMenuItems,
	QuoteEmailMenuItems: SalesMenuQuoteEmailMenuItems,
	MarkAs: SalesMenuMarkAs,
	Delete: SalesMenuDelete,
	Item: SalesMenuItem,
	Label: SalesMenuLabel,
	Separator: SalesMenuSeparator,
	Sub: SalesMenuSub,
	SubTrigger: SalesMenuSubTrigger,
	SubContent: SalesMenuSubContent,
});
