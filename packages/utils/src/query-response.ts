export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
  cursor?;
  hasPreviousePage?;
  hasNextPage?;
};
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
  }
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
    // if(process.env÷)
    return {
      meta: md.meta,
      data,
      filter: process.env.NODE_ENV == "production" ? undefined : where,
      query: process.env.NODE_ENV == "production" ? undefined : query,
    };
  }
  const searchMeta = queryMeta(query);
  return {
    model,
    response,
    searchMeta,
    where,
    queryProps: {
      where,
      ...searchMeta,
    },
  };
}
export function composeQuery<T>(
  queries: T[],
  relation: "AND" | "OR" = "AND"
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
export function __queryBuilder<T extends object, WhereInput>(
  query: T,
  queries: WhereInput[]
) {
  type Ctx = {
    _if<K extends keyof T>(
      k: K,
      fn?: (ctx: Ctx, value: NonNullable<T[K]>) => void
    ): Ctx;
    _unless<K extends keyof T>(k: K, fn?: (ctx: Ctx, value: T[K]) => void): Ctx;
    where(where: WhereInput): Ctx;
    compose(): ReturnType<typeof composeQuery<WhereInput>>;
  };

  const ctx: Ctx = {
    _if(k, fn) {
      const value = query?.[k];
      if (value !== undefined && value !== null && value !== "") {
        fn?.(ctx, value as any);
      }
      return ctx;
    },
    _unless(k, fn) {
      const value = query?.[k];
      if (value === undefined || value === null || value === "") {
        fn?.(ctx, value as any);
      }
      return ctx;
    },
    where(where) {
      queries.push(where);
      return ctx;
    },
    compose() {
      return composeQuery(queries);
    },
  };

  return ctx;
}
export function queryBuilder<T, WhereInput>(query: T, queries: WhereInput[]) {
  const ctx = {
    _if(k: keyof T, fn?: () => any) {
      if (query?.[k]) fn?.();
      // const processedData =
      return ctx;
    },
    where(where: WhereInput) {
      queries.push(where);
      return ctx;
    },
    compose: () => composeQuery(queries),
  };
  return ctx;
}
