import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { sum, toNumber } from "../utils";
import { formatMoney } from "../use-number";
import { composeDoor } from "./compose-door";

interface Params {
    forceSelect?: boolean;
}
export function updateDoorGroupForm(
    cls: ComponentHelperClass,
    selections: ReturnType<typeof composeDoor>["selections"],
    swapPaths = null,
    clear = false,
    params: Params = {},
) {
    let groupItem = cls.getItemForm().groupItem;
    if (!groupItem && !clear) {
        groupItem = {
            type: "HPT",
            form: {},
            itemIds: [],
            stepUid: cls.stepUid,
            itemType: cls.getItemType(),
            pricing: {},
            qty: {
                lh: 0,
                rh: 0,
                total: 0,
            },
        };
    }
    groupItem.type = "HPT";
    if (cls.component) {
        groupItem.doorStepProductId = cls.component.id;
        groupItem.doorStepProductUid = cls.component.uid;
    }
    if (clear) groupItem = null as any;
    else {
        const _uids = Object.keys(selections);
        groupItem.itemIds = groupItem.itemIds.filter(
            (id) => !_uids.includes(id) && !swapPaths?.includes(id),
        );
        swapPaths?.map((p) => {
            delete groupItem.form[p];
        });
        Object.entries(selections).map(([uid, data]) => {
            const s = sum([data.qty.lh, data.qty.rh]);
            if (!data.qty.total && s) {
                data.qty.total = s;
            }
            const selected = !data.qty.total == false;
            if ((selected && !clear) || params?.forceSelect) {
                groupItem.itemIds.push(uid);
                groupItem.form[uid] = {
                    stepProductId: {
                        id: groupItem.doorStepProductId,
                    },
                    meta: {
                        description: "",
                        produceable: false,
                        taxxable: false,
                    },
                    ...(groupItem.form[uid] || {}),
                    swing: data.swing,
                    qty: data.qty,
                    selected: true,
                    pricing: {
                        addon: "",
                        customPrice: "",
                        ...(groupItem.form[uid]?.pricing || {}),
                        itemPrice: {
                            salesPrice: data?.salesPrice,
                            basePrice: data?.basePrice,
                        },
                        unitPrice: formatMoney(
                            sum([
                                groupItem?.pricing?.components?.salesPrice,
                                data?.salesPrice,
                            ]),
                        ),
                    },
                };
            } else {
                delete groupItem.form[uid];
            }
        });
        groupItem.qty = {
            lh: 0,
            rh: 0,
            total: 0,
        };
        Object.entries(groupItem.form).map(([k, v]) => {
            groupItem.qty.lh += toNumber(v.qty.lh);
            groupItem.qty.rh += toNumber(v.qty.rh);
            groupItem.qty.total += toNumber(v.qty.total);
        });
    }

    cls.dotUpdateItemForm("groupItem", groupItem);
    return groupItem;
    cls.updateComponentCost();
    cls.updateGroupedCost();
    cls.calculateTotalPrice();
    return groupItem;
}
