import { DykeDoors, DykeProducts, DykeStepProducts } from "@/db";

import { findDoorSvg } from "./_utils/find-door-svg";
import { DykeProductMeta, StepProdctMeta } from "./type";

export function transformStepProducts(
    prod: DykeStepProducts & { door?: DykeDoors; product?: DykeProducts },
) {
    let meta: StepProdctMeta = prod.meta as any;
    if (!prod.meta)
        meta = {
            stepSequence: [],
            deleted: {},
            show: {},
        };
    let prodMeta: DykeProductMeta =
        prod.product?.meta || prod.door?.meta || ({} as any);
    // if (prod.door)
    //     prodMeta = {
    //         // ...findDoorSvg(prod.door.title, prod.door.img),
    //         ...prodMeta,
    //     };
    return {
        ...prod,
        meta,
        door: prod.door
            ? {
                  ...prod.door,
                  meta: prodMeta,
              }
            : undefined,
        isDoor: prod.doorId > 0,
        product: prod.product
            ? {
                  ...prod.product,
                  meta: prodMeta,
              }
            : {
                  ...prod.door,
                  value: prod.door.title,
                  description: prod.door.title,
                  meta: prodMeta,
              },
        _metaData: {
            price: null,
            hidden: false,
            basePrice: null,
        },
    };
}
export function sortStepProducts<T>(prods: T[]) {
    if (prods.filter((s: any) => s.sortIndex >= 0).length)
        prods = prods.sort((a: any, b: any) => a.sortIndex - b.sortIndex);
    return prods;
}
export const includeStepPriceCount = {
    select: {
        priceSystem: {
            where: {
                deletedAt: null,
            },
        },
    },
};
