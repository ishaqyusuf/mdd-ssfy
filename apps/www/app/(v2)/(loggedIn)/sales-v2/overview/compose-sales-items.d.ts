import { viewSale } from "./_actions/get-sales-overview";
export type ViewSaleType = Awaited<ReturnType<typeof viewSale>>;
export declare function composeSalesItems(data: ViewSaleType): {
    shelfItems: any;
    totalDoors: number;
    housePackageTools: any;
    doors: {
        type: string;
        item: Omit<ViewSaleType["items"][0], "housePackageTool">;
        housePackageTools: NonNullable<
            ViewSaleType["items"][0]["housePackageTool"]
        >[];
    }[];
};
export declare function composeDoorDetails(
    steps: ViewSaleType["items"][0]["formSteps"],
    item: ViewSaleType["items"][0],
): any;

