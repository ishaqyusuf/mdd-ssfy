"use server";

import { loadSalesSetting } from "@/actions/sales-settings";
import { StepComponentMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma, Prisma } from "@/db";
import {
    ISalesOrderItemMeta,
    ISalesOrderMeta,
    ISalesType,
} from "@/types/sales";

import { composeSalesItems } from "../../_utils/compose-sales-items";
import { DykeDoorType } from "../../type";
import { isComponentType } from "../is-component-type";

export async function getSalesOverview({
    type,
    slug,
}: {
    slug: string;
    type: ISalesType;
    dyke?: boolean;
}) {
    const order = await viewSale(type, slug);

    const salesItems = composeSalesItems(order);
    const resp = {
        ...order,
        type: order.type as ISalesType,
        ...salesItems,
    };
    return resp;
}
export async function viewSale(type, slug, deletedAt?) {
    const order = await prisma.salesOrders.findFirst({
        where: {
            type: type ? type : undefined,
            slug,
            deletedAt,
        },
        include: SalesIncludes,
    });

    if (!order) throw Error();
    const settings = await loadSalesSetting();

    const sectionTitles = await prisma.dykeSteps.findFirst({
        where: {
            title: "Item Type",
        },
        select: {
            id: true,
            stepProducts: {
                select: {
                    product: {
                        select: {
                            title: true,
                            value: true,
                        },
                    },
                },
            },
        },
    });
    // console.log(sectionTitles);
    const items = order.items.map((item) => {
        // console.log(item.meta);
        const meta = item.meta as any as ISalesOrderItemMeta;

        const rootStep = item.formSteps.find(
            (fs) => fs.step.title == "Item Type",
        );
        const routes = settings?.data?.route;
        const rootConfig = settings?.data?.route?.[rootStep?.prodUid]?.config;

        const ovs = item.formSteps
            ?.map(
                (fs) =>
                    (fs.component?.meta as any as StepComponentMeta)
                        ?.sectionOverride,
            )
            ?.filter(Boolean);
        const sectionOverride = ovs.find((s) => s.overrideMode);
        // console.log({ sectionOverride, ovs });
        return {
            ...item,
            configs: sectionOverride
                ? sectionOverride
                : rootConfig
                  ? rootConfig
                  : null,

            sectionTitle: sectionTitles?.stepProducts?.find(
                (p) => p?.product?.title == meta?.doorType,
            )?.product?.value,
            housePackageTool: item.housePackageTool
                ? {
                      ...item.housePackageTool,
                      doorType: item.housePackageTool.doorType as DykeDoorType,
                  }
                : null,
            meta,
        };
    });
    const _mergedItems = items
        .filter(
            (item) =>
                (item.multiDyke && item.multiDykeUid) ||
                (!item.multiDyke && !item.multiDykeUid),
        )
        .map((item, index) => {
            const _multiDyke = items.filter(
                (i) =>
                    i.id == item.id ||
                    (item.multiDyke && item.multiDykeUid == i.multiDykeUid),
            );

            return {
                multiDykeComponents: _multiDyke,
                isType: isComponentType(item.meta.doorType),

                ...item,
            };
        });
    // console.log(_mergedItems.length);

    const groupings = {
        slabs: _mergedItems.filter((i) => i.meta.doorType == "Door Slabs Only"),
        mouldings: _mergedItems.filter((i) => i.meta.doorType == "Moulding"),
        services: _mergedItems.filter((i) => i.meta.doorType == "Services"),
        doors: _mergedItems,
    };

    // console.log(groupings.mouldings);

    const ids: any[] = [];
    // [
    //     // groupings.slabs,
    //     // groupings.mouldings,
    //     // groupings.services,
    // ].map((v) => v.map((c) => ids.push(c.id)));

    groupings.doors = _mergedItems?.filter((mi) =>
        ids.every((id) => id != mi.id),
    );

    const progress = await prisma.progress.findMany({
        where: {
            OR: [
                {
                    parentId: order.id,
                },
                {
                    progressableId: order.id,
                },
            ],
        },
    });
    // console.log(progress);

    return {
        ...order,
        meta: order.meta as any as ISalesOrderMeta,
        items,
        groupings,
        progress,
    };
}

const SalesIncludes = {
    items: {
        where: { deletedAt: null },
        include: {
            shelfItems: {
                where: { deletedAt: null },
                include: {
                    shelfProduct: true,
                },
            },
            formSteps: {
                where: { deletedAt: null },
                include: {
                    component: {
                        select: {
                            uid: true,
                            meta: true,
                        },
                    },
                    step: {
                        select: {
                            id: true,
                            title: true,
                            value: true,
                        },
                    },
                },
            },
            housePackageTool: {
                where: { deletedAt: null },
                include: {
                    stepProduct: {
                        include: {
                            door: true,
                            product: true,
                        },
                    },
                    casing: true,
                    door: {
                        where: {
                            deletedAt: null,
                        },
                    },
                    jambSize: true,
                    doors: {
                        where: { deletedAt: null },
                        include: {
                            stepProduct: {
                                include: {
                                    door: {
                                        select: {
                                            title: true,
                                        },
                                    },
                                    product: {
                                        select: {
                                            title: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    molding: {
                        where: { deletedAt: null },
                    },
                },
            },
        },
    },
    customer: true,
    shippingAddress: true,
    billingAddress: true,
    producer: true,
    salesRep: true,
    productions: true,
    payments: true,
    deliveries: {
        where: {
            deletedAt: null,
        },
        include: {
            items: {
                where: {
                    deletedAt: null,
                },
                include: {
                    submission: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            assignment: {
                                where: {
                                    deletedAt: null,
                                },
                                select: {
                                    salesDoorId: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    taxes: {
        where: {
            deletedAt: null,
        },
        include: {
            taxConfig: true,
        },
    },
    extraCosts: true,
} satisfies Prisma.SalesOrdersInclude;
