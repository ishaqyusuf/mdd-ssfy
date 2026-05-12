"use client";

import { useAuth } from "@/hooks/use-auth";
import { getBaseUrl } from "@/lib/base-url";
import { cn } from "@/lib/utils";
import { openLink } from "@/lib/open-link";
import {
	buildSalesDocumentRouteFromQuery,
	buildSalesPdfDownloadUrlFromQuery,
	downloadSalesPrintDocument,
	openSalesPrintDocument,
	regenerateSalesPrintDocument,
} from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import { SalesHtmlDocument } from "@gnd/pdf/sales-v2";
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useRouter } from "next/navigation";
import {
	type ComponentType,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";
import { SalesDocumentEmailDialog } from "./sales-document-email-dialog";

export function SalesDocumentPreviewPage({
	pt,
	token,
	accessToken,
	snapshotId,
	templateId = "template-2",
	embedded = false,
	customerEmail,
	customerName,
	salesOrderId,
	dispatchId,
	onClose,
}: {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	templateId?: string;
	embedded?: boolean;
	customerEmail?: string;
	customerName?: string;
	salesOrderId?: number | null;
	dispatchId?: number | null;
	onClose?: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const router = useRouter();
	const baseUrl = getBaseUrl();
	const [printing, setPrinting] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [regeneratedAccess, setRegeneratedAccess] =
		useState<ResolveSalesDocumentAccessResult | null>(null);
	const effectivePt = regeneratedAccess ? undefined : pt;
	const effectiveToken = regeneratedAccess ? undefined : token;
	const effectiveAccessToken = regeneratedAccess?.accessToken ?? accessToken;
	const effectiveSnapshotId = regeneratedAccess ? undefined : snapshotId;
	const { data, isPending } = useQuery(
		trpc.print.salesV2.queryOptions(
			{
				pt: effectivePt,
				token: effectiveToken,
				accessToken: effectiveAccessToken,
				snapshotId: effectiveSnapshotId,
				preview: true,
				templateId,
				baseUrl,
			},
			{
				enabled: Boolean(
					effectivePt ||
						effectiveToken ||
						effectiveAccessToken ||
						effectiveSnapshotId,
				),
			},
		),
	);

	const previewPages = (data?.pages ?? []) as PrintPage[];
	const packingSlipPage =
		previewPages.find((page) => page.config.mode === "packing-slip") || null;
	const pdfPageQuery = useMemo(() => {
		if (
			!hasDocumentLocator({
				pt: effectivePt,
				token: effectiveToken,
				accessToken: effectiveAccessToken,
				snapshotId: effectiveSnapshotId,
			})
		) {
			return null;
		}
		return buildSalesPdfDownloadUrlFromQuery({
			pt: effectivePt,
			token: effectiveToken,
			accessToken: effectiveAccessToken,
			snapshotId: effectiveSnapshotId,
			templateId,
			origin: baseUrl,
		});
	}, [
		baseUrl,
		effectiveAccessToken,
		effectivePt,
		effectiveSnapshotId,
		effectiveToken,
		templateId,
	]);
	const pdfPrintPageQuery = useMemo(() => {
		if (
			!hasDocumentLocator({
				pt: effectivePt,
				token: effectiveToken,
				accessToken: effectiveAccessToken,
				snapshotId: effectiveSnapshotId,
			})
		) {
			return null;
		}
		return buildSalesDocumentRouteFromQuery({
			pt: effectivePt,
			token: effectiveToken,
			accessToken: effectiveAccessToken,
			snapshotId: effectiveSnapshotId,
			preview: false,
			templateId,
			origin: baseUrl,
		});
	}, [
		baseUrl,
		effectiveAccessToken,
		effectivePt,
		effectiveSnapshotId,
		effectiveToken,
		templateId,
	]);
	const overviewUrl = useMemo(() => {
		if (!data?.orderNo) return null;
		const query = new URLSearchParams({
			overviewId: data.orderNo,
			overviewType: data.mode === "quote" ? "quote" : "sales",
			overviewMode: data.mode === "quote" ? "quote" : "sales",
		});
		return `/sales-book/orders/overview-v2?${query.toString()}`;
	}, [data?.mode, data?.orderNo]);
	const editSalesUrl = useMemo(() => {
		if (!data?.orderNo) return null;
		const salesType = data.mode === "quote" ? "quote" : "order";
		const query = new URLSearchParams({
			"sales-overview-id": data.orderNo,
			"sales-type": salesType,
			mode: salesType === "quote" ? "quote" : "sales",
			salesTab: "activity",
		});
		return `/sales-form/edit-${salesType}/${encodeURIComponent(data.orderNo)}?${query.toString()}`;
	}, [data?.mode, data?.orderNo]);
	const resolvedSalesOrderId = salesOrderId ?? data?.salesOrderId ?? null;
	const useSnapshotActions = embedded && !!resolvedSalesOrderId && !!data?.mode;
	const isSnapshotStale =
		data && "isStale" in data ? Boolean(data.isStale) : false;

	useEffect(() => {
		if (embedded || auth.isPending || !auth.can?.editSales || !editSalesUrl) {
			return;
		}
		router.replace(editSalesUrl);
	}, [auth.can?.editSales, auth.isPending, editSalesUrl, embedded, router]);

	async function handlePrint(event?: MouseEvent<HTMLButtonElement>) {
		if (useSnapshotActions && resolvedSalesOrderId && data?.mode) {
			setPrinting(true);
			try {
				await openSalesPrintDocument({
					salesIds: [resolvedSalesOrderId],
					mode: data.mode,
					dispatchId: dispatchId ?? null,
					templateId,
					openInNewTab: event?.shiftKey ?? false,
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Unable to prepare print.",
				);
			} finally {
				setPrinting(false);
			}
			return;
		}

		if (pdfPrintPageQuery) {
			openLink(pdfPrintPageQuery, null, true);
		}
	}

	async function handleDownloadPdf() {
		if (useSnapshotActions && resolvedSalesOrderId && data?.mode) {
			setDownloading(true);
			try {
				await downloadSalesPrintDocument({
					salesIds: [resolvedSalesOrderId],
					mode: data.mode,
					dispatchId: dispatchId ?? null,
					templateId,
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Unable to prepare PDF.",
				);
			} finally {
				setDownloading(false);
			}
			return;
		}

		if (pdfPageQuery) {
			openLink(pdfPageQuery, null, true);
		}
	}

	async function handleRegeneratePdf() {
		if (!resolvedSalesOrderId || !data?.mode) {
			toast.error("Unable to identify this sales document.");
			return;
		}

		setRegenerating(true);
		try {
			const access = await regenerateSalesPrintDocument({
				salesIds: [resolvedSalesOrderId],
				mode: data.mode,
				dispatchId: dispatchId ?? null,
				templateId,
				baseUrl,
			});
			setRegeneratedAccess(access);
			await queryClient.invalidateQueries({
				queryKey: trpc.print.salesV2.pathKey(),
			});
			toast.success("Latest PDF snapshot generated.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to regenerate PDF.",
			);
		} finally {
			setRegenerating(false);
		}
	}

	if (isPending) {
		if (embedded) {
			return (
				<SalesDocumentViewWrapper>
					<div className="w-full max-w-[920px] animate-pulse rounded-md border bg-background p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.28)]">
						<div className="h-8 w-48 rounded bg-muted" />
						<div className="mt-4 h-4 w-64 rounded bg-muted" />
						<div className="mt-8 h-[720px] rounded bg-muted" />
					</div>
				</SalesDocumentViewWrapper>
			);
		}

		return (
			<div className={embedded ? "px-0 py-0" : "mx-auto max-w-6xl px-4 py-10"}>
				<div className="animate-pulse rounded-3xl border bg-muted/30 p-10">
					<div className="h-8 w-48 rounded bg-muted" />
					<div className="mt-4 h-4 w-64 rounded bg-muted" />
					<div className="mt-8 h-[720px] rounded bg-muted" />
				</div>
			</div>
		);
	}

	if (!data) {
		if (embedded) {
			return (
				<SalesDocumentViewWrapper>
					<div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-lg">
						This preview link is invalid or has expired.
					</div>
				</SalesDocumentViewWrapper>
			);
		}

		return (
			<div
				className={
					embedded
						? "flex min-h-[60vh] items-center"
						: "mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-10"
				}
			>
				<div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
					This preview link is invalid or has expired.
				</div>
			</div>
		);
	}

	if (!embedded && auth.isPending) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-10">
				<div className="rounded-3xl border bg-muted/30 p-6 text-sm text-muted-foreground">
					Checking access...
				</div>
			</div>
		);
	}

	if (!embedded && auth.can?.editSales && editSalesUrl) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-10">
				<div className="rounded-3xl border bg-muted/30 p-6 text-sm text-muted-foreground">
					Redirecting to the editable sales workspace...
				</div>
			</div>
		);
	}

	const documentWidth = data.templateId === "template-2" ? 980 : 920;
	const document = (
		<SalesHtmlDocument
			pages={previewPages}
			templateId={data.templateId}
			companyAddress={data.companyAddress as CompanyAddress}
			baseUrl={baseUrl}
			previewUrl={data.previewUrl}
			qrCodeDataUrl={data.qrCodeDataUrl}
		/>
	);

	if (embedded) {
		return (
			<>
				<style jsx global>{`
					@media print {
						body {
							background: #fff !important;
						}
						.sales-preview-toolbar {
							display: none !important;
						}
						.sales-preview-shell {
							padding: 0 !important;
						}
					}
				`}</style>

				<SalesDocumentViewWrapper
					documentWidth={documentWidth}
					onBackgroundClick={onClose}
					toolbar={
						<SalesDocumentPreviewToolbar>
							{resolvedSalesOrderId ? (
								<SalesDocumentEmailDialog
									salesOrderId={resolvedSalesOrderId}
									mode={data.mode === "quote" ? "quote" : "invoice"}
									documentTitle={data.title}
									orderNo={data.orderNo}
									customerEmail={customerEmail}
									customerName={customerName}
									triggerVariant="icon"
								/>
							) : null}
							<ToolbarButton
								label={printing ? "Preparing print" : "Print"}
								icon={printing ? Icons.Loader2 : Icons.Printer}
								loading={printing}
								disabled={printing}
								onClick={(event) => {
									void handlePrint(event);
								}}
							/>
							<ToolbarButton
								label={downloading ? "Preparing PDF" : "PDF"}
								icon={downloading ? Icons.Loader2 : Icons.FileText}
								loading={downloading}
								disabled={downloading}
								onClick={() => {
									void handleDownloadPdf();
								}}
							/>
							{auth.can?.editSales && resolvedSalesOrderId ? (
								<ToolbarButton
									label={
										regenerating
											? "Regenerating"
											: isSnapshotStale
												? "Regenerate stale PDF"
												: "Regenerate"
									}
									icon={regenerating ? Icons.Loader2 : Icons.RefreshCw}
									loading={regenerating}
									disabled={regenerating}
									emphasis={isSnapshotStale}
									onClick={() => {
										void handleRegeneratePdf();
									}}
								/>
							) : null}
							{auth.can?.editOrders && overviewUrl ? (
								<ToolbarButton
									label="Open Overview"
									icon={Icons.ArrowUpRight}
									onClick={() => {
										openLink(overviewUrl, null, true);
									}}
								/>
							) : null}
							{onClose ? (
								<>
									<div className="mx-1 h-4 w-px bg-border" />
									<ToolbarButton label="Close" icon={Icons.X} onClick={onClose} />
								</>
							) : null}
						</SalesDocumentPreviewToolbar>
					}
				>
					<div
						className="w-full shadow-[0_24px_48px_-12px_rgba(15,23,42,0.32)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)] [&_.sales-html-document]:w-full"
						style={{ maxWidth: documentWidth }}
					>
						{document}
					</div>
				</SalesDocumentViewWrapper>

				<PackingSlipSignFab
					page={packingSlipPage}
					pt={effectivePt}
					token={effectiveToken}
					accessToken={effectiveAccessToken}
					snapshotId={effectiveSnapshotId}
					preview
					templateId={templateId}
				/>
			</>
		);
	}

	return (
		<>
			<style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          .sales-preview-actions {
            display: none !important;
          }
          .sales-preview-shell {
            padding: 0 !important;
          }
        }
      `}</style>

			<div
				className={
					embedded
						? "sales-preview-shell"
						: "sales-preview-shell mx-auto max-w-6xl px-4 py-6"
				}
			>
				<div
					className={
						embedded
							? "sales-preview-actions sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 p-4 shadow-sm backdrop-blur"
							: "sales-preview-actions sticky top-4 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/95 p-4 shadow-sm backdrop-blur"
					}
				>
					<div>
						<h1 className="text-lg font-semibold">{data.title}</h1>
						<p className="text-sm text-muted-foreground">
							HTML preview with PDF download.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{resolvedSalesOrderId ? (
							<SalesDocumentEmailDialog
								salesOrderId={resolvedSalesOrderId}
								mode={data.mode === "quote" ? "quote" : "invoice"}
								documentTitle={data.title}
								orderNo={data.orderNo}
								customerEmail={customerEmail}
								customerName={customerName}
							/>
						) : null}
						<Button
							variant="outline"
							onClick={(event) => {
								void handlePrint(event);
							}}
							disabled={printing}
						>
							{printing ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.Printer className="mr-2 size-4" />
							)}
							{printing ? "Preparing..." : "Print"}
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								void handleDownloadPdf();
							}}
							disabled={downloading}
						>
							{downloading ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.File className="mr-2 size-4" />
							)}
							{downloading ? "Preparing..." : "PDF"}
						</Button>
						{auth.can?.editSales && resolvedSalesOrderId ? (
							<Button
								variant={isSnapshotStale ? "default" : "outline"}
								onClick={() => {
									void handleRegeneratePdf();
								}}
								disabled={regenerating}
							>
								{regenerating ? (
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.RefreshCw className="mr-2 size-4" />
								)}
								{regenerating ? "Regenerating..." : "Regenerate"}
							</Button>
						) : null}
						{auth.can?.editOrders && overviewUrl ? (
							<Button
								onClick={() => {
									openLink(overviewUrl, null, true);
								}}
							>
								<Icons.ArrowUpRight className="mr-2 size-4" />
								Open Overview
							</Button>
						) : null}
					</div>
				</div>

				{document}
			</div>

			<PackingSlipSignFab
				page={packingSlipPage}
				pt={effectivePt}
				token={effectiveToken}
				accessToken={effectiveAccessToken}
				snapshotId={effectiveSnapshotId}
				preview
				templateId={templateId}
			/>
		</>
	);
}

function SalesDocumentViewWrapper({
	documentWidth = 960,
	toolbar,
	onBackgroundClick,
	children,
}: {
	documentWidth?: number;
	toolbar?: ReactNode;
	onBackgroundClick?: () => void;
	children: ReactNode;
}) {
	return (
		<div
			className="sales-preview-shell h-full min-h-0 overflow-y-auto bg-[#f8fafc] bg-[radial-gradient(circle_at_1px_1px,#e0e0e0_0.5px,transparent_0)] bg-[length:6px_6px] text-foreground dark:bg-[#080808] dark:bg-[radial-gradient(circle_at_1px_1px,#232323_0.5px,transparent_0)]"
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					onBackgroundClick?.();
				}
			}}
		>
			<div
				className="mx-auto flex min-h-[100dvh] w-full flex-col items-center px-3 pt-8 pb-28 sm:px-6 md:px-8"
				onClick={(event) => {
					if (event.target === event.currentTarget) {
						onBackgroundClick?.();
					}
				}}
			>
				<div className="flex w-full justify-center">{children}</div>
			</div>
			{toolbar}
		</div>
	);
}

function SalesDocumentPreviewToolbar({ children }: { children: ReactNode }) {
	return (
		<div className="sales-preview-toolbar fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
			<TooltipProvider delayDuration={0}>
				<div className="flex h-12 items-center gap-1 rounded-full border bg-background/85 px-2 shadow-[0_18px_42px_rgba(15,23,42,0.22)] backdrop-blur-xl">
					{children}
				</div>
			</TooltipProvider>
		</div>
	);
}

function ToolbarButton({
	label,
	icon: Icon,
	loading = false,
	disabled = false,
	emphasis = false,
	onClick,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	loading?: boolean;
	disabled?: boolean;
	emphasis?: boolean;
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant={emphasis ? "default" : "ghost"}
					size="icon"
					className={cn(
						"size-8 rounded-full",
						emphasis && "text-primary-foreground",
					)}
					disabled={disabled}
					onClick={onClick}
				>
					<Icon className={cn("size-4", loading && "animate-spin")} />
					<span className="sr-only">{label}</span>
				</Button>
			</TooltipTrigger>
			<TooltipContent
				sideOffset={14}
				className="rounded-none px-2 py-1 font-medium text-[10px]"
			>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

function hasDocumentLocator(input: {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
}) {
	return Boolean(
		input.pt || input.token || input.accessToken || input.snapshotId,
	);
}
