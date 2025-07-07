import { OmitMeta } from "./type";

export interface IProduct {
    variants: IProductVariant[];
}

export type IProductVariant = OmitMeta<any> & {
    meta: IProductVariantMeta;
    product: LegacyProduct;
};
export interface IProductVariantMeta {
    componentTitle;
}
export interface LegacyProduct extends OmitMeta<any> {}
