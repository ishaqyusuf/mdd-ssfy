import {
    getPageInfo,
    pageQueryFilter,
    whereNotTrashed,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { Prisma } from "@/db";

import { GetSalesDispatchListQuery } from "../data-access/sales-dispatch-dta";
import salesData from "./sales-data";

export function whereDispatch(query: GetSalesDispatchListQuery) {
    const whereAnd: Prisma.OrderDeliveryWhereInput[] = [];
    return whereAnd.length > 1 ? { AND: whereAnd } : whereAnd[0];
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
interface InfiniteListQueryProps<T> {
    table: T;
    where?;
    query?;
    whereFn?;
}
export async function infinitListQuery<T>(props: InfiniteListQueryProps<T>) {
    if (!props.where && props.whereFn) props.where = props.whereFn(props.query);
    interface ResponseProps<T1> {
        data: T1[];
        transform?(item: T1);
    }
    async function response<T1>({ data, transform }: ResponseProps<T1>) {
        const pageInfo = await getPageInfo(
            props.query,
            props.where,
            props.table,
        );
        return {
            pageCount: pageInfo?.pageCount,
            pageInfo,
            data: data.map(transform),
            meta: {
                totalRowCount: pageInfo.totalItems,
            },
        };
    }
    return {
        table: props.table,
        response,
        ...props.table,
        where: props.where,
        pageFilters: pageQueryFilter(props.query),
    };
}
// export async function infiniteListQuery<T, T1>({
//     table,
//     query,
//     include,
//     where,
// }: {
//     table: T;
//     where;
//     query: any;
//     include: T1;
// }) {
//     const data = await (table).findMany({
//         where,
//         ...pageQueryFilter(query),
//         include,
//     });
//     const pageInfo = await getPageInfo(query, {}, table);
//     const response = {
//         pageCount: pageInfo.pageCount,
//         pageInfo,
//         data,
//     };
//     function transform(
//         fn: (item: (typeof data)[number]) => (typeof data)[number]
//     ) {
//         response.data = response.data?.map((item) => {
//             return fn(item);
//         });
//     }
//     return {
//         response,
//         transform,
//     };
// }
export const excludeDeleted = {
    where: { deletedAt: null },
};
export const notDeleted = excludeDeleted;

export const SalesListInclude = {
    producer: true,
    pickup: true,
    extraCosts: true,
    // itemControls:{
    //     where: {
    //         deletedAt: null
    //     },
    //     select: {

    //     }
    // },
    deliveries: {
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
        },
    },
    doors: {
        where: {
            deletedAt: null,
            housePackageTool: {
                doorType: {
                    in: salesData.productionDoorTypes,
                },
            },
        },
        select: {
            id: true,
            doorType: true,
            lhQty: true,
            rhQty: true,
            totalQty: true,
        },
    },
    customer: {
        select: {
            id: true,
            businessName: true,
            name: true,
            phoneNo: true,
            email: true,
            address: true,
        },
    },
    billingAddress: {
        select: {
            id: true,
            name: true,
            address1: true,
            email: true,
            meta: true,
            phoneNo: true,
        },
    },
    shippingAddress: {
        select: {
            id: true,
            name: true,
            phoneNo: true,
            email: true,
            meta: true,
            address1: true,
        },
    },
    salesRep: {
        select: {
            id: true,
            name: true,
        },
    },
    stat: true,
} satisfies Prisma.SalesOrdersInclude;

const AssignmentsInclude = {
    where: {
        ...excludeDeleted.where,
        assignedToId: undefined,
    },
    include: {
        assignedTo: true,
        submissions: {
            ...excludeDeleted,
            include: {
                itemDeliveries: {
                    ...excludeDeleted,
                },
            },
        },
    },
} satisfies
    | Prisma.DykeSalesDoors$productionsArgs
    | Prisma.SalesOrderItems$assignmentsArgs;
export const SalesIncludeAll = {
    items: {
        where: { deletedAt: null },
        include: {
            formSteps: {
                ...excludeDeleted,
                include: {
                    step: true,
                },
            },
            salesDoors: {
                include: {
                    housePackageTool: {
                        include: {
                            door: true,
                        },
                    },
                    productions: AssignmentsInclude,
                },
                where: {
                    doorType: {
                        in: salesData.productionDoorTypes,
                    },
                    ...excludeDeleted.where,
                },
            },
            assignments: AssignmentsInclude,
            shelfItems: {
                where: { deletedAt: null },
                include: {
                    shelfProduct: true,
                },
            },
            housePackageTool: {
                ...excludeDeleted,
                include: {
                    casing: excludeDeleted,
                    door: excludeDeleted,
                    jambSize: excludeDeleted,
                    doors: {
                        ...excludeDeleted,
                    },
                    molding: excludeDeleted,
                },
            },
        },
    },
    customer: excludeDeleted,
    shippingAddress: excludeDeleted,
    billingAddress: excludeDeleted,
    producer: excludeDeleted,
    salesRep: excludeDeleted,
    productions: excludeDeleted,
    payments: excludeDeleted,
    stat: excludeDeleted,
    deliveries: excludeDeleted,
    itemDeliveries: excludeDeleted,
    taxes: excludeDeleted,
} satisfies Prisma.SalesOrdersInclude;
export const SalesOverviewIncludes = {
    items: {
        where: { deletedAt: null },
        include: {
            formSteps: {
                ...excludeDeleted,
                include: {
                    step: true,
                },
            },
            assignments: AssignmentsInclude,
            shelfItems: {
                where: { deletedAt: null },
                include: {
                    shelfProduct: true,
                },
            },
            housePackageTool: {
                ...excludeDeleted,
                include: {
                    casing: excludeDeleted,
                    door: excludeDeleted,
                    jambSize: excludeDeleted,
                    doors: {
                        ...excludeDeleted,
                        include: {
                            stepProduct: true,
                            productions: AssignmentsInclude,
                        },
                    },
                    molding: excludeDeleted,
                    stepProduct: {
                        include: {
                            door: true,
                            product: true,
                        },
                    },
                },
            },
        },
    },
    itemControls: true,
    customer: excludeDeleted,
    shippingAddress: excludeDeleted,
    billingAddress: excludeDeleted,
    producer: excludeDeleted,
    salesRep: excludeDeleted,
    productions: excludeDeleted,
    payments: excludeDeleted,
    stat: excludeDeleted,
    deliveries: {
        ...excludeDeleted,
        include: {
            items: excludeDeleted,
            driver: true,
        },
    },
    // itemDeliveries: excludeDeleted,
} satisfies Prisma.SalesOrdersInclude;

export const dykeFormIncludes = (restoreQuery) =>
    ({
        items: {
            where: {
                ...restoreQuery,
            },
            include: {
                formSteps: {
                    where: {
                        ...restoreQuery,
                    },
                    include: {
                        step: {
                            include: {
                                _count: includeStepPriceCount,
                            },
                        },
                    },
                },
                shelfItems: {
                    where: {
                        ...restoreQuery,
                    },
                },
                housePackageTool: {
                    // where: {
                    //     ...restoreQuery
                    // },
                    include: {
                        stepProduct: {
                            include: {
                                door: true,
                            },
                        },
                        doors: {
                            where: {
                                ...restoreQuery,
                            },
                        },
                        door: {
                            where: {
                                ...restoreQuery,
                            },
                        },
                        molding: {
                            where: {
                                ...restoreQuery,
                            },
                        },
                    },
                },
            },
        },
        payments: true,
        salesRep: {
            select: {
                id: true,
                name: true,
            },
        },
        taxes: {
            where: {
                deletedAt: null,
            },
        },
        customer: true,
        shippingAddress: true,
        billingAddress: true,
    }) satisfies Prisma.SalesOrdersInclude;
export const includeStepPriceCount = {
    select: {
        priceSystem: {
            where: {
                deletedAt: null,
            },
        },
    },
};
export const SalesBookFormIncludes = (restoreQuery) =>
    ({
        salesProfile: true,
        extraCosts: true,
        items: {
            where: {
                deletedAt: null,
            },
            include: {
                formSteps: {
                    where: {
                        // ...withDeleted,
                        // ...restoreQuery,
                    },

                    include: {
                        priceData: true,
                        component: {
                            select: {
                                id: true,
                                meta: true,
                            },
                        },
                        step: {
                            include: {
                                _count: includeStepPriceCount,
                            },
                        },
                    },
                },
                shelfItems: {
                    where: {
                        ...restoreQuery,
                    },
                },
                housePackageTool: {
                    // where: {
                    //     ...restoreQuery
                    // },
                    include: {
                        priceData: true,
                        stepProduct: {
                            include: {
                                door: true,
                            },
                        },
                        doors: {
                            include: {
                                priceData: true,
                                stepProduct: true,
                            },
                            where: {
                                ...whereNotTrashed.where,
                                ...restoreQuery,
                            },
                        },
                        door: {
                            where: {
                                ...restoreQuery,
                            },
                            include: {
                                stepProducts: true,
                            },
                        },
                        molding: {
                            where: {
                                ...restoreQuery,
                            },
                            // include: {
                            //     stepProducts: true,
                            // },
                        },
                    },
                },
            },
        },
        payments: true,
        salesRep: {
            select: {
                id: true,
                name: true,
            },
        },
        taxes: {
            where: {
                deletedAt: null,
            },
        },
        customer: true,
        shippingAddress: true,
        billingAddress: true,
    }) satisfies Prisma.SalesOrdersInclude;
