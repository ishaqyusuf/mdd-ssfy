import { createTRPCRouter, publicProcedure } from "../init";
import z from "zod";
import {
  generatePrintData,
  modelPrintSchema,
} from "@community/generate-print-data";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";

import { generateLegacyPrintData } from "@sales/print-legacy-format";
import { consoleLog } from "@gnd/utils";
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
      consoleLog("PAYLOAD", printData!?.[0]?.pageData?.address);
      const title = printData.map((a) => a.orderNo).join("-");
      const safeTitle = title.replace(/[^\w\-]+/g, "_");
      const { preview } = props.input;
      const pages = printData.map((a) => a.pageData);
      const watermark = await (async () => {
        // try {
        //     const logoPath = path.join(process.cwd(), "public", "logo.png");
        //     const buffer = await sharp(logoPath).grayscale().toBuffer();
        //     return `data:image/png;base64,${buffer.toString("base64")}`;
        // } catch (error) {}
        return null;
      })();
      // return sales(props.ctx, props.input);
      return {
        pages,
        watermark,
        title: safeTitle,
        template: {
          size: "A4",
        },
      };
    }),
});
