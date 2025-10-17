import { convertToNumber, toFixed } from "@/lib/use-number";
import { ISalesSettingMeta, ISalesWizard } from "@/types/post";
import {
    FooterRowInfo,
    IFooterInfo,
    ISalesOrderForm,
    ISalesOrderItem,
    ISalesOrderItemMeta,
    WizardKvForm,
} from "@/types/sales";
import { openModal } from "../modal";
import { removeEmptyValues } from "../utils";
import { deepCopy } from "../deep-copy";

export function insertLine(items, index, item) {
    if (!items) items = [];
    return [...items.slice(0, index), item, ...items.slice(index)];
}

export function openComponentModal(item: ISalesOrderItem, rowIndex) {
    let c = item?.meta?.components;
    const components = c || {};
    openModal("salesComponent", {
        rowIndex,
        item,
        components,
    });
}
interface ComposeItemDescriptionProps {
    wizard: ISalesWizard;
    kvForm: WizardKvForm;
}
export function composeItemDescription({
    wizard,
    kvForm,
}: ComposeItemDescriptionProps) {
    let description = wizard.titleMarkdown;
    wizard.form.map((f) => {
        let fv = kvForm[f.uuid];
        let title = fv?.title || f?.defaultPrintValue || "";
        description = description.replace(`@${f.label}`, title);
    });
    description = description.replace(/^\||\|$/g, "");
    description = description.replace(/\|\s*\|/g, "|");
    description = description.replace(/\|\s*$/g, "");

    return description;
}
export function copySalesItem(item) {
    const { id, meta, createdAt, updatedAt, ...itemData } = deepCopy(
        item || {
            meta: {},
        }
    ) as ISalesOrderItem;
    const { produced_qty, uid, ..._meta } = meta as ISalesOrderItemMeta;
    return {
        ...itemData,
        meta: _meta,
    };
}
