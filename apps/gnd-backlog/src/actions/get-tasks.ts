import { TaskPageQuery } from "@/type";
import { composeQueryData } from "@/utils/query-response";
import { whereTasks } from "@/utils/where-tasks";
import { db } from "@gnd/db";

export async function getTasks(query?: TaskPageQuery) {
  const model = db.backlogs;
  const { response, where, searchMeta } = await composeQueryData(
    query,
    whereTasks(query),
    model,
  );

  const tasks = await db.backlogs.findMany({
    where: {},
    ...searchMeta,
    select: {},
  });
  return await response(
    tasks.map((task) => {
      return task;
    }),
  );
}
