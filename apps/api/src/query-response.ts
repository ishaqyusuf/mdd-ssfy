import type { PageDataMeta } from "./type";

export async function queryResponse<T>(
  data: T[],
  { query = null, model = null, where = null },
) {
  let meta = {} as PageDataMeta;
  if (model) {
    const count = await (model as any)({
      where,
    });
    const size = (query as any)?.size || 20;
    meta.count = count;
    let start = ((query as any)?.start || 0) + size;
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
  const { sort = "createdAt", start = 0 } = query;
  const orderBy = {
    [sort]: "desc",
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
