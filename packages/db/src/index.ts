// export * from "drizzle-orm/sql";
// export { alias } from "drizzle-orm/pg-core";
/* eslint-disable no-restricted-properties */

// Solution for prisma edge: @link https://github.com/prisma/prisma/issues/22050#issuecomment-1821208388
// import { PrismaClient } from "@prisma/client/edge";
// import { withAccelerate } from "@prisma/extension-accelerate";

import { PrismaClient } from "@prisma/client";

// import { Prisma, PrismaClient } from "../generated/client";

export * from "@prisma/client";
// export * from "../generated/client";
// export { Prisma, PrismaClient };
// export { PrismaClient, Prisma };
// Learn more about instantiating PrismaClient in Next.js here: https://www.prisma.io/docs/data-platform/accelerate/getting-started
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
