import { useEffect, useMemo, useRef, useState } from "react";
import {
    useFormDataStore,
    ZusComponent,
} from "../../_common/_stores/form-data-store";

import { StepHelperClass } from "../../_utils/helpers/zus/step-component-class";
import { useSticky } from "../../_hooks/use-sticky";
import { useDebounce } from "@/hooks/use-debounce";
import { Edit3, EyeOff, Layout } from "lucide-react";

export type UseStepContext = ReturnType<typeof useStepContext>;
export function useStepContext(stepUid) {
    const [selectionState, setSelectionState] = useState({
        uids: {},
        count: 0,
    });
    const [stepComponents, setStepComponents] = useState<ZusComponent[]>([]);
    const [q, setQ] = useState("");
    const db = useDebounce(q, 300);

    const [tabComponents, setTabComponents] = useState<ZusComponent[]>([]);
    const [filteredComponents, setFilteredComponents] = useState<
        ZusComponent[]
    >([]);
    // const [tabs, setTabs] = useState<
    //     { title; count; Icon?; tab: typeof tab }[]
    // >([]);
    function selectAll() {
        setSelectionState((pre) => {
            const uids = {};
            filteredComponents.map((s) => (uids[s.uid] = true));
            console.log(uids);

            return {
                uids,
                count: filteredComponents.length,
            };
        });
    }
    // const _items = useFormDataStore().kvFilteredStepComponentList?.[stepUid];
    const tabs = useMemo(() => {
        const tabCounts = {
            main: stepComponents.filter(
                (s) => s._metaData.visible && !s._metaData.custom
            ).length,
            custom: stepComponents.filter((s) => s._metaData.custom).length,
            hidden: stepComponents.filter(
                (s) => !s._metaData.visible && !s._metaData.custom
            ).length,
        };

        return [
            {
                title: "Default Components",
                count: tabCounts.main,
                Icon: Layout,
                tab: "main",
            },
            {
                title: "Custom Components",
                count: tabCounts.custom,
                Icon: Edit3,
                tab: "custom",
            },
            {
                title: "Hidden Components",
                count: tabCounts.hidden,
                Icon: EyeOff,
                tab: "hidden",
            },
        ];
    }, [stepComponents]);
    const [tab, setTab] = useState<"main" | "custom" | "hidden">("main");

    useEffect(() => {
        setTabComponents(
            stepComponents.filter((s) => {
                const md = s._metaData;
                return tab == "custom"
                    ? md.custom
                    : tab == "hidden"
                    ? !md.visible
                    : md.visible;
            })
        );
    }, [tab, stepComponents]);
    useEffect(() => {
        const _filtered = stepComponents.filter((s) => {
            const filters = [];
            if (q)
                filters.push(
                    s.title?.toLowerCase()?.includes(q?.toLowerCase())
                );
            switch (tab) {
                case "hidden":
                    filters.push(!s._metaData.visible);
                    break;
                case "main":
                    filters.push(s._metaData.visible);
                    filters.push(!s._metaData.custom);
                    break;
                case "custom":
                    filters.push(s._metaData.custom);
                    break;
            }
            return filters.every((s) => s);
        });
        setFilteredComponents(_filtered);
        // console.log(_filtered);
        // console.log(stepComponents.length);
    }, [stepComponents, db, tab]);
    const salesMultiplier = useFormDataStore(
        (s) => s.metaData?.salesMultiplier
    );
    const stepHelper = useMemo(() => new StepHelperClass(stepUid), [stepUid]);
    const zusStepComponents = stepHelper.getStepComponents;
    useEffect(() => {
        stepHelper.fetchStepComponents().then(setStepComponents);
    }, [salesMultiplier, zusStepComponents]);

    const sticky = useSticky((bv, pv, { top, bottom }) => !bv && pv);
    const props = {
        stepUid,
        items: filteredComponents,
        sticky,
        // searchFn
    };

    return {
        tabs,
        setTab,
        tab,
        tabComponents,
        stepComponents,
        selectAll,
        q,
        setQ,
        items: filteredComponents || [],
        setItems: setFilteredComponents,
        sticky,
        cls: stepHelper,
        props,
        stepUid,
        clearSelection() {
            setSelectionState({
                uids: {},
                count: 0,
            });
        },
        toggleComponent(componentUid) {
            setSelectionState((current) => {
                const state = !current.uids?.[componentUid];
                const count = current.count + (state ? 1 : -1);
                const resp = {
                    uids: {
                        ...current?.uids,
                        [componentUid]: state,
                    },
                    count,
                };

                return resp;
            });
        },

        selectionState,
    };
}
