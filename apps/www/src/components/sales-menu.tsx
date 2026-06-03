import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import Link from "@/components/link";
import { SalesDocumentEmailDialog } from "@/components/sales-document-email-dialog";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { openLink } from "@/lib/open-link";
import { newSalesHelper } from "@/lib/sales";
import { resolveSalesPrintMode } from "@/modules/sales-print/application/sales-print-service";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTestEmailMode } from "@/store/test-email-mode";
import { useTRPC } from "@/trpc/client";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import type { UpdateSalesControl } from "@sales/schema";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu } from "@gnd/ui/namespace";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
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
					if (as === "order") {
						sq.invalidate.salesList();
					} else {
						sq.invalidate.quoteList();
					}
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
					sq.invalidate.salesList();
					sq.invalidate.quoteList();
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
		errorToast: "Failed",
		successToast: "Sent!",
		debug: true,
		onStarted() {
			actions.closeMenu();
		},
		onSuccess() {
			setDidSucceed(true);
		},
		onError() {
			actions.closeMenu();
		},
	});

	return {
		didSucceed,
		isPending: notification.isActionPending,
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
			const sp = newSalesHelper();
			await sp.generateTokenSalesIds(
				state.salesIds,
				params?.mode || state.type || "order",
			);
			await sp.share(
				`Hello! download your sales ${sp.shareUrl}`,
				"+234 8186877306",
			);
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
			onSuccess: () => {
				if (state.type === "order") {
					sq.invalidate.salesList();
				} else {
					sq.invalidate.quoteList();
				}
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
	const loader = useLoadingToast();
	const trpc = useTRPC();
	const sq = useSalesQueryClient();
	const salesIds = state.salesIds;
	const isDisabled = disabled || !salesIds.length;
	const createDispatchMutation = useMutation(
		trpc.dispatch.createDispatch.mutationOptions(),
	);
	const invalidateOrders = async () => {
		await Promise.all([
			sq.invalidate.salesList(),
			sq.invalidate.productionOverview(),
			sq.invalidate.saleOverview(),
			sq.qc.invalidateQueries({
				queryKey: trpc.sales.getOrdersV2.infiniteQueryKey(),
			}),
			sq.qc.invalidateQueries({
				queryKey: trpc.sales.getOrdersV2Summary.queryKey(),
			}),
		]);
	};
	const salesControlTask = useTaskTrigger({
		successToast: "Sales control updated",
		errorToast: "Unable to update sales control",
		executingToast: "Updating sales control...",
		monitor: true,
		onStarted() {
			void invalidateOrders();
		},
		onSuccess() {
			void invalidateOrders();
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

	const markProductionCompleted = async () => {
		actions.closeMenu();
		loader.loading("Marking as production completed...");
		try {
			for (const salesId of salesIds) {
				salesControlTask.trigger({
					taskName: "update-sales-control",
					payload: {
						meta: getTaskMeta(salesId),
						submitAll: {},
					} as UpdateSalesControl,
				});
			}
			await invalidateOrders();
			loader.success("Production completion task started");
		} catch {
			loader.error("Unable to mark production completed");
		}
	};

	const markFulfilled = async () => {
		actions.closeMenu();
		loader.loading("Marking as fulfilled...");
		try {
			for (const salesId of salesIds) {
				const dispatchId = await resolveDispatchId(salesId);
				salesControlTask.trigger({
					taskName: "update-sales-control",
					payload: {
						meta: getTaskMeta(salesId),
						markAsCompleted: {
							dispatchId,
							receivedBy: auth.name || "System",
							receivedDate: new Date(),
						},
					} as UpdateSalesControl,
				});
			}
			await invalidateOrders();
			loader.success("Fulfillment task started");
		} catch {
			loader.error("Unable to mark fulfilled");
		}
	};

	const items = (
		<>
			<SalesMenuItem disabled={isDisabled} onSelect={markProductionCompleted}>
				Production completed
			</SalesMenuItem>
			<SalesMenuItem disabled={isDisabled} onSelect={markFulfilled}>
				Fulfilled
			</SalesMenuItem>
		</>
	);

	if (!asSubmenu) {
		return items;
	}

	return (
		<SalesMenuSub>
			<SalesMenuSubTrigger disabled={isDisabled}>
				<Icons.CheckCheck className="mr-2 size-4 text-muted-foreground/70" />
				Mark as
			</SalesMenuSubTrigger>
			<SalesMenuSubContent>{items}</SalesMenuSubContent>
		</SalesMenuSub>
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
	return (
		<>
			<SalesMenuPrint disabled={disabled} />
			<SalesMenuPDF disabled={disabled} />
		</>
	);
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
