"use client";

import { useAuth } from "@/hooks/use-auth";
import { getBaseUrl } from "@/lib/base-url";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { SalesHtmlDocument } from "@gnd/pdf/sales-v2";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { useMemo } from "react";
import { PackingSlipSignFab } from "./packing-slip-sign-fab";

export function SalesDocumentPreviewPage({
	token,
	accessToken,
	templateId = "template-2",
	embedded = false,
}: {
	token?: string;
	accessToken?: string;
	templateId?: string;
	embedded?: boolean;
}) {
	const trpc = useTRPC();
	const auth = useAuth();
	const { data, isPending } = useQuery(
		trpc.print.salesV2.queryOptions(
			{
				token,
				accessToken,
				preview: true,
				templateId,
			},
			{
				enabled: Boolean(token || accessToken),
			},
		),
	);

	const packingSlipPage =
		data?.pages.find((page) => page.config.mode === "packing-slip") || null;
	const pdfPageQuery = useMemo(() => {
		const query = new URLSearchParams({
			preview: "true",
			templateId,
		});
		if (token) query.set("token", token);
		if (accessToken) query.set("accessToken", accessToken);
		return `/p/sales-invoice-v2?${query.toString()}`;
	}, [accessToken, templateId, token]);
	const pdfPrintPageQuery = useMemo(() => {
		const query = new URLSearchParams({
			preview: "false",
			templateId,
		});
		if (token) query.set("token", token);
		if (accessToken) query.set("accessToken", accessToken);
		return `/p/sales-invoice-v2?${query.toString()}`;
	}, [accessToken, templateId, token]);
	const overviewUrl = useMemo(() => {
		if (!data?.orderNo) return null;
		const query = new URLSearchParams({
			overviewId: data.orderNo,
			overviewType: data.mode === "quote" ? "quote" : "sales",
			overviewMode: data.mode === "quote" ? "quote" : "sales",
		});
		return `/sales-book/orders/overview-v2?${query.toString()}`;
	}, [data?.mode, data?.orderNo]);

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
								openLink(pdfPrintPageQuery, null, true);
							}}
						>
							<Icons.Printer className="mr-2 size-4" />
							Print
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
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
					baseUrl={getBaseUrl()}
					previewUrl={data.previewUrl}
				/>
			</div>

			<PackingSlipSignFab
				page={packingSlipPage}
				token={token}
				accessToken={accessToken}
				preview
				templateId={templateId}
			/>
		</>
	);
}
