import { useContext, useEffect, useState } from "react";
import { DykeItemFormContext, useDykeForm } from "./form-context";
import { MultiDyke } from "../../type";
import { generateRandomString } from "@/lib/utils";

export default function useMultiDykeForm() {
    const form = useDykeForm();
    const [tabs, setTabs] = useState<{ title; deleted?: boolean }[]>([]);
    const [currentTab, setCurrentTab] = useState<string>();
    const [ready, setReady] = useState(false);
    const item = useContext(DykeItemFormContext);
    // const rowIndex = form.watch(
    //     `itemArray.${item.rowIndex}.multiComponent.rowIndex` as any
    // );
    function setValue(key: keyof MultiDyke, value) {
        form.setValue(
            `itemArray.${item.rowIndex}.multiComponent.${key}` as any,
            value
        );
    }
    function addServiceLine() {
        const n = generateRandomString();
        setValue(`components.${n}` as any, {
            checked: true,
            tax: false,
        });
        setTabs((tabs) => {
            return [
                ...tabs,
                {
                    title: n,
                    toolId: null,
                },
            ];
        });
    }
    const generateMultiItems = () => {
        const formData = form.getValues();
        const itemData = item.get.itemArray();
        const multiComp = itemData.multiComponent;
        let uid = multiComp.uid;
        if (!uid) {
            uid = generateRandomString(5);
            setValue("uid", uid);
        }

        Object.entries(multiComp.components).map(([title, compData]) => {
            // [].findIndex()
            let currentItemIndex = formData.itemArray.findIndex((item) => {
                const toolId =
                    item.item.housePackageTool?.doorId ||
                    item.item.housePackageTool?.moldingId;
                return (
                    item.item.multiDykeUid == uid &&
                    (compData.itemId
                        ? compData.itemId == item.item.id
                        : compData.toolId == toolId)
                );
            });
            // const item
        });
    };
    const initialize = () => {
        const formData = form.getValues();
        const itemData = item.get.itemArray();
        setValue("rowIndex", item.rowIndex);

        const _tabs = Object.entries(itemData.multiComponent.components)
            .map(([productTitle, cData]) => {
                if (!cData.checked) return null;
                return { title: productTitle, toolId: cData.toolId };
            })
            .filter(Boolean);
        setTabs(_tabs as any);
        setCurrentTab(_tabs?.[0]?.title);
        setReady(true);
        generateMultiItems();
    };

    return {
        tabs,
        currentTab,
        removeTab(title) {
            setTabs((_tabs) => {
                return [..._tabs].map((tab) => {
                    if (title == tab.title) {
                        tab.deleted = true;
                    }
                    return tab;
                });
                // .filter((t) => t.title != title);
            });
        },
        setCurrentTab,
        ready,
        initialize,
        addServiceLine,
    };
}
