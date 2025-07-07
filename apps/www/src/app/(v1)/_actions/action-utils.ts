import dayjs from "dayjs";

export function queryParams(searchParams, _baseQuery = {}) {
    const q: any = {
        ...(searchParams || {}),
        ..._baseQuery,
    };
    Object.entries(q).map(([k, v]) => {
        const vals = Array.isArray(v)
            ? v
            : (v as any)?.split(",")?.filter(Boolean);
        if (vals?.length > 1) {
            q[k] = vals;
        }
        if (vals?.length == 1) q[k] = v;
    });
    return q;
}
export function fixDbTime(date: dayjs.Dayjs, h = 0, m = 0, s = 0) {
    return date.set("hours", h).set("minutes", m).set("seconds", s);
}
export function anyDateQuery() {
    return {
        lte: fixDbTime(dayjs()).toISOString(),
    };
}
export const withDeleted = {
    OR: [{ deletedAt: null }, { deletedAt: anyDateQuery() }],
};
export function dateEquals(date) {
    return {
        gte: dayjs(date).startOf("day").toDate(),
        lte: dayjs(date).endOf("day").toDate(),
    };
    // return {
    //     gte: fixDbTime(dayjs(date)).toISOString(),
    //     lte: fixDbTime(dayjs(date), 23, 59, 59).toISOString(),
    // };
}
export function dateQuery({
    date,
    from,
    to,
    _dateType = "createdAt",
}: {
    date?;
    from?;
    to?;
    _dateType?;
}) {
    const where: any = {};

    if (date) {
        const _whereDate = {
            gte: fixDbTime(dayjs(date)).toISOString(),
            lte: fixDbTime(dayjs(date), 23, 59, 59).toISOString(),
        };
        where[_dateType] = _whereDate;
    }
    if (from || to) {
        where[_dateType] = {
            gte: !from ? undefined : fixDbTime(dayjs(from)).toISOString(),
            lte: !to
                ? undefined
                : fixDbTime(dayjs(to), 23, 59, 59).toISOString(),
        };
    }
    return where;
}
export async function queryFilter(input) {
    const { page = 1, per_page = 20 } = input;
    const skip = (page - 1) * per_page;
    let orderBy = {};
    const { sort_order = "desc", sort = "id" } = input;
    if (sort == "customer")
        orderBy = {
            customer: {
                name: sort_order,
            },
            // meta: {
            //   aaa: true
            // }
        };
    else {
        orderBy = {
            [sort]: sort_order,
        };
    }
    return {
        take: Number(per_page),
        skip: Number(skip),
        orderBy,
    };
}
export async function getPageInfo(input, where, model) {
    const { page = 1, per_page = 20 } = input;
    const skip = (page - 1) * Number(per_page);
    const count = await model.count({
        where,
    });
    const from = skip + 1;
    const pageInfo = {
        hasPreviousPage: skip > 0,
        pageCount: Math.ceil(count / per_page),
        totalItems: count,
        pageIndex: skip / per_page,
        currentPage: page,
        from,
        to: Math.min(skip + Number(per_page), count),
        perPage: per_page,
    };
    return pageInfo;
}
export function serverDate(date) {
    if (!date) return date;
    return dayjs(date).toISOString();
}
