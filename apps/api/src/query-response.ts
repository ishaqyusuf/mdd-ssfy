import type { PageDataMeta } from "./type";

export async function queryResponse<T>(
  data: T[],
  {
    query,
    model,
    where,
  }: {
    query?;
    model?;
    where?;
  },
) {
  let meta = {} as PageDataMeta;

  // where.deletedAt = null;
  if (model) {
    const count = await model.count({
      where,
    });
    const size = query?.size || 20;
    meta.count = count;
    let cursor = (+query?.cursor || 0) + size;
    // console.log({ cursor, count, where });
    meta.cursor = cursor < count ? String(cursor) : null;
    meta.hasNextPage = cursor < count;
    meta.hasPreviousePage = cursor > 0;
  }
  return {
    data,
    meta,
  };
}
export function queryMeta(query?: any) {
  const take = query.size ? Number(query.size) : 20;
  const { cursor = 0 } = query;
  const [sort, sortOrder = "desc"] = (query.sort || "createdAt").split(".");
  const multiSorts = query.sort?.split(",");
  const orderBy =
    multiSorts?.length > 1
      ? multiSorts.map((ms) => {
          const [sort, _sortOrder] = ms.split(".");
          return {
            [sort]: _sortOrder || "desc",
          };
        })
      : {
          [sort]: sortOrder,
        };
  const skip = Number(cursor);

  return {
    skip,
    take,
    orderBy,
  };
}
export async function composeQueryData(query, where, model) {
  const md = await queryResponse([], {
    query,
    model,
    where,
  });
  function response<T>(data: T[]) {
    return {
      meta: md.meta,
      data,
    };
  }
  const searchMeta = queryMeta(query);
  return {
    model,
    response,
    searchMeta,
    where,
  };
}
export function composeQuery<T>(
  queries: T[],
  relation: "AND" | "OR" = "AND",
): T | undefined {
  if (!Array.isArray(queries) || queries.length === 0) {
    return undefined;
  }
  return queries.length > 1
    ? ({
        AND: relation == "AND" ? queries : undefined,
        OR: relation != "AND" ? queries : undefined,
      } as T)
    : queries[0];
}
