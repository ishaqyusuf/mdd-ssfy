import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import Link from "@/components/link";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { openLink } from "@/lib/open-link";
import { downloadSalesDocument, quickPrint } from "@/lib/quick-print";
import { newSalesHelper } from "@/lib/sales";
import { useTRPC } from "@/trpc/client";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import type { PrintMode } from "@gnd/sales/print/types";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu } from "@gnd/ui/namespace";
import { ToastAction } from "@gnd/ui/toast";
import type { SalesType } from "@sales/types";
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

type SalesMenuState = {
	id?: number;
	slug?: string;
	type?: SalesType;
	salesIds: number[];
};

type SalesMenuActions = {
	closeMenu: () => void;
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
		};
	}, [id, salesIds, slug, type]);

	const actions = useMemo<SalesMenuActions>(
		() => ({
			closeMenu() {
				setOpen(false);
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
		</SalesMenuContext.Provider>
	);
}

type ActionProps = {
	disabled?: boolean;
};

type EmailOptions = {
	withPayment?: boolean;
	partPayment?: boolean;
};

function useSendSalesEmailAction() {
	const { state, actions } = useSalesMenuContext();
	const isQuote = state.type === "quote";
	const [didSucceed, setDidSucceed] = useState(false);
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
			setDidSucceed(false);
			notification.simpleSalesDocumentEmail({
				emailType: options.withPayment
					? options.partPayment
						? "with part payment"
						: "with payment"
					: "with payment",
				printType: isQuote ? "quote" : "order",
				salesIds: state.id ? [state.id] : state.salesIds,
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
};

function useSalesPrintAction() {
	const { state, actions } = useSalesMenuContext();

	return async function runPrint(
		params?: SalesPrintProps,
		options?: PrintActionProps,
	) {
		if (!state.salesIds.length) return;
		const mode = resolvePrintMode(params?.mode, state.type);

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
			await downloadSalesDocument({
				salesIds: state.salesIds,
				mode,
				dispatchId,
			});
		} else {
			actions.closeMenu();
			await quickPrint({
				salesIds: state.salesIds,
				mode,
				dispatchId,
			});
			return;
		}
		actions.closeMenu();
	};
}

function resolvePrintMode(
	mode: SalesPrintProps["mode"] | undefined,
	type: SalesType | undefined,
): PrintMode {
	switch (mode) {
		case "quote":
			return "quote";
		case "production":
			return "production";
		case "packing list":
			return "packing-slip";
		case "order-packing":
			return "order-packing";
		case "order":
			return "invoice";
		default:
			return type === "quote" ? "quote" : "invoice";
	}
}

const ORDER_MODES: { label: string; mode: PrintMode }[] = [
	{ label: "Order & Packing", mode: "order-packing" },
	{ label: "Order", mode: "invoice" },
	{ label: "Packing", mode: "packing-slip" },
	{ label: "Production", mode: "production" },
];

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

	if (isQuote) {
		return (
			<DropdownMenu.Item
				disabled={disabled || !state.salesIds.length}
				onSelect={(e) => {
					e.preventDefault();
					void runPrint({ mode: "quote" }, { pdf: false });
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
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(
							{ mode: "order-packing", dispatchId: "all" },
							{ pdf: false },
						);
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order & Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(undefined, { pdf: false });
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "packing list" }, { pdf: false });
					}}
				>
					<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
					Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "production" }, { pdf: false });
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

function SalesMenuItem(props: ComponentProps<typeof DropdownMenu.Item>) {
	return <DropdownMenu.Item {...props} />;
}

/**
 * V2 print sub-menu using quickPrint. Reads salesIds + type from context.
 * For quotes: single Print item. For orders: sub-menu with all 4 modes.
 */
function SalesMenuPrintModes({ disabled }: ActionProps) {
	const { state, actions } = useSalesMenuContext();
	const isDisabled = disabled || !state.salesIds.length;
	const isQuote = state.type === "quote";

	if (isQuote) {
		return (
			<DropdownMenu.Item
				disabled={isDisabled}
				onSelect={(e) => {
					e.preventDefault();
					actions.closeMenu();
					void quickPrint({ salesIds: state.salesIds, mode: "quote" });
				}}
			>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={isDisabled}>
				<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
				<span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
					v2
				</span>
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent>
				{ORDER_MODES.map(({ label, mode }) => (
					<DropdownMenu.Item
						key={mode}
						onSelect={(e) => {
							e.preventDefault();
							actions.closeMenu();
							void quickPrint({ salesIds: state.salesIds, mode });
						}}
					>
						<Icons.Printer className="mr-2 size-4 text-muted-foreground/70" />
						{label}
					</DropdownMenu.Item>
				))}
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
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
			<SalesMenuNotifications disabled={disabled} />
			<SalesMenuPaymentNotifications disabled={disabled} />
		</>
	);
}

function SalesMenuQuoteEmailMenuItems({ disabled }: ActionProps) {
	return <SalesMenuNotifications disabled={disabled} />;
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
	PrintModes: SalesMenuPrintModes,
	SalesPrintMenuItems: SalesMenuSalesPrintMenuItems,
	QuotePrintMenuItems: SalesMenuQuotePrintMenuItems,
	Notifications: SalesMenuNotifications,
	PaymentNotifications: SalesMenuPaymentNotifications,
	SalesEmailMenuItems: SalesMenuSalesEmailMenuItems,
	QuoteEmailMenuItems: SalesMenuQuoteEmailMenuItems,
	Delete: SalesMenuDelete,
	Item: SalesMenuItem,
	Separator: SalesMenuSeparator,
	Sub: SalesMenuSub,
	SubTrigger: SalesMenuSubTrigger,
	SubContent: SalesMenuSubContent,
});
