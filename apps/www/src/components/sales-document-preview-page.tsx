"use client";

import { useAuth } from "@/hooks/use-auth";
import { getBaseUrl } from "@/lib/base-url";
import { openLink } from "@/lib/open-link";
import {
	buildSalesDocumentRouteFromQuery,
	buildSalesPdfDownloadUrlFromQuery,
} from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import { SalesHtmlDocument } from "@gnd/pdf/sales-v2";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";

export function SalesDocumentPreviewPage({
	pt,
	token,
	accessToken,
	snapshotId,
	templateId = "template-2",
	embedded = false,
}: {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	templateId?: string;
	embedded?: boolean;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const router = useRouter();
	const baseUrl = getBaseUrl();
	const { data, isPending } = useQuery(
		trpc.print.salesV2.queryOptions(
			{
				pt,
				token,
				accessToken,
				snapshotId,
				preview: true,
				templateId,
				baseUrl,
			},
			{
				enabled: Boolean(pt || token || accessToken || snapshotId),
			},
		),
	);

	const packingSlipPage =
		data?.pages.find((page) => page.config.mode === "packing-slip") || null;
	const pdfPageQuery = useMemo(() => {
		if (!hasDocumentLocator({ pt, token, accessToken, snapshotId })) {
			return null;
		}
		return buildSalesPdfDownloadUrlFromQuery({
			pt,
			token,
			accessToken,
			snapshotId,
			templateId,
			origin: window.location.origin,
		});
	}, [accessToken, pt, snapshotId, templateId, token]);
	const pdfPrintPageQuery = useMemo(() => {
		if (!hasDocumentLocator({ pt, token, accessToken, snapshotId })) {
			return null;
		}
		return buildSalesDocumentRouteFromQuery({
			pt,
			token,
			accessToken,
			snapshotId,
			preview: false,
			templateId,
			origin: window.location.origin,
		});
	}, [accessToken, pt, snapshotId, templateId, token]);
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

	useEffect(() => {
		if (embedded || auth.isPending || !auth.can?.editSales || !editSalesUrl) {
			return;
		}
		router.replace(editSalesUrl);
	}, [auth.can?.editSales, auth.isPending, editSalesUrl, embedded, router]);

	if (isPending) {
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
						<Button
							variant="outline"
							onClick={() => {
								if (!pdfPrintPageQuery) return;
								openLink(pdfPrintPageQuery, null, true);
							}}
						>
							<Icons.Printer className="mr-2 size-4" />
							Print
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								if (!pdfPageQuery) return;
								openLink(pdfPageQuery, null, true);
							}}
						>
							<Icons.File className="mr-2 size-4" />
							PDF
						</Button>
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

				<SalesHtmlDocument
					pages={data.pages}
					templateId={data.templateId}
					companyAddress={data.companyAddress}
					baseUrl={baseUrl}
					previewUrl={data.previewUrl}
					qrCodeDataUrl={data.qrCodeDataUrl}
				/>
			</div>

			<PackingSlipSignFab
				page={packingSlipPage}
				pt={pt}
				token={token}
				accessToken={accessToken}
				snapshotId={snapshotId}
				preview
				templateId={templateId}
			/>
		</>
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
