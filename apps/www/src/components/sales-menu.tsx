import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import {
	copySalesUseCase,
	moveOrderUseCase,
} from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import Link from "@/components/link";
import { SalesPaymentNotificationsMenu } from "@/components/sales-payment-notifications-menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { openLink } from "@/lib/open-link";
import { newSalesHelper } from "@/lib/sales";
import { useTRPC } from "@/trpc/client";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import { salesFormUrl } from "@/utils/sales-utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu } from "@gnd/ui/namespace";
import { ToastAction } from "@gnd/ui/toast";
import type { SendSalesEmailPayload, TaskName } from "@jobs/schema";
import type { SalesType } from "@sales/types";
import { useMutation } from "@tanstack/react-query";
import {
	Check,
	Copy,
	FileText,
	Mail,
	Move,
	Printer,
	Share2,
	Trash2,
} from "lucide-react";
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

	const state = useMemo<SalesMenuState>(() => {
		const resolvedType = type ?? "order";
		const resolvedIds = salesIds && salesIds.length ? salesIds : id ? [id] : [];

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
				if (!state.slug) return;
				loader.display({ title: "Copying..." } as any);
				const result = await copySalesUseCase(
					state.slug,
					as as any,
					state.type,
				);

				try {
					if (as === "order") {
						await resetSalesStatAction(result.id, state.slug);
					}
				} catch {
					// reset failure should not block copy completion
				}

				if (result.link) {
					loader.success(`Copied as ${as}`, {
						duration: 3000,
						action: (
							<ToastAction
								onClick={() => {
									openLink(salesFormUrl(as, result.data?.slug), {}, true);
								}}
								altText="edit"
							>
								Edit
							</ToastAction>
						),
					});
					if (as === "order") {
						sq.invalidate.salesList();
					} else {
						sq.invalidate.quoteList();
					}
					setOpen(false);
				}
			},
			async move() {
				if (!state.slug || !state.type) return;

				loader.loading("Moving...");
				const to: SalesType = state.type === "order" ? "quote" : "order";
				const result = await moveOrderUseCase(state.slug, to);

				if (to === "order") {
					await resetSalesStatAction(result.id, result.slug);
				}

				if (result.link) {
					loader.success(`Moved to ${to}`, {
						duration: 3000,
						action: (
							<ToastAction altText="Open" asChild>
								<Link href={result.link}>Open</Link>
							</ToastAction>
						),
					});
					sq.invalidate.salesList();
					sq.invalidate.quoteList();
					setOpen(false);
				}
			},
		}),
		[loader, setOpen, sq, state.slug, state.type],
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
	const trig = useTaskTrigger({
		executingToast: "Sending email...",
		errorToast: "Failed",
		successToast: "Sent!",
		debug: true,
		onSuccess() {
			actions.closeMenu();
		},
		onError() {
			actions.closeMenu();
		},
	});

	return function sendEmail(options: EmailOptions = {}) {
		const payload: SendSalesEmailPayload = {
			emailType: options.withPayment
				? options.partPayment
					? "with part payment"
					: "with payment"
				: "without payment",
			printType: isQuote ? "quote" : "order",
			salesIds: state.id ? [state.id] : state.salesIds,
		};

		trig.trigger({
			taskName: "send-sales-email" as TaskName,
			payload,
		});
	};
}

function SalesMenuCopy({ disabled }: ActionProps) {
	const { actions, state } = useSalesMenuContext();

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.slug}>
				<Copy className="mr-2 size-4 text-muted-foreground/70" />
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

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.slug || !state.type}
			onSelect={(e) => {
				e.preventDefault();
				void actions.move();
			}}
		>
			<Move className="mr-2 size-4 text-muted-foreground/70" />
			{state.type === "order" ? "Move to Quote" : "Move to Sales"}
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

		const sp = newSalesHelper();
		await sp.generateTokenSalesIds(
			state.salesIds,
			params?.mode || state.type || "order",
		);

		if (options?.share) {
			await sp.share(
				`Hello! download your sales ${sp.shareUrl}`,
				"+234 8186877306",
			);
			return;
		}

		sp.openPrintLink(options?.pdf);
		actions.closeMenu();
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
			<Share2 className="mr-2 size-4 text-muted-foreground/70" />
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
				<Printer className="mr-2 size-4 text-muted-foreground/70" />
				Print
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.salesIds.length}>
				<Printer className="mr-2 size-4 text-muted-foreground/70" />
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
					<Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order & Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(undefined, { pdf: false });
					}}
				>
					<Printer className="mr-2 size-4 text-muted-foreground/70" />
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "packing list" }, { pdf: false });
					}}
				>
					<Printer className="mr-2 size-4 text-muted-foreground/70" />
					Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "production" }, { pdf: false });
					}}
				>
					<Printer className="mr-2 size-4 text-muted-foreground/70" />
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
				<FileText className="mr-2 size-4 text-muted-foreground/70" />
				PDF
			</DropdownMenu.Item>
		);
	}

	return (
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger disabled={disabled || !state.salesIds.length}>
				<FileText className="mr-2 size-4 text-muted-foreground/70" />
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
					<FileText className="mr-2 size-4 text-muted-foreground/70" />
					Order & Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint(undefined, { pdf: true });
					}}
				>
					<FileText className="mr-2 size-4 text-muted-foreground/70" />
					Order
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "packing list" }, { pdf: true });
					}}
				>
					<FileText className="mr-2 size-4 text-muted-foreground/70" />
					Packing
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={(e) => {
						e.preventDefault();
						void runPrint({ mode: "production" }, { pdf: true });
					}}
				>
					<FileText className="mr-2 size-4 text-muted-foreground/70" />
					Production
				</DropdownMenu.Item>
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
	);
}

function SalesMenuNotifications({ disabled }: ActionProps) {
	const sendEmail = useSendSalesEmailAction();
	const { state } = useSalesMenuContext();
	const isQuote = state.type === "quote";

	return (
		<DropdownMenu.Item
			disabled={disabled || !state.salesIds.length}
			onSelect={(e) => {
				e.preventDefault();
				sendEmail({ withPayment: false });
			}}
		>
			<Mail className="mr-2 size-4 text-muted-foreground/70" />
			{isQuote ? "Quote Email" : "Invoice Email"}
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
				<Check className="mr-2 size-4" />
			) : (
				<Trash2 className="mr-2 size-4" />
			)}
			{confirm ? "Sure?" : "Delete"}
		</DropdownMenu.Item>
	);
}

function SalesMenuItem(props: ComponentProps<typeof DropdownMenu.Item>) {
	return <DropdownMenu.Item {...props} />;
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
	Notifications: SalesMenuNotifications,
	PaymentNotifications: SalesMenuPaymentNotifications,
	Delete: SalesMenuDelete,
	Item: SalesMenuItem,
	Separator: SalesMenuSeparator,
	Sub: SalesMenuSub,
	SubTrigger: SalesMenuSubTrigger,
	SubContent: SalesMenuSubContent,
});
