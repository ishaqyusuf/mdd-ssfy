import { Door } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-swap-modal";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { ftToIn } from "../utils";

export function composeDoor(cls: ComponentHelperClass, door?: Door) {
    const priceModel = cls.getDoorPriceModel(cls.componentUid);
    const sizeList = priceModel.heightSizeList;
    let groupItem = cls.getItemForm().groupItem;
    const routeConfig = cls.getRouteConfig();

    const componentUid = cls.componentUid;
    const selections: {
        [id in string]: {
            salesPrice: number;
            basePrice: number;
            swing: string;
            qty: {
                lh: number | string;
                rh: number | string;
                total: number | string;
            };
        };
    } = {};
    const sizePrice = priceModel.sizeList.map((sl) => {
        const path = `${componentUid}-${sl.size}`;
        // console.log({ path });
        const swapPath = door?.sizeList?.find((s) =>
            s.path?.endsWith(`-${sl.size}`),
        )?.path;
        const sizeData = groupItem?.form?.[swapPath] || groupItem?.form?.[path];

        const basePrice = priceModel?.formData?.priceVariants?.[sl.size]?.price;
        let salesPrice = cls.calculateSales(basePrice);
        selections[path] = {
            salesPrice,
            basePrice,
            swing: sizeData?.swing || "",
            qty: {
                lh: sizeData?.qty?.lh || "",
                rh: sizeData?.qty?.rh || "",
                total: sizeData?.qty?.total || "",
            },
        };
        return {
            path,
            ...sl,
            salesPrice,
            basePrice,
            sizeIn: sl.size
                ?.split("x")
                ?.map((s) => ftToIn(s?.trim())?.replace("in", '"'))
                .join(" x "),
        };
    });
    const sizePriceList = sizeList
        .map((s) => sizePrice.find((p) => p.size === s.size))
        .filter(Boolean);
    return {
        selections,
        sizePriceList,
        sList: sizePriceList,
        sizePrice,
        priceModel,
        routeConfig,
    };
}
