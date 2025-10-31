"use server";

export async function paginatedAction(q, table, where) {
    const { per_page, page } = q;
    const take = isNaN(per_page) ? 20 : +per_page;
    const fallbackPage = isNaN(page) || page < 1 ? 1 : page;
    const skip = fallbackPage > 0 ? (fallbackPage - 1) * take : 0;
    const count = await table.count({ where });
    const pageCount = Math.ceil(count / take);

    return {
        pageCount,
        skip,
        take,
    };
    //   return {
    //     data: await table.findMany({
    //       where,
    //       skip,
    //       take,
    //     }),
    //     pageCount,
    //   };
}
