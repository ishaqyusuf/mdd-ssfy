import { PageDataMeta } from "@/type";

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
  if (model) {
    const count = await model.count({
      where,
    });
    const size = query?.size || 20;
    meta.count = count;
    let start = (query?.start || 0) + size;
    if (start < count)
      meta.next = {
        size: size,
        start,
      };
  }
  return {
    data,
    meta,
  };
}
export function queryMeta(query?: any) {
  const take = query.size ? Number(query.size) : 20;
  const { start = 0 } = query;
  const [sort, sortOrder = "desc"] = (query.sort || "createdAt").split(".");
  const orderBy = {
    [sort]: sortOrder,
  };
  const skip = Number(start);

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
export function composeQuery<T>(queries: T[]): T | undefined {
  if (!Array.isArray(queries) || queries.length === 0) {
    return undefined;
  }
  return queries.length > 1
    ? ({
        AND: queries,
      } as T)
    : queries[0];
}
