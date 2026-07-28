"use strict";
// export * from "drizzle-orm/sql";
// export { alias } from "drizzle-orm/pg-core";
/* eslint-disable no-restricted-properties */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.PayoutStatus = exports.SalesPriority = exports.PrismaClient = exports.Prisma = void 0;
// Solution for prisma edge: @link https://github.com/prisma/prisma/issues/22050#issuecomment-1821208388
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PayoutStatus", { enumerable: true, get: function () { return client_1.PayoutStatus; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "SalesPriority", { enumerable: true, get: function () { return client_1.SalesPriority; } });
const soft_delete_1 = require("./soft-delete");
// export type  = Prisma.GetPayload<undefined>;
const prismaClientSingleton = () => {
    const client = new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? [
                // "query",
                "error",
                "warn",
            ]
            : ["error"],
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
                    return query((0, soft_delete_1.applyDefaultSoftDeleteFilter)(client, model, args));
                },
                async findMany({ model, operation, args, query }) {
                    if (!args)
                        args = { where: {} };
                    return query((0, soft_delete_1.applyDefaultSoftDeleteFilter)(client, model, args));
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
