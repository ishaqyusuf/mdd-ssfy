import { createTRPCRouter, publicProcedure } from "../init";
import z from "zod";
import {
  generatePrintData,
  modelPrintSchema,
} from "@community/generate-print-data";

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
});
