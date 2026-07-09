import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { generateToken } from "@/actions/token-action";
import Link from "@/components/link";
import { SalesDocumentEmailDialog } from "@/components/sales-document-email-dialog";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import {
	buildSalesPdfDownloadUrlFromQuery,
	resolveSalesPrintMode,
} from "@/modules/sales-print/application/sales-print-service";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTestEmailMode } from "@/store/test-email-mode";
import { useTRPC } from "@/trpc/client";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import type {
	SalesInventoryMarkAsAction,
	SalesInventoryMarkAsPreflightResult,
} from "@gnd/sales/sales-inventory-mark-as-preflight";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog, DropdownMenu } from "@gnd/ui/namespace";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { share } from "@gnd/utils/share";
import type { SalesPdfToken } from "@gnd/utils/tokenizer";
import type { UpdateSalesControl } from "@sales/schema";
import { useMutation } from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
	type ComponentProps,
	type ReactNode,
	createContext,
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
	salesIds: number[];
	orderNo?: string | null;
	customerEmail?: string | null;
	customerName?: string | null;
	documentTitle?: string | null;
};

type SalesMenuActions = {
	closeMenu: () => void;
	openComposeEmail: () => void;
	copyAs: (as: SalesType) => Promise<void>;
	move: () => Promise<void>;
};

type SalesMenuContextValue = {
	state: SalesMenuState;
	actions: SalesMenuActions;
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
	orderNo?: string | null;
	customerEmail?: string | null;
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
	orderNo,
	customerEmail,
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
	const isControlled = typeof open === "boolean";
	const isOpen = isControlled ? (open as boolean) : internalOpen;
	const setOpen = onOpenChange || setInternalOpen;

	const sq = useSalesQueryClient();
	const loader = useLoadingToast();
	const trpc = useTRPC();
	const copySaleMutation = useMutation(trpc.sales.copySale.mutationOptions());
	const moveSaleMutation = useMutation(trpc.sales.moveSale.mutationOptions());

	const state = useMemo<SalesMenuState>(() => {
		const resolvedType = type ?? "order";
		const resolvedIds = salesIds?.length ? salesIds : id ? [id] : [];

		return {
			id,
			slug,
			type: resolvedType,
			salesIds: resolvedIds,
			orderNo,
			customerEmail,
			customerName,
			documentTitle,
		};
	}, [
		customerEmail,
		customerName,
		documentTitle,
		id,
		orderNo,
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
			async copyAs(as) {
				if (!state.slug || !state.type) return;
				loader.loading("Copying...");
				try {
					const result = await copySaleMutation.mutateAsync({
						salesUid: state.slug,
						as,
						type: state.type,
					});

					if (as === "order" && result.id) {
						await resetSalesStatAction(result.id, state.slug);
					}

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
					await sq.invalidate.salesDocumentChanged(as);
					setOpen(false);
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

					if (to === "order" && result.id && result.slug) {
						await resetSalesStatAction(result.id, result.slug);
					}

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
					await sq.invalidate.salesDocumentChanged(to);
					setOpen(false);
				} catch {
					loader.error("Unable to complete");
				}
			},
		}),
		[
			copySaleMutation,
			loader,
			moveSaleMutation,
			setOpen,
			sq,
			state.slug,
			state.type,
		],
	);
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
			meta: {
				isOpen,
			},
		}),
		[actions, isOpen, state],
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
				customerName={state.customerName}
				trigger={null}
				open={composeOpen}
				onOpenChange={setComposeOpen}
			/>
		</SalesMenuContext.Provider>
	);
}

type ActionProps = {
	disabled?: boolean;
};

type MarkAsProps = ActionProps & {
	asSubmenu?: boolean;
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

type EmailOptions = {
	withPayment?: boolean;
	partPayment?: boolean;
};

function useSendSalesEmailAction() {
	const { state, actions } = useSalesMenuContext();
	const isQuote = state.type === "quote";
	const [didSucceed, setDidSucceed] = useState(false);
	const auth = useAuth();
	const testEmailMode = useTestEmailMode((store) => store.enabled);
	const shouldUseTestEmailMode =
		auth.roleTitle?.toLowerCase() === "super admin" && testEmailMode;
	const notification = useNotificationTrigger({
		executingToast: "Sending email...",
		errorToast: "Email sending failed",
		successToast: "Email sent.",
		debug: true,
		onStarted() {
			actions.closeMenu();
		},
		onSuccess() {
			setDidSucceed(true);
		},
		onError() {
			setDidSucceed(false);
			actions.closeMenu();
		},
	});
	const isSending =
		notification.isActionPending || notification.status === "SYNCING";

	return {
		didSucceed,
		isPending: isSending,
		sendEmail(options: EmailOptions = {}) {
			if (state.customerEmail !== undefined && !state.customerEmail?.trim()) {
				toast({
					title: "Customer email not available",
					variant: "destructive",
				});
				actions.closeMenu();
				return;
			}

			setDidSucceed(false);
			notification.simpleSalesDocumentEmail({
				emailType: options.withPayment
					? options.partPayment
						? "with part payment"
						: "with payment"
					: "with payment",
				printType: isQuote ? "quote" : "order",
				salesIds: state.id ? [state.id] : state.salesIds,
				testEmailMode: shouldUseTestEmailMode,
			});
			actions.closeMenu();
		},
	};
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

type PrintActionProps = {
	pdf?: boolean;
	share?: boolean;
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

		if (options?.share) {
			const token = await generateToken({
				salesIds: state.salesIds,
				expiry: addDays(new Date(), 7).toISOString(),
				mode: params?.mode || state.type || "order",
			} satisfies SalesPdfToken);
			const shareUrl = buildSalesPdfDownloadUrlFromQuery({
				token,
				preview: false,
				origin: window.location.origin,
			});
			await share({
				url: shareUrl,
				msg: `Hello! download your sales ${shareUrl}`,
				recipient: "+234 8186877306",
			});
			actions.closeMenu();
			return;
		}

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
	const runPrint = useSalesPrintAction();
	const { state } = useSalesMenuContext();

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.salesIds.length}
			onSelect={(e) => {
				e.preventDefault();
				void runPrint(undefined, { share: true });
			}}
		>
			<Icons.Share2 className="mr-2 size-4 text-muted-foreground/70" />
			Share
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
	const { didSucceed, isPending, sendEmail } = useSendSalesEmailAction();
	const { state } = useSalesMenuContext();
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
	const sq = useSalesQueryClient();
	const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [confirm, setConfirm] = useState(false);
	const mutation = useMutation(
		useTRPC().sales.deleteSale.mutationOptions({
			onSuccess: async () => {
				await sq.invalidate.salesDocumentChanged(state.type);
				onDeleted?.();
				actions.closeMenu();
			},
			meta: {
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

function SalesMenuMarkAs({ disabled, asSubmenu = true }: MarkAsProps) {
	const { state, actions } = useSalesMenuContext();
	const auth = useAuth();
	const trpc = useTRPC();
	const sq = useSalesQueryClient();
	const salesIds = state.salesIds;
	const [inventoryPreflight, setInventoryPreflight] =
		useState<SalesInventoryMarkAsPreflightResult | null>(null);
	const [preflightLoadingAction, setPreflightLoadingAction] =
		useState<SalesInventoryMarkAsAction | null>(null);
	const isDisabled = disabled || !salesIds.length;
	const expectedTaskStartsRef = useRef(0);
	const completedTaskStartsRef = useRef(0);
	const createDispatchMutation = useMutation(
		trpc.dispatch.createDispatch.mutationOptions(),
	);
	const resolveInventoryMarkAsMutation = useMutation(
		trpc.inventories.resolveSalesInventoryMarkAsAvailabilityForContinue.mutationOptions(),
	);
	const autoResolveInventoryMarkAsMutation = useMutation(
		trpc.inventories.resolveSalesInventoryMarkAsAutoForContinue.mutationOptions(),
	);
	const invalidateOrders = async () => {
		await Promise.all([
			sq.invalidate.salesList(),
			sq.invalidate.productionOverview(),
			sq.invalidate.saleOverview(),
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
		}
	};
	const salesControlTask = useTaskTrigger({
		successToast: "Sales control updated",
		errorToast: "Unable to update sales control",
		executingToast: "Updating sales control...",
		monitor: true,
		onStarted() {
			void invalidateOrders();
			closeMenuAfterExpectedTaskStarts();
		},
		onError() {
			expectedTaskStartsRef.current = 0;
			completedTaskStartsRef.current = 0;
			actions.closeMenu();
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
				trpc.inventories.salesInventoryMarkAsPreflight.queryOptions({
					salesOrderIds: salesIds,
					action,
				}),
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
		const deliveryInfo = await sq.qc.fetchQuery(
			trpc.dispatch.salesDeliveryInfo.queryOptions({ salesId }),
		);
		const existingDispatch = [...(deliveryInfo?.deliveries || [])]
			.sort((left, right) => {
				const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
				const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
				return rightTime - leftTime;
			})
			.find((dispatch) => {
				const status = String(dispatch.status || "").toLowerCase();
				return (
					status !== "completed" &&
					status !== "cancelled" &&
					status !== "delivered"
				);
			});

		if (existingDispatch?.id) {
			return existingDispatch.id;
		}

		const createdDispatch = await createDispatchMutation.mutateAsync({
			salesId,
			deliveryMode: deliveryInfo?.deliveryOption || "delivery",
			dueDate: new Date(),
			status: "queue",
		});

		return createdDispatch.id;
	};

	const startMarkProductionCompletedTask = async () => {
		try {
			expectedTaskStartsRef.current = salesIds.length;
			completedTaskStartsRef.current = 0;
			for (const salesId of salesIds) {
				salesControlTask.trigger(
					{
						taskName: "update-sales-control",
						payload: {
							meta: getTaskMeta(salesId),
							submitAll: {},
						} as UpdateSalesControl,
					},
					{
						intent: {
							name: "sales.mark-as-production-completed",
							version: 1,
							args: {
								salesIds: [salesId],
							},
						},
					},
				);
			}
			await invalidateOrders();
		} catch {
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
			for (const salesId of salesIds) {
				const dispatchId = await resolveDispatchId(salesId);
				salesControlTask.trigger(
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
								dispatchIds: [dispatchId],
							},
						},
					},
				);
			}
			await invalidateOrders();
		} catch {
			toast({
				title: "Unable to mark fulfilled",
				variant: "destructive",
			});
		}
	};

	const markProductionCompleted = async () => {
		const inventoryReady = await runInventoryMarkAsPreflight(
			"production_completed",
		);
		if (!inventoryReady) return;
		await startMarkProductionCompletedTask();
	};

	const markFulfilled = async () => {
		const inventoryReady = await runInventoryMarkAsPreflight("fulfilled");
		if (!inventoryReady) return;
		await startMarkFulfilledTask();
	};

	const resolveInventoryAndContinue = async () => {
		if (!inventoryPreflight) return;

		try {
			if (inventoryPreflight.action === "fulfilled") {
				const result = await autoResolveInventoryMarkAsMutation.mutateAsync({
					salesOrderIds: salesIds,
					action: inventoryPreflight.action,
				});

				if (!result.continueAllowed) {
					setInventoryPreflight(result.remainingPreflight);
					toast({
						title: "Inventory still needs review",
						description:
							"Inventory auto-resolution ran, but this order is not ready to continue.",
						variant: "destructive",
					});
					return;
				}

				setInventoryPreflight(null);
				toast({
					title: "Inventory work auto-created",
					description: `${result.approvedAllocationCount} allocation${
						result.approvedAllocationCount === 1 ? "" : "s"
					} approved, ${result.createdInboundShipmentCount} inbound${
						result.createdInboundShipmentCount === 1 ? "" : "s"
					} created, ${result.linkedDemandCount} demand row${
						result.linkedDemandCount === 1 ? "" : "s"
					} linked.`,
					variant: "success",
				});
				await startMarkFulfilledTask();
				return;
			}

			const result = await resolveInventoryMarkAsMutation.mutateAsync({
				salesOrderIds: salesIds,
				action: inventoryPreflight.action,
			});

			if (!result.continueAllowed) {
				setInventoryPreflight(result.remainingPreflight);
				toast({
					title: "Inventory still needs review",
					description:
						result.remainingPreflight.totals.unresolvableComponentCount > 0
							? "Some stock work is linked to inbound receiving or still needs allocation."
							: "Inventory was refreshed, but this order is not ready to continue yet.",
					variant: "destructive",
				});
				return;
			}

			setInventoryPreflight(null);
			toast({
				title: "Inventory marked available",
				description: `${result.cancelledDemandCount} pending demand row${
					result.cancelledDemandCount === 1 ? "" : "s"
				} resolved before continuing.`,
				variant: "success",
			});

			if (result.action === "production_completed") {
				await startMarkProductionCompletedTask();
			} else {
				await startMarkFulfilledTask();
			}
		} catch {
			toast({
				title: "Unable to resolve inventory",
				description: "Please review the Inventory tab before using Mark as.",
				variant: "destructive",
			});
		}
	};

	const items = (
		<>
			<SalesMenuItem
				disabled={isDisabled || preflightLoadingAction !== null}
				onSelect={(event) => {
					event.preventDefault();
					void markProductionCompleted();
				}}
			>
				Production completed
			</SalesMenuItem>
			<SalesMenuItem
				disabled={isDisabled || preflightLoadingAction !== null}
				onSelect={(event) => {
					event.preventDefault();
					void markFulfilled();
				}}
			>
				Fulfilled
			</SalesMenuItem>
		</>
	);
	const blockerPreview = inventoryPreflight?.blockers.slice(0, 4) || [];
	const canResolveInventoryAndContinue = Boolean(
		inventoryPreflight?.canResolveAndContinue,
	);
	const canAutoResolveFulfillment = inventoryPreflight?.action === "fulfilled";
	const isResolvingInventory =
		resolveInventoryMarkAsMutation.isPending ||
		autoResolveInventoryMarkAsMutation.isPending;
	const primaryInventoryActionLabel = canAutoResolveFulfillment
		? isResolvingInventory
			? "Resolving..."
			: inventoryPreflight?.totals.autoInboundQty ||
					inventoryPreflight?.totals.autoInboundDemandCount ||
					inventoryPreflight?.totals.openInboundQty
				? "Create inbound and continue"
				: "Resolve inventory and continue"
		: isResolvingInventory
			? "Resolving..."
			: "Mark available and continue";
	const dialog = (
		<AlertDialog
			open={Boolean(inventoryPreflight)}
			onOpenChange={(open) => {
				if (!open) setInventoryPreflight(null);
			}}
		>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Inventory needs attention</AlertDialog.Title>
					<AlertDialog.Description>
						{inventoryPreflight
							? `${markAsActionLabels[inventoryPreflight.action]} is paused because configured inventory still has unresolved stock work.`
							: "Configured inventory still has unresolved stock work."}
					</AlertDialog.Description>
				</AlertDialog.Header>
				{inventoryPreflight ? (
					<div className="space-y-3">
						<div className="grid gap-2 sm:grid-cols-3">
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Orders blocked
								</div>
								<div className="text-base font-semibold">
									{inventoryPreflight.blockedSaleCount}
								</div>
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Pending qty
								</div>
								<div className="text-base font-semibold">
									{formatInventoryQty(inventoryPreflight.totals.pendingQty)}
								</div>
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2">
								<div className="text-[11px] uppercase text-muted-foreground">
									Open inbound
								</div>
								<div className="text-base font-semibold">
									{formatInventoryQty(inventoryPreflight.totals.openInboundQty)}
								</div>
							</div>
						</div>
						<div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
							{canAutoResolveFulfillment
								? "Fulfillment will approve available allocation suggestions, create and assign inbound demand for remaining shortages, then continue Mark as Fulfilled."
								: canResolveInventoryAndContinue
									? "Only unlinked pending inbound demand will be marked available. Shipment-linked receiving and allocation work are not changed here."
									: "This inventory state cannot be safely marked available from Mark as. Resolve linked receiving or allocation work in the Inventory tab first."}
						</div>
						<div className="max-h-64 overflow-y-auto rounded-md border">
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
						disabled={
							(!canAutoResolveFulfillment && !canResolveInventoryAndContinue) ||
							isResolvingInventory
						}
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
	Separator: SalesMenuSeparator,
	Sub: SalesMenuSub,
	SubTrigger: SalesMenuSubTrigger,
	SubContent: SalesMenuSubContent,
});
