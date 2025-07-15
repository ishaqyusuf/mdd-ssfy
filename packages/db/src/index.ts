// export * from "drizzle-orm/sql";
// export { alias } from "drizzle-orm/pg-core";
/* eslint-disable no-restricted-properties */

// Solution for prisma edge: @link https://github.com/prisma/prisma/issues/22050#issuecomment-1821208388

// import { withAccelerate } from "@prisma/extension-accelerate";

import { PrismaClient, Prisma } from "@prisma/client";
export {
  Prisma,
  PrismaClient,
  SalesPriority,
  PayoutStatus,
} from "@prisma/client";
export type { Roles, Users } from "@prisma/client";

export type AddressBooks = Prisma.AddressBooksGetPayload<undefined>;
export type ComponentPrice = Prisma.ComponentPriceGetPayload<undefined>;
export type DykeStepForm = Prisma.DykeStepFormGetPayload<undefined>;
export type DykeSteps = Prisma.DykeStepsGetPayload<undefined>;
export type SalesStat = Prisma.SalesStatGetPayload<undefined>;
export type Customers = Prisma.CustomersGetPayload<undefined>;
export type CustomerTypes = Prisma.CustomerTypesGetPayload<undefined>;
export type SalesPayments = Prisma.SalesPaymentsGetPayload<undefined>;
export type SalesOrders = Prisma.SalesOrdersGetPayload<undefined>;
export type JobPayments = Prisma.JobPaymentsGetPayload<undefined>;
export type Notifications = Prisma.NotificationsGetPayload<undefined>;
export type WorkOrders = Prisma.WorkOrdersGetPayload<undefined>;
export type SalesOrderItems = Prisma.SalesOrderItemsGetPayload<undefined>;
export type DykeSalesDoors = Prisma.DykeSalesDoorsGetPayload<undefined>;
export type DykeShelfProducts = Prisma.DykeShelfProductsGetPayload<undefined>;
export type OrderProductionSubmissions =
  Prisma.OrderProductionSubmissionsGetPayload<undefined>;
export type OrderItemProductionAssignments =
  Prisma.OrderItemProductionAssignmentsGetPayload<undefined>;
export type DykeShelfCategories =
  Prisma.DykeShelfCategoriesGetPayload<undefined>;
export type DykeSalesShelfItem = Prisma.DykeSalesShelfItemGetPayload<undefined>;
export type Builders = Prisma.BuildersGetPayload<undefined>;
export type EmployeeProfile = Prisma.EmployeeProfileGetPayload<undefined>;
export type Projects = Prisma.ProjectsGetPayload<undefined>;
export type Inbox = Prisma.InboxGetPayload<undefined>;
export type CustomerWallet = Prisma.CustomerWalletGetPayload<undefined>;
export type Settings = Prisma.SettingsGetPayload<undefined>;
export type UserDocuments = Prisma.UserDocumentsGetPayload<undefined>;
export type Jobs = Prisma.JobsGetPayload<undefined>;
export type Homes = Prisma.HomesGetPayload<undefined>;
export type Taxes = Prisma.TaxesGetPayload<undefined>;
export type Progress = Prisma.ProgressGetPayload<undefined>;
export type SalesPickup = Prisma.SalesPickupGetPayload<undefined>;
export type CommunityModelCost = Prisma.CommunityModelCostGetPayload<undefined>;
export type CommunityModelPivot =
  Prisma.CommunityModelPivotGetPayload<undefined>;
export type CommunityModels = Prisma.CommunityModelsGetPayload<undefined>;
export type CostCharts = Prisma.CostChartsGetPayload<undefined>;
export type HomeTasks = Prisma.HomeTasksGetPayload<undefined>;
export type HomeTemplates = Prisma.HomeTemplatesGetPayload<undefined>;
export type Invoices = Prisma.InvoicesGetPayload<undefined>;
export type HousePackageTools = Prisma.HousePackageToolsGetPayload<undefined>;
export type DykeProducts = Prisma.DykeProductsGetPayload<undefined>;
export type DykeStepProducts = Prisma.DykeStepProductsGetPayload<undefined>;
export type DykeDoors = Prisma.DykeDoorsGetPayload<undefined>;
export type MailGrids = Prisma.MailGridsGetPayload<undefined>;
export type SalesItemControl = Prisma.SalesItemControlGetPayload<undefined>;
// export type  = Prisma.GetPayload<undefined>;

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            // "query",
            "error",
            "warn",
          ]
        : ["error"],
  }).$extends({
    query: {
      $allModels: {
        // async $allOperations({args,operation})
        // {
        // },
        async findFirst({ model, operation, args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt"))
            args.where = { deletedAt: null, ...args.where };
          // args.where = {};
          // console.log(args.where);
          return query(args);
        },
        async findMany({ model, operation, args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt"))
            args.where = { deletedAt: null, ...args.where };
          // args.where.deletedAt = null;

          // args.where = {};
          // console.log(args.where);
          return query(args);
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};
// globalForPrisma.prisma?.users.findMany({
//   where: {

//   }
// })
export const db = globalForPrisma.prisma || prismaClientSingleton();
export type Database = typeof db;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
