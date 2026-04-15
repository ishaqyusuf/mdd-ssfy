"use strict";
// export * from "drizzle-orm/sql";
// export { alias } from "drizzle-orm/pg-core";
/* eslint-disable no-restricted-properties */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.PayoutStatus = exports.SalesPriority = exports.PrismaClient = exports.Prisma = void 0;
// Solution for prisma edge: @link https://github.com/prisma/prisma/issues/22050#issuecomment-1821208388
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
Object.defineProperty(exports, "SalesPriority", { enumerable: true, get: function () { return client_1.SalesPriority; } });
Object.defineProperty(exports, "PayoutStatus", { enumerable: true, get: function () { return client_1.PayoutStatus; } });
// export type  = Prisma.GetPayload<undefined>;
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
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
                    if (!args)
                        args = { where: {} };
                    if (!args.where)
                        args.where = {};
                    if (!Object.keys(args.where).includes("deletedAt"))
                        args.where = { deletedAt: null, ...args.where };
                    // args.where = {};
                    return query(args);
                },
                async findMany({ model, operation, args, query }) {
                    if (!args)
                        args = { where: {} };
                    if (!args.where)
                        args.where = {};
                    if (!Object.keys(args.where).includes("deletedAt"))
                        args.where = { deletedAt: null, ...args.where };
                    // args.where.deletedAt = null;
                    // args.where = {};
                    return query(args);
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
exports.db = globalForPrisma.prisma || prismaClientSingleton();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.db;
}
