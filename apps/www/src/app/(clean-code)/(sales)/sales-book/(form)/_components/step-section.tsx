import { useEffect, useMemo, useRef } from "react";
import { Env } from "@/components/env";
import { ShelfItems } from "@/components/forms/sales-form/shelf-items";
import { useIsVisible } from "@/hooks/use-is-visible";
import { formatMoney } from "@/lib/use-number";
import { motion } from "framer-motion";

import { Badge } from "@gnd/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { StepHelperClass } from "../_utils/helpers/zus/step-component-class";
import { ComponentsSection } from "./components-section";
import HousePackageTool from "./hpt-step";
import MouldingLineItem from "./moulding-step";
import ServiceLineItem from "./service-step";

interface Props {
    stepUid?;
    isFirst;
    isLast;
}
export function StepSection({ stepUid, isFirst, isLast }: Props) {
    const zus = useFormDataStore();
    // const stepForm = zus?.kvStepForm?.[stepUid];
    const [uid] = stepUid?.split("-");
    const zItem = zus?.kvFormItem?.[uid];
    const { cls, Render, itemStepUid } = useMemo(() => {
        const cls = new StepHelperClass(stepUid);
        const ret = {
            cls,
            isHtp: cls.isHtp(),
            isShelfItems: cls.isShelfItems(),
            isMouldingLineItem: cls.isMouldingLineItem(),
            isServiceLineItem: cls.isServiceLineItem(),
            Render: ComponentsSection as any,
            itemStepUid: stepUid,
        };
        if (ret.isHtp) ret.Render = HousePackageTool;
        else if (ret.isShelfItems) ret.Render = ShelfItems;
        else if (ret.isMouldingLineItem) ret.Render = MouldingLineItem;
        else if (ret.isServiceLineItem) ret.Render = ServiceLineItem;
        return ret;
    }, [
        stepUid,
        // , zus
    ]);

    if (
        (!zItem.collapsed && zus.currentTab == "invoice") ||
        (zItem.collapsed && (isFirst || isLast))
    )
        return (
            <div>
                <div className="">
                    <Collapsible open={zItem.currentStepUid == stepUid}>
                        <StepSectionHeader cls={cls} />
                        <CollapsibleContent className="flex">
                            <Content>
                                <Render itemStepUid={stepUid} />
                            </Content>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </div>
        );
}
function Content({ children }) {
    const { isVisible, elementRef } = useIsVisible({});
    useEffect(() => {
        setTimeout(() => {
            if (!isVisible && elementRef.current) {
                const offset = -150; // Adjust this value to your desired offset
                const elementPosition =
                    elementRef.current.getBoundingClientRect().top +
                    window.scrollY;
                const offsetPosition = elementPosition + offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        }, 300);
    }, []);

    return (
        <motion.div
            ref={elementRef}
            transition={{ duration: 1 }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}

function StepSectionHeader({ cls }: { cls: StepHelperClass }) {
    const zus = useFormDataStore();
    const stepForm = zus?.kvStepForm?.[cls.itemStepUid];
    //   const cls = useMemo(() => ctx.cls.hasSelections(), [ctx.cls]);
    const { ...stat } = useMemo(() => {
        // const cls = new StepHelperClass(stepUid);
        return {
            hasSelection: cls.hasSelections(),
            selectionCount: cls.getTotalSelectionsCount(),
            selectionQty: cls.getTotalSelectionsQty(),
        };
    }, [cls.itemStepUid]);

    return (
        <CollapsibleTrigger asChild>
            <div className="border border-muted-foreground/20 dark:border-muted-foreground">
                <button
                    className="flex h-8 w-full items-center gap-4 space-x-2  bg-muted-foreground/5 p-1 px-4 text-sm uppercase hover:bg-muted-foreground hover:text-muted"
                    onClick={(e) => {
                        e.preventDefault();
                        cls.toggleStep();
                    }}
                >
                    <Label>{stepForm?.title}</Label>
                    <div className="flex-1"></div>
                    <span className="font-mono">{stepForm.value}</span>
                    {stepForm.salesPrice ? (
                        <Badge variant="destructive" className="h-5 px-1">
                            ${formatMoney(stepForm.salesPrice)}
                        </Badge>
                    ) : null}
                    {!stat.hasSelection || (
                        <>
                            <Badge variant="destructive" className="h-5 px-1">
                                selection: {stat.selectionCount}
                            </Badge>
                            <Badge variant="destructive" className="h-5 px-1">
                                qty: {stat.selectionQty}
                            </Badge>
                        </>
                    )}
                </button>
            </div>
        </CollapsibleTrigger>
    );
}
