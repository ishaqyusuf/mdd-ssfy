import { publicProcedure } from "@api/trpc/init";
import z from "zod";

export const getOrganizationProfile = publicProcedure.query(async (props) => {
  const {
    ctx: { db },
    input,
  } = props;

  const orgs = await db.organization.findMany({});
  return {
    orgs,
  };
  //   const organizations = await
});

export const createOrganizationProfile = publicProcedure
  .input(z.object({}))
  .mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    return {};
  });
