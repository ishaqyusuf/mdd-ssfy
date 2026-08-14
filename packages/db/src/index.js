// export * from "drizzle-orm/sql";
// export { alias } from "drizzle-orm/pg-core";
/* eslint-disable no-restricted-properties */
// Solution for prisma edge: @link https://github.com/prisma/prisma/issues/22050#issuecomment-1821208388
import { PayoutStatus, Prisma, PrismaClient, SalesPriority,
// } from "../node_modules/.prisma/client/client.js";
 } from "@prisma/client";
import { applyDefaultSoftDeleteFilter } from "./soft-delete";
import { DEFAULT_DB_TRANSACTION_OPTIONS } from "./transactions";
// export {
//   Prisma,
//   PrismaClient,
//   SalesPriority,
//   PayoutStatus,
//   type Roles,
//   type Users,
// } from "../node_modules/.prisma/client/client.js";
export { Prisma, PrismaClient, SalesPriority, PayoutStatus, };
// export type  = Prisma.GetPayload<undefined>;
const prismaClientSingleton = () => {
    const client = new PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? [
                // "query",
                "error",
                "warn",
            ]
            : ["error"],
        transactionOptions: DEFAULT_DB_TRANSACTION_OPTIONS,
    });
    return client.$extends({
        query: {
            $allModels: {
                // async $allOperations({args,operation})
                // {
                // },
                async findFirst({ model, operation, args, query }) {
                    if (!args)
                        args = { where: {} };
                    return query(applyDefaultSoftDeleteFilter(client, model, args));
                },
                async findMany({ model, operation, args, query }) {
                    if (!args)
                        args = { where: {} };
                    return query(applyDefaultSoftDeleteFilter(client, model, args));
                },
            },
        },
    });
};
const globalForPrisma = globalThis;
// globalForPrisma.prisma?.users.findMany({
//   where: {
//   }
// })
export const db = globalForPrisma.prisma || prismaClientSingleton();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
