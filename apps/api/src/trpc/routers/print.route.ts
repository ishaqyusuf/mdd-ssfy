import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
	getContractorPayoutPrintData,
	getJobsPrintData,
} from "@api/db/queries/jobs";
import {
	getUnitInvoiceAgingReport,
	getUnitInvoiceTaskDetailReport,
} from "@api/db/queries/unit-invoice-reports";
import {
	generatePrintData,
	modelPrintSchema,
} from "@community/generate-print-data";
import { getPrintData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { generateLegacyPrintData } from "@sales/print-legacy-format";
import z from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

const LEGACY_TO_V2_MODE: Record<string, PrintMode> = {
	order: "invoice",
	"packing list": "packing-slip",
	quote: "quote",
	production: "production",
	"order-packing": "order-packing",
	invoice: "invoice",
	"packing-slip": "packing-slip",
};

const MIAMI_ADDRESS = {
	address1: "13285 SW 131 ST",
	address2: "Miami, Fl 33186",
	phone: "305-278-6555",
	fax: "305-278-2003",
};
const LAKE_WALES_ADDRESS = {
	address1: "1750 Longleaf Blvd, Suite11",
	address2: "Lake Wales FL 33859",
	phone: "863-275-1011",
};

const requireFromHere = createRequire(import.meta.url);

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
				token: z.string(),
				preview: z.boolean().optional().default(false),
				templateId: z.string().optional().default("template-2"),
			}),
		)
		.query(async (props) => {
			const payload = await validateToken(
				props.input.token,
				tokenSchemas.salesPdfToken,
			);

			if (!payload) return null;

			const mode: PrintMode = LEGACY_TO_V2_MODE[payload.mode] ?? "invoice";

			const { pages, title, firstOrderId } = await getPrintData(props.ctx.db, {
				ids: payload.salesIds,
				mode,
				dispatchId: payload.dispatchId ?? null,
			});

			// Resolve company address from the first composed sale instead of re-querying.
			const orderId = firstOrderId?.toLowerCase() ?? "";
			const companyAddress = ["lrg", "vc"].some((s) => orderId.endsWith(s))
				? LAKE_WALES_ADDRESS
				: MIAMI_ADDRESS;

			return {
				pages,
				title: title.replace(/[^\w\-]+/g, "_"),
				templateId: props.input.templateId,
				companyAddress,
				watermark: null,
			};
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

			const report = await getUnitInvoiceAgingReport(props.ctx, payload);

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

			const report = await getUnitInvoiceTaskDetailReport(props.ctx, payload);

			return {
				title: "Community_Invoice_Task_Detail_Report",
				printedAt: new Date(),
				filters: payload,
				filterSummary: formatCommunityInvoiceFilterSummary(payload),
				...report,
			};
		}),
});
