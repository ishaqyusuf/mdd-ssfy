import {
    ComponentPrice,
    DykeSalesDoors,
    DykeSalesShelfItem,
    DykeShelfProducts,
} from "@/db";
import { HousePackageToolMeta } from "@/types/sales";

import { getDykeFormAction } from "./form/_action/get-dyke-form";
import { getStepForm } from "./form/_action/get-dyke-step";
import { getStepProduct } from "./form/_action/get-dyke-step-product";

interface IDykeSalesItem {
    meta: {
        shelfItem: {
            categoryIds: number[];
            productId;
            price;
            title;
        };
    };
}

export type DykeDoorType =
    | "Interior"
    | "Exterior"
    | "Shelf Items"
    | "Garage"
    | "Bifold"
    | "Moulding"
    | "Door Slabs Only"
    | "Services";
type DykeStep = Awaited<ReturnType<typeof getStepForm>>;
type DykeStepProducts = Awaited<ReturnType<typeof getStepProduct>>;
// type IDykeStepForm = {
//     data: DykeStepForm;
//     step: Awaited<ReturnType<typeof getStepForm>>;
// };
export interface DykeForm
    extends Awaited<ReturnType<typeof getDykeFormAction>> {}
type FormStepArray = DykeForm["itemArray"][0]["item"]["formStepArray"];
type DykeFormItem = DykeForm["itemArray"][0];
type DykeDoorForm =
    DykeFormItem["multiComponent"]["components"][number]["_doorForm"];
type DykeDoorSizeForm = DykeDoorForm[number];
type SaveMode = "close" | "new" | "default";
// export interface DykeForm {
//     items: { [index in string]: DykeItemForm };
//     currentItemIndex: string | null;
//     itemsIndex: number[];
//     itemBlocks: {
//         [itemIndex in string]: {
//             blocks: ItemBlock[];
//             openedStepIndex: number;
//         };
//     };
// }
interface DykeItemForm {
    meta: {
        configIndex;
        config: { [label in string]: string };
        // shelfItem: {};
    };
    shelfItems: CategorizedShelfItem[];
}
interface CategorizedShelfItem {
    categoryId: number | undefined;
    categoryIds: number[];
    productArray: { item: DykeShelfItemForm }[];
}
export interface ShelfItemMeta {
    categoryIds: number[];
}
type IDykeShelfProducts = Omit<DykeShelfProducts, "meta"> & {
    meta: ShelfItemMeta;
};
export type IDykeShelfProductsForm = IDykeShelfProducts & {
    _meta: {
        categories: { id: number }[];
        parentCategoryId;
    };
};
export interface DykeFormStepMeta {
    hidden?: boolean;
}
export interface DykeStepMeta {
    priceDepencies?: { [itemId: string]: boolean };
    stateDeps?: { [itemId: string]: boolean };
    custom?: boolean;
    allowCustom?: boolean;
    allowAdd?: boolean;
    enableSearch?: boolean;
    doorSizeConfig: {
        [uid in string]: {
            title: string;
            sizes: { [height in string]: boolean };
            productRules: {
                [uid in string]: boolean;
            };
        };
    };
}
export interface DykeStepItemMeta {
    custom?: boolean;
}
export interface StepProdctMeta {
    stepSequence?: { id?: number }[];
    deleted?: { [uid in string]: boolean };
    show?: { [uid in string]: boolean };
}
type ItemStepSequence = {
    [id in number]: {
        stepIndex?;
        sequence: StepProdctMeta["stepSequence"];
    };
};
export interface DykeProductMeta {
    svg;
    url;
    sortIndex?;
    priced?: boolean;
    mouldingSpecies: { [id in string]: boolean };
    doorPrice?: { [size in string]: number };
}
interface DykeShelfItemForm extends Omit<DykeSalesShelfItem, "meta"> {
    meta: {
        categoryIds: number[];
    };
}
export type MultiDyke = {
    components: {
        [doorTitle in string]: {
            checked?: boolean;

            _componentsTotalPrice?: number | null;
            _mouldingPriceTag?: number | null;
            mouldingPriceData?: Partial<ComponentPrice>;
            toolId?;
            itemId?;
            qty: number | null;
            doorQty: number | null;
            unitPrice: number | null;
            totalPrice: number | null;
            hptId: number | null;
            swing?: string | null;
            tax?: boolean;
            production?: boolean;
            description?: string;
            doorTotalPrice: number | null;
            stepProductId?: number | null;
            stepProduct?: DykeStepProducts[number];
            heights: {
                [dim in string]: {
                    checked?: boolean;
                    dim?: string;
                    width?: string;
                };
            };
            _doorForm: {
                [dim in string]: DykeSalesDoor & { priceData: ComponentPrice };
            };
            uid?;
            priceTags?: HousePackageToolMeta["priceTags"];
        };
    };
    uid?: string;
    multiDyke?: boolean;
    primary?: boolean;
    rowIndex?;
};

export type DykeSalesDoor = Omit<DykeSalesDoors, "meta"> & {
    meta: DykeSalesDoorMeta;
    priceData?: Partial<ComponentPrice>;
};
export interface DykeSalesDoorMeta {
    _doorPrice: number | null;
}

interface DykeBlock {
    title;
    options: { title; img }[];
}
