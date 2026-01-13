import { publicProcedure } from "@api/trpc/init";
import z from "zod";

export const getOrganizationProfile = publicProcedure.query(async (props) => {
  const {
    ctx: { db },
    input,
  } = props;
  const orgs = await db.organization.findMany({});
  // await db.modelHasRoles.updateMany({
  //   where: {
  //     organizationId: null,
  //   },
  //   data: {
  //     organizationId: orgs?.[0]?.id,
  //   },
  // });
  return {
    orgs: orgs.map((o) => ({
      ...o,
      employeesCount: 0,
    })),
  };
  //   const organizations = await
});

export const createOrganizationProfile = publicProcedure
  .input(
    z.object({
      name: z.string(),
      primary: z.boolean().optional().nullable(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const org = await db.organization.create({
      data: {
        name: input.name,
        primary: input.primary || false,
      },
    });

    return {};
  });
