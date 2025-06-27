import { TaskPageQuery } from "@/type";
import { Prisma } from "@gnd/db";
import { composeQuery } from "./query-response";

export function whereTasks(query: TaskPageQuery) {
  const where: Prisma.BacklogsWhereInput[] = [];
  return composeQuery(where);
}
