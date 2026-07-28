import { whereNotTrashed } from "@/app-deps/(clean-code)/_common/utils/db-utils";
import type { Prisma } from "@/db";
import salesData from "@sales/sales-data";

import type { GetSalesDispatchListQuery } from "../data-access/sales-dispatch-dta";

export function whereDispatch(query: GetSalesDispatchListQuery) {
    const whereAnd: Prisma.OrderDeliveryWhereInput[] = [];
    return whereAnd.length > 1 ? { AND: whereAnd } : whereAnd[0];
}

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
            status: true,
            dueDate: true,
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

const includeStepPriceCount = {
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
                        deletedAt: null,
                        ...restoreQuery,
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
                        deletedAt: null,
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
    } satisfies Prisma.SalesOrdersInclude);
