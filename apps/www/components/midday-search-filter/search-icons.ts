import { IconKeys } from "../_v1/icons";
import { SearchParamsKeys } from "../(clean-code)/data-table/search-params";

export const searchIcons: Partial<{
    [id in SearchParamsKeys]: IconKeys;
}> = {
    "order.no": "orders",
    "customer.name": "user",
    // "sales.rep": "r"
};
