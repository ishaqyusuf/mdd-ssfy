"use client";

import { omit } from "lodash";
import { DykeDoorType } from "../../type";
import { useDykeForm } from "./form-context";
import { UseMultiComponentItem } from "./use-multi-component-item";

interface Props {
    price?;
    doorType: DykeDoorType;
    tax?: boolean;
}
export default function useFooterEstimate() {
    const form = useDykeForm();

    function updateFooterPrice(uid, { price, doorType, tax }: Props) {
        const footer = form.getValues("footer");
        footer.footerPricesJson = JSON.parse(footer.footerPrices);

        footer.footerPricesJson[uid] = {
            doorType,
            price,
            tax,
        };
        form.setValue(
            "footer.footerPrices",
            JSON.stringify(footer.footerPricesJson)
        );
    }
    return {
        updateFooterPrice,
        lineItemDeleted(ctx: UseMultiComponentItem) {
            const itemData = ctx.item.get.itemArray();
            console.log(itemData.multiComponent.components);
            Object.entries(itemData.multiComponent.components).map(
                ([title, cData]) => {
                    if (title == ctx.componentTitle) {
                        const footer = { ...form.getValues("footer") };
                        footer.footerPricesJson = JSON.parse(
                            footer.footerPrices
                        );
                        // console.log(footer.footerPricesJson);
                        // footer.footerPricesJson[cData.uid] = {};
                        // footer.footerPricesJson=
                        footer.footerPricesJson = omit(
                            footer.footerPricesJson,
                            [cData?.uid]
                        );
                        console.log(footer.footerPricesJson[cData.uid]);

                        form.setValue(
                            "footer.footerPrices",
                            JSON.stringify(footer.footerPricesJson)
                        );
                    }
                }
            );
        },
    };
}
