import { SalesFormItem } from "../../../types";
import { ItemHelperClass } from "./item-helper-class";
import { SaveSalesClass } from "./save-sales-class";

interface Props {
    ctx: SaveSalesClass;
    formItem: SalesFormItem;
    itemId;
}
export function saveShelfHelper({ ctx, formItem, itemId, ...props }: Props) {
    const shelfItems = formItem.shelfItems;
    const itemCtx = new ItemHelperClass(ctx, itemId);
    itemCtx.generateNonDoorItem();
}
