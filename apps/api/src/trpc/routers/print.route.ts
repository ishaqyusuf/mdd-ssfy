import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
	getContractorPayoutPrintData,
	getJobsPrintData,
} from "@api/db/queries/jobs";
import {
	getUnitInvoiceAgingReport,
	getUnitInvoiceAgingReportSchema,
	getUnitInvoiceTaskDetailReport,
	getUnitInvoiceTaskDetailReportSchema,
} from "@api/db/queries/unit-invoice-reports";
import { resolveSalesDocumentPreviewData } from "@api/utils/sales-document-access";
import {
	generatePrintData,
	modelPrintSchema,
} from "@community/generate-print-data";
import {
	getInventoryPrintDocumentData,
	printSalesV2Schema,
} from "@gnd/sales/print";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { generateLegacyPrintData } from "@sales/print-legacy-format";
import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

const requireFromHere = createRequire(import.meta.url);
const salesInventoryV2Schema = printSalesV2Schema.extend({
	templateId: z.string().optional().default("template-2"),
	preview: z.boolean().optional().default(false),
});

function humanizeSlug(value?: string | null) {
	if (!value) return null;
	return value
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatCommunityInvoiceFilterSummary(payload: {
	q?: string | null;
	builderSlug?: string | null;
	projectSlug?: string | null;
	production?: string | null;
	invoice?: string | null;
	installation?: string | null;
	dateRange?: Array<string | null | undefined> | null;
}) {
	const filters: string[] = [];

	if (payload.q) filters.push(`Search: ${payload.q}`);
	if (payload.builderSlug) {
		filters.push(`Builder: ${humanizeSlug(payload.builderSlug)}`);
	}
	if (payload.projectSlug) {
		filters.push(`Project: ${humanizeSlug(payload.projectSlug)}`);
	}
	if (payload.production) {
		filters.push(`Production: ${humanizeSlug(payload.production)}`);
	}
	if (payload.invoice) {
		filters.push(`Invoice: ${humanizeSlug(payload.invoice)}`);
	}
	if (payload.installation) {
		filters.push(`Installation: ${humanizeSlug(payload.installation)}`);
	}
	if (payload.dateRange?.length) {
		filters.push(
			`Date Range: ${payload.dateRange.filter(Boolean).join(" to ")}`,
		);
	}

	return filters;
}

export const printRouter = createTRPCRouter({
	modelTemplate: publicProcedure
		.input(modelPrintSchema)
		.query(async (props) => {
			const { homeIds, templateSlug, version, preview } = props.input;
			const printData = await generatePrintData(props.ctx.db, props.input);

			const title = printData.title.replace(/[^\w\-]+/g, "_")?.toUpperCase();
			return {
				...printData,
				title,
			};
		}),
	sales: publicProcedure
		.input(
			z.object({
				token: z.string(),
				preview: z.boolean().optional().default(false),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.salesPdfToken,
			);

			if (!payload) return null;

			const printData = await generateLegacyPrintData(props.ctx.db, payload);

			const title = printData.map((a) => a.orderNo).join("-");
			const safeTitle = title.replace(/[^\w\-]+/g, "_");
			const { preview } = props.input;
			const pages = printData.map((a) => a.pageData);
			// const watermark = await getGrayscaleWatermark();
			// return sales(props.ctx, props.input);
			return {
				pages,
				watermark: null,
				title: safeTitle,
				template: {
					size: "A4",
				},
			};
		}),
	salesV2: publicProcedure
		.input(
			z.object({
				pt: z.string().optional(),
				token: z.string().optional(),
				accessToken: z.string().optional(),
				snapshotId: z.string().optional(),
				preview: z.boolean().optional().default(false),
				templateId: z.string().optional().default("template-2"),
				pricingMode: z.enum(["customer", "internal"]).optional(),
				baseUrl: z.string().optional(),
			}),
		)
		.query(async (props) => {
			const startedAt = Date.now();
			console.info("[sales-print] print-data-query-start", {
				locator: props.input.pt
					? "public-token"
					: props.input.token
						? "legacy-token"
						: props.input.accessToken
							? "access-token"
							: props.input.snapshotId
								? "snapshot-id"
								: "missing",
				preview: props.input.preview,
				templateId: props.input.templateId,
			});
			try {
				const data = await resolveSalesDocumentPreviewData({
					db: props.ctx.db,
					publicToken: props.input.pt ?? null,
					token: props.input.token ?? null,
					accessToken: props.input.accessToken ?? null,
					snapshotId: props.input.snapshotId ?? null,
					templateId: props.input.templateId,
					pricingMode: props.input.pricingMode ?? null,
					baseUrl:
						props.input.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? null,
				});
				console.info("[sales-print] print-data-query-done", {
					durationMs: Date.now() - startedAt,
					pages: data?.pages.length ?? 0,
					title: data?.title ?? null,
				});
				return data;
			} catch (error) {
				console.error("[sales-print] print-data-query-error", {
					durationMs: Date.now() - startedAt,
					error: error instanceof Error ? error.message : error,
				});
				throw error;
			}
		}),
	salesInventoryV2: protectedProcedure
		.input(salesInventoryV2Schema)
		.query(async (props) => {
			const startedAt = Date.now();
			console.info("[sales-inventory-print] print-data-query-start", {
				ids: props.input.ids,
				mode: props.input.mode,
			});
			try {
				const data = await getInventoryPrintDocumentData(
					props.ctx.db,
					props.input,
				);
				const previewParams = new URLSearchParams({
					ids: props.input.ids.join(","),
					mode: props.input.mode,
					preview: "true",
				});
				if (props.input.templateId !== "template-2") {
					previewParams.set("templateId", props.input.templateId);
				}
				const previewUrl = props.input.ids.length
					? `/p/sales-inventory-v2?${previewParams.toString()}`
					: "";
				console.info("[sales-inventory-print] print-data-query-done", {
					durationMs: Date.now() - startedAt,
					pages: data.pages.length,
					title: data.title,
				});
				return {
					...data,
					templateId: props.input.templateId,
					watermark: null,
					previewUrl,
					qrCodeDataUrl: undefined,
				};
			} catch (error) {
				console.error("[sales-inventory-print] print-data-query-error", {
					durationMs: Date.now() - startedAt,
					error: error instanceof Error ? error.message : error,
				});
				throw error;
			}
		}),
	jobs: publicProcedure
		.input(
			z.object({
				token: z.string(),
				preview: z.boolean().optional().default(false),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.jobsPdfToken,
			);

			if (!payload) return null;

			return getJobsPrintData(props.ctx, {
				jobIds: payload.jobIds || undefined,
				context: payload.context || "jobs-page",
				scope: payload.scope || "selection",
			});
		}),
	contractorPayouts: publicProcedure
		.input(
			z.object({
				token: z.string(),
				preview: z.boolean().optional().default(false),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.payoutPdfToken,
			);

			if (!payload) return null;

			return getContractorPayoutPrintData(props.ctx, {
				paymentIds: payload.paymentIds,
			});
		}),
	communityInvoiceAgingReport: publicProcedure
		.input(
			z.object({
				token: z.string(),
				preview: z.boolean().optional().default(false),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.communityInvoiceAgingPdfToken,
			);

			if (!payload) return null;

			const filters = getUnitInvoiceAgingReportSchema.parse(payload);
			const report = await getUnitInvoiceAgingReport(props.ctx, filters);

			return {
				title: "Community_Invoice_Aging_Report",
				printedAt: new Date(),
				filters: payload,
				filterSummary: formatCommunityInvoiceFilterSummary(payload),
				...report,
			};
		}),
	communityInvoiceTaskDetailReport: publicProcedure
		.input(
			z.object({
				token: z.string(),
				preview: z.boolean().optional().default(false),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.communityInvoiceTaskDetailPdfToken,
			);

			if (!payload) return null;

			const filters = getUnitInvoiceTaskDetailReportSchema.parse(payload);
			const report = await getUnitInvoiceTaskDetailReport(props.ctx, filters);

			return {
				title: "Community_Invoice_Task_Detail_Report",
				printedAt: new Date(),
				filters: payload,
				filterSummary: formatCommunityInvoiceFilterSummary(payload),
				...report,
			};
		}),
});
