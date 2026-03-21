import { createTRPCRouter, publicProcedure } from "../init";
import z from "zod";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  generatePrintData,
  modelPrintSchema,
} from "@community/generate-print-data";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";

import { generateLegacyPrintData } from "@sales/print-legacy-format";
import { getPrintData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";

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

      // if (!payload) notFound();

      const printData = await generateLegacyPrintData(props.ctx.db, payload!);

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

      const { pages, title } = await getPrintData(props.ctx.db, {
        ids: payload.salesIds,
        mode,
        dispatchId: payload.dispatchId ?? null,
      });

      // Resolve company address from first sale's orderId suffix
      const firstSale = await props.ctx.db.salesOrders.findFirst({
        where: { id: { in: payload.salesIds } },
        select: { orderId: true },
      });
      const orderId = firstSale?.orderId?.toLowerCase() ?? "";
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
});
