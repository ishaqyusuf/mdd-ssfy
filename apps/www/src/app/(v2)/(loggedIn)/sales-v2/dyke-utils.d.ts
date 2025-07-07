import { DykeDoors, DykeProducts, DykeStepProducts } from "@/db";
export declare function transformStepProducts(prod: DykeStepProducts & {
    door?: DykeDoors;
    product?: DykeProducts;
}): any;
export declare function sortStepProducts<T>(prods: T[]): T[];
export declare const includeStepPriceCount: {
    select: {
        priceSystem: {
            where: {
                deletedAt: any;
            };
        };
    };
};
