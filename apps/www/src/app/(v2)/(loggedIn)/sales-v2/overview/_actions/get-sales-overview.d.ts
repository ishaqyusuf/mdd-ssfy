import { ISalesType } from "@/types/sales";
export declare function getSalesOverview({ type, slug, }: {
    slug: string;
    type: ISalesType;
    dyke?: boolean;
}): Promise<any>;
export declare function viewSale(type: any, slug: any, deletedAt?: any): Promise<any>;
