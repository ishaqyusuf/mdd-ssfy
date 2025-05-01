import { DykeForm as OldDykeForm } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import {
    AddressBooks,
    ComponentPrice,
    DykeDoors,
    DykeSalesDoors,
    DykeStepProducts,
    Prisma,
    SalesOrders,
    SalesStat,
} from "@/db";
import { FieldPath } from "react-hook-form";

import { GetStepComponent } from "./_common/data-access/step-components.dta";
import { GetSalesBookForm } from "./_common/use-case/sales-book-form-use-case";

export type SalesType = "order" | "quote";
export type SalesPriority = "Low" | "High" | "Medium" | "Non";
export type PaymentMethods =
    | "link"
    | "terminal"
    | "check"
    | "cash"
    | "zelle"
    | "credit-card"
    | "wire";
export type SquarePaymentMethods = "terminal" | "link";
export type DykeStepTitles =
    | "Category"
    | "Shelf Items"
    | "Cutdown Height"
    | "House Package Tool"
    | "Height"
    | "Item Type"
    | "Door"
    | "Height"
    | "Specie"
    | "Moulding"
    | "Door Configuration"
    | "Jamb Species"
    | "Jamb Type"
    | "Jamb Size"
    | "Door Type"
    | "Line Item";
export type DykeStepTitleKv = Partial<{
    [title in Partial<DykeStepTitles>]: DykeStepTitles;
}>;
export type SalesDispatchStatus =
    | "queue"
    | "in progress"
    | "completed"
    | "cancelled";
export type SalesStatStatus =
    | "pending"
    | "in progress"
    | "completed"
    | "unknown"
    | "N/A";
export type TypedSalesStat = Omit<SalesStat, "status" | "type" | "id"> & {
    type: QtyControlType;
    id?: number;
    status?: SalesStatStatus;
};
export type SalesPrintMode =
    | "quote"
    | "order"
    | "production"
    | "packing list"
    | "order-packing";
export type DykeDoorType =
    | "Interior"
    | "Exterior"
    | "Shelf Items"
    | "Garage"
    | "Bifold"
    | "Moulding"
    | "Door Slabs Only"
    | "Services";
export type DeliveryOption = "delivery" | "pickup";
export type SalesPaymentOptions =
    | "Cash"
    | "Credit Card"
    | "Check"
    | "COD"
    | "Zelle";
export interface SalesItemMeta {
    // supplier;
    // supplyDate;
    // prehung_description;
    // prehung_information;
    // product_information;
    // product_description;
    // prehung_cost;
    // cost_price;
    // computed_rate;
    // sales_percentage;
    tax?: boolean;
    // door_qty_selector;
    // frame;
    // product_cost;
    // produced_qty: number | undefined | null;
    // casing;
    // hinge;
    // line_index;
    lineIndex;
    // uid;
    // sales_margin;
    // manual_cost_price;
    // manual_rate;
    doorType: DykeDoorType;
    // _dykeSizes: { [size in string]: boolean };
    // _dykeMulti: { [item in string]: boolean };
}
export type SalesMeta = {
    qb;
    profileEstimate: Boolean;
    ccc;
    priority: SalesPriority;
    ccc_percentage;
    labor_cost;
    discount;
    deliveryCost;
    sales_profile;
    sales_percentage;
    po;
    mockupPercentage: number;
    rep;
    total_prod_qty;
    payment_option: SalesPaymentOptions;
    truckLoadLocation;
    truck;
    tax?: boolean;
    calculatedPriceMode?: boolean;
    takeOff: {
        list: {
            title: string;
            index: number;
            components: {
                itemUid: string;
                qty: {
                    rh?: number | undefined;
                    lh?: number | undefined;
                    total?: number | undefined;
                };
            }[];
        }[];
    };
};

export type TypedSales = SalesOrders & {
    type: SalesType;
    deliveryOption: DeliveryOption;
    meta: SalesMeta;
};
export interface AddressBookMeta {
    zip_code;
}
export type CustomerMeta = {
    netTerm?: string;
};
export type TypedAddressBook = Omit<AddressBooks, "meta"> & {
    meta: AddressBookMeta;
};
// export type CreateTaxForm = Omit<Taxes, "sa">;
export interface StepComponentMeta {
    stepSequence?: { id?: number }[];
    deleted?: { [uid in string]: boolean };
    show?: { [uid in string]: boolean };
    variations?: {
        rules: {
            stepUid: string;
            operator: "is" | "isNot";
            componentsUid: string[];
        }[];
    }[];
    sortIndex?;
    sectionOverride?: {
        hasSwing?: boolean;
        noHandle?: boolean;
        overrideMode?: boolean;
    };
}
export interface DykeProductMeta {
    svg;
    url;
    sortIndex?;
    priced?: boolean;
    mouldingSpecies: { [id in string]: boolean };
    doorPrice?: { [size in string]: number };
}

export type DykeFormData = OldDykeForm;
export type OldDykeFormData = OldDykeForm;
export type DykeFormDataPath = FieldPath<OldDykeFormData>;
export type DykeFormItemData = OldDykeForm["itemArray"][number];
export type DykeFormStepData =
    DykeFormItemData["item"]["formStepArray"][number];
export type DykeFormStepDataPath = FieldPath<DykeFormStepData>;
export type DykeFormItemDataPath = FieldPath<DykeFormItemData>;
export type ItemMultiComponentData =
    DykeFormItemData["multiComponent"]["components"][number];
export type ItemMultiComponentSizeData =
    ItemMultiComponentData["_doorForm"][number];
export type ItemMultiComponentSizeDataPath =
    FieldPath<ItemMultiComponentSizeData>;
export type ItemMultiComponentDataPath = FieldPath<ItemMultiComponentData>;

export interface HousePackageToolSettingsMeta {
    sizes: {
        ft: string;
        in: string;
        type?: DykeDoorType;
        width: boolean;
        height: boolean;
    }[];
}
export interface HousePackageToolSettings {
    id: number;
    type: string;
    data: HousePackageToolSettingsMeta;
}
export type SalesTransaction = {
    squarePaymentType?: SalesPaymentType;
    squarePaymentId?;
    paymentMode: PaymentMethods;
    amount;
    salesIds: Number[];
    accountNo: string;
    description: string;
    checkNo: string;
};
export type SalesPaymentType = "square_terminal" | "square_link";
export type SalesPaymentStatus =
    | "created"
    | "pending"
    | "success"
    | "cancelled";
export type TypedDykeSalesDoor = Omit<DykeSalesDoors, "meta"> & {
    meta: DykeSalesDoorMeta;
    priceData?: Partial<ComponentPrice>;
    stepProduct: DykeStepProduct;
};
export interface DykeSalesDoorMeta {
    _doorPrice?: number | null;
    overridePrice?: number | string;
    unitLabor?: number;
    laborQty?: number;
}
export interface HousePackageToolMeta {
    priceTags?: {
        moulding?: {
            salesPrice?: number | undefined;
            price?: number | undefined;
            basePrice?: number | undefined;
            addon?: number | undefined;
            overridePrice?: number | undefined;
            unitLabor?: number;
            laborQty?: number;
        };
        components?: number | undefined;
        doorSizePriceTag?: { [size in string]: number };
    };
}
export interface StepComponentMeta {
    stepSequence?: { id?: number }[];
    deleted?: { [uid in string]: boolean };
    show?: { [uid in string]: boolean };
}
export interface DykeProductMeta {
    svg;
    url;
    sortIndex?;
    priced?: boolean;
    mouldingSpecies: { [id in string]: boolean };
    doorPrice?: { [size in string]: number };
}
export interface DykeFormStepMeta {
    hidden?: boolean;
    // custom?: boolean;
    flatRate?: boolean;
}
export interface ShelfItemMeta {
    categoryUid: string;
    itemIndex: number;
    lineUid: string;
    customPrice?: number;
    basePrice?: number;
    unitLabor?: number;
    laborQty?: number;
}

export type DykeStepProduct = Omit<DykeStepProducts, "meta"> & {
    meta: StepComponentMeta;
    door?: Omit<DykeDoors, "meta"> & {
        meta: DykeProductMeta;
    };
    product?: Omit<DykeDoors, "meta"> & {
        meta: DykeProductMeta;
    };
    metaData: {
        price?: number;
        hidden?: boolean;
        basePrice?: boolean;
        isDoor?: boolean;
    };
}; //Awaited<ReturnType<typeof getStepProduct>>;
export interface MultiSalesFormItem {
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
            stepProduct?: DykeStepProducts;
            heights: {
                [dim in string]: {
                    checked?: boolean;
                    dim?: string;
                    width?: string;
                };
            };
            _doorForm: {
                [dim in string]: DykeSalesDoor & {
                    priceData: ComponentPrice;
                    stepProduct?: DykeStepProduct;
                };
            };
            uid?;
            priceTags?: HousePackageToolMeta["priceTags"];
        };
    };
    uid?: string;
    multiDyke?: boolean;
    primary?: boolean;
    rowIndex?;
}
export type DykeSalesDoor = Omit<DykeSalesDoors, "meta"> & {
    meta: DykeSalesDoorMeta;
    priceData?: Partial<ComponentPrice>;
};
export type StepMeta = {
    custom: boolean;
    priceStepDeps: string[];
    doorSizeVariation?: {
        rules: {
            stepUid: string;
            operator: "is" | "isNot";
            componentsUid: string[];
        }[];
        widthList?: string[];
    }[];
};
export interface AddressForm {
    id?: number;
    name: string;
    email: string;
    primaryPhone: string;
    secondaryPhone: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
}
export interface PricingMetaData {
    subTotal?: number;
    grandTotal?: number;
    paid?: number;
    pending?: number;
    dueAmount?: number | string;
    discount?: number | string;
    delivery?: number | string;
    labour?: number | string;
    taxCode?: string;
    taxxable?: number;
    taxValue?: number;
    taxId?: number;
    ccc?: number;
}
export type PaymentTerms = "None" | "Net10" | "Net20" | "Net30";

export interface SalesShelfField {
    categoryIds: number[];
    productUids: string[];
    products: {
        [uid in string]: {
            productId: number;
            title?: string;
            basePrice: number;
            salesPrice: number;
            qty: number;
            customPrice: number;
            unitLabor?: number;
            laborQty?: number;
            // : number;
            totalPrice: number;
            id?: number;
            categoryId: number;
        };
    };
}
export interface SalesFormItem {
    id?: number;
    uid?: string;
    collapsed?: boolean;
    currentStepUid?: string;
    title?: string;
    routeUid?: string;
    swapUid?: string;
    sideView?: {
        img?: string;
    }[];
    shelfItems?: {
        salesItemId: number;
        subTotal: number;
        lines: { [uid in string]: SalesShelfField };
        lineUids: string[];
    };
    groupItem?: {
        _?: {
            tabUid?: string;
        };
        itemType: DykeDoorType;
        type?: "MOULDING" | "HPT" | "SERVICE";
        hptId?;
        doorStepProductId?;
        groupUid?;
        pricing?: {
            flatRate?: number;
            components?: {
                basePrice?: number;
                salesPrice?: number;
            };
            total?: {
                basePrice?: number;
                salesPrice?: number;
            };
        };
        qty: {
            rh?: number;
            lh?: number;
            total?: number;
        };
        // componentsBasePrice?: number;
        // componentsSalesPrice?: number;
        // totalBasePrice?: number;
        // totalSalesPrice?: number;
        itemIds: string[];
        stepUid?: string;
        form: {
            [id in string]: {
                selected: boolean;
                // id for door = `${componentUid}-${size}`
                // id for moulding = `${componentUid}`
                // id for services = random
                primaryGroupItem?: boolean;
                meta: {
                    description?: string;
                    taxxable?: boolean;
                    produceable?: boolean;
                    salesItemId?;
                    // noHandle: boolean;
                };
                qty: {
                    rh?: number | string;
                    lh?: number | string;
                    total?: number | string;
                };
                // basePrice?: number;
                pricing?: {
                    itemPrice?: {
                        basePrice?: number;
                        salesPrice?: number;
                    };
                    customPrice?: number | string;
                    unitLabor?: number;
                    laborQty?: number;
                    componentPrice?: number | string;
                    unitPrice?: number;
                    totalPrice?: number;
                    addon: number | string;
                };
                // totalSalesPrice?: number;
                hptId?: number;
                doorId?: number;
                swing?: string;
                stepProductId?: {
                    id?;
                    fallbackId?;
                };
                mouldingProductId?;
                // imgUrl: string;
            };
        };
    };
}
export interface SalesFormFields {
    saveAction?: "new" | "close" | "default";
    newFeature?: boolean;
    metaData?: {
        salesRepId;
        type: SalesType;
        id?: number;
        salesId?: string;
        salesProfileId?: number;
        salesMultiplier?: number;
        qb?: string;
        po?: string;
        sameAddress?: boolean;
        deliveryMode: DeliveryOption;
        primaryPhone: string;
        debugMode: boolean;
        // cad?: number;
        billing?: {
            id?: number;
            customerId?: number;
        };
        shipping?: {
            id?: number;
            customerId?: number;
        };
        customer?: {
            id?: number;
        };
        // sad?: number;
        paymentMethod: SalesPaymentOptions;
        pricing: PricingMetaData;
        tax?: {
            salesTaxId?: string;
            taxCode?: string;
            percentage: number;
            title: string;
        };
        createdAt?;
        paymentTerm?: PaymentTerms;
        paymentDueDate?;
        goodUntil?;
        profileChangedToken?;
        dataRefreshToken?;
    };
    kvFormItem: {
        [itemUid in string]: SalesFormItem;
    };

    kvStepForm: {
        [stepItemUid in string]: {
            //id: "itemUid-stepUid"
            title?: string;
            value?: string;
            salesPrice?: number;
            basePrice?: number;
            stepFormId?: number;
            stepId?: number;
            componentUid: string;
            meta?: StepMeta;
            salesOrderItemId?;
            componentId?;
            flatRate?: boolean;
            sectionOverride?: StepComponentMeta["sectionOverride"];
        };
    };
    sequence: {
        formItem: string[];
        stepComponent: { [itemUid in string]: string[] };
        multiComponent: { [itemUid in string]: string[] };
    };
}
export interface SalesFormZusData extends SalesFormFields {
    currentTab?: "invoice" | "info" | "address";
    setting: GetSalesBookForm["salesSetting"];
    // data: GetSalesBookForm;
    pricing: GetSalesBookForm["pricing"];
    _taxForm: GetSalesBookForm["_taxForm"];
    profiles: GetSalesBookForm["data"]["profiles"];

    formStatus: "ready" | "loading" | "saving";
    kvFilteredStepComponentList: {
        [stepItemUid in string]: GetStepComponent[];
    };
    kvStepComponentList: {
        [stepUid in string]: GetStepComponent[];
    };
    oldFormState?: SalesFormFields;
}
export type SalesSettingsMeta = {
    route: {
        [primaryRouteUid in string]: {
            routeSequence: { uid: string }[];
            externalRouteSequence: { uid: string }[][];
            route?: {
                [stepUid in string]: string;
            };
            externalRoute?: {
                [stepUid in string]: string;
            };
            config: {
                noHandle?: boolean;
                hasSwing?: boolean;
                addonQty?: boolean;
                production?: boolean;
                shipping?: boolean;
            };
        };
    };
};
export interface StepComponentForm {
    title: string;
    id?;
    img?: string;
    stepId;
    isDoor?: boolean;
    custom?: boolean;
    productCode?: string;
}

export type QtyControlType =
    | "qty"
    | "prodAssigned"
    | "prodCompleted"
    | "dispatchAssigned"
    | "dispatchInProgress"
    | "dispatchCompleted"
    | "dispatchCancelled";
export type QtyControlByType = {
    [type in QtyControlType]: Omit<Prisma.QtyControlCreateManyInput, "type"> & {
        type: QtyControlType;
    };
};
export type CustomerProfileMeta = {
    net: string;
    goodUntil: number;
    taxCode?: string;
};
