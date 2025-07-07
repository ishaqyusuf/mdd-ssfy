import { ISalesOrderItemMeta } from "@/types/sales";
import { viewSale } from "../overview/_actions/get-sales-overview";

export type ViewSaleType = Awaited<ReturnType<typeof viewSale>>;

export function composeSalesItems(data: ViewSaleType) {
    const housePakageTools: {
        [doorType: string]: {
            type: string;
            item: Omit<ViewSaleType["items"][0], "housePackageTool">;
            housePackageTools: NonNullable<
                ViewSaleType["items"][0]["housePackageTool"]
            >[];
        };
    } = {};
    const shelfItems: NonNullable<ViewSaleType["items"][0]["shelfItems"]> = [];
    let totalDoors = 0;
    // console.log(data.items.length);

    data.items.map((item) => {
        if (item.housePackageTool) {
            const tool = item.housePackageTool;
            const dt = tool.doorType as string;

            if (!housePakageTools[dt])
                housePakageTools[dt] = {
                    type: dt,
                    housePackageTools: [],
                    item,
                };

            housePakageTools[dt]?.housePackageTools?.push(
                item.housePackageTool
            );
            totalDoors += item.housePackageTool?.totalDoors || 0;
        }
        if (item.shelfItems) shelfItems.push(...item.shelfItems);
    });

    return {
        shelfItems,
        totalDoors,
        housePackageTools: data.items
            .filter((item) => item.housePackageTool)
            .map((item) => {
                return {
                    doorType: item.housePackageTool?.doorType,
                    doorDetails: composeDoorDetails(item.formSteps, item),
                    doors: item.housePackageTool?.doors.map((door) => {
                        return {
                            dimension: door.dimension,
                            lhQty: door.lhQty,
                            rhQty: door.rhQty,
                            unitPrice: door.unitPrice,
                            totalPrice: door.lineTotal,
                        };
                    }),
                };
            }),
        doors: Object.values(housePakageTools),
    };
}

export function composeDoorDetails(
    steps: ViewSaleType["items"][0]["formSteps"],
    item: ViewSaleType["items"][0]
) {
    if (!steps) steps = [];

    let _steps = steps
        .filter(
            (s) =>
                !["Door", "Item Type", "Moulding"].some(
                    (k) => k == s.step.title
                )
        )
        .map((fs) => {
            return {
                title: fs.step.title,
                value: fs.value,
            };
        });
    // _steps.push({
    //     title: "----",
    //     value: "####",
    // });
    // if (item.housePackageTool?.doorType == "Moulding") {
    //     console.log(item);
    //     _steps.push(
    //         ...[
    //             {
    //                 title: "Qty",
    //                 value: `$ 100`,
    //             },
    //         ]
    //     );
    // }
    return _steps;
}
