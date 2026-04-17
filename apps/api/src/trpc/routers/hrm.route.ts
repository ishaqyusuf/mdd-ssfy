import {
  deleteEmployee,
  getEmployeeFormData,
  getEmployees,
  getEmployeeOverview,
  resetEmployeePassword,
  saveEmployee,
} from "@api/db/queries/hrm";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  employeeFormSchema,
  employeesQueryParamsSchema,
  getEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import { z } from "zod";
import { createSiteAction } from "@api/db/queries/site-action";

export const hrmRoutes = createTRPCRouter({
  getEmployees: publicProcedure
    .input(employeesQueryParamsSchema)
    .query(async (props) => {
      return getEmployees(props.ctx, props.input);
    }),
  // getTechEmployees
  getDrivers: publicProcedure
    .input(employeesQueryParamsSchema)
    .query(async (props) => {
      props.input = {
        can: ["viewDelivery"],
        cannot: ["editOrders"],
      };
      const drivers = await getEmployees(props.ctx, props.input);
      return drivers?.data;
    }),
  getRoles: publicProcedure.query(async (props) => {
    return await props.ctx.db.roles.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
  getProfiles: publicProcedure.query(async (props) => {
    return await props.ctx.db.employeeProfile.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
  resetEmployeePassword: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .mutation(async (props) => {
      return resetEmployeePassword(props.ctx, props.input.userId);
    }),
  deleteEmployee: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .mutation(async (props) => {
      return deleteEmployee(props.ctx, props.input.userId);
    }),
  saveEmployee: publicProcedure
    .input(employeeFormSchema)
    .mutation(async (props) => {
      return saveEmployee(props.ctx, props.input);
    }),
  getEmployeeForm: publicProcedure
    .input(getEmployeeFormDataSchema)
    .query(async (props) => {
      return getEmployeeFormData(props.ctx, props.input);
    }),
  updateEmployeeProfile: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        profileId: z.number().nullable().optional(),
      }),
    )
    .mutation(async (props) => {
      const { userId: id, profileId } = props.input;
      const user = await props.ctx.db.users.update({
        where: {
          id,
        },
        data: {
          employeeProfileId: profileId ? profileId : null,
          // employeeProfile: {
          //   connect: {
          //     id: profileId!,
          //   }
          // }
        },
        select: {
          name: true,
          employeeProfile: true,
        },
      });
      await createSiteAction(props.ctx, {
        event: "edited",
        type: "employee-profile",
        meta: {
          description: `${user.name} profile updated to ${user.employeeProfile?.name}`,
        },
      });
    }),
  updateEmployeeRole: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        roleId: z.number(),
      }),
    )
    .mutation(async (props) => {
      const { userId: id, roleId } = props.input;
      const { db: prisma } = props.ctx;
      await prisma.modelHasRoles.deleteMany({
        where: {
          user: {
            id,
          },
        },
      });
      const user = await prisma.users.update({
        where: {
          id,
        },
        data: {
          // customerTypeId: profileId,
          roles: {
            create: {
              organization: {
                connect: { id: 1 },
              },
              role: {
                connect: {
                  id: roleId,
                },
              },
            },
          },
        },
        select: {
          name: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
      await createSiteAction(props.ctx, {
        event: "edited",
        type: "employee-role",
        meta: {
          description: `${user.name} role updated to ${user?.roles?.[0]?.role?.name}`,
          // description,
        },
      });
    }),
  getEmployeeOverview: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async (props) => {
      return getEmployeeOverview(props.ctx, props.input.id);
    }),
});
