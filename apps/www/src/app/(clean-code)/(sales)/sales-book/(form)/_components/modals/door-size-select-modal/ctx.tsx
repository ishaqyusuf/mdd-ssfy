// import { generateRandomString } from "@/lib/utils";
import { generateRandomString } from "@/lib/utils";
import { createContext, useContext, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { _modal } from "@/components/common/modal/provider";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { Door } from "../door-swap-modal";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";

export const useCtx = () => useContext(DoorSizeSelectContext);
export const DoorSizeSelectContext =
    createContext<ReturnType<typeof useInitContext>>(null);

export function useInitContext(cls: ComponentHelperClass, door?: Door) {
    const swapPaths = door?.sizeList?.map((s) => s.path);
    const memoied = useMemo(() => {
        return composeDoor(cls, door);
    }, [cls, door]);
    const { selections, sList, priceModel, routeConfig } = memoied;
    const form = useForm({
        defaultValues: {
            selections,
        },
    });
    function updateDoorForm(clear = false) {
        const data = form.getValues();
        return updateDoorGroupForm(cls, data.selections, swapPaths, clear);
    }
    function removeSelection() {
        updateDoorForm(true);
        _modal.close();
    }
    function pickMore() {
        updateDoorForm();
        _modal.close();
    }
    const [openPriceForm, setOpenPriceForm] = useState({});

    function nextStep() {
        updateDoorForm();
        cls.nextStep();
        _modal.close();
    }
    function swapDoor() {
        updateDoorForm();
        _modal.close();
        cls.dotUpdateItemForm("swapUid", generateRandomString());
    }
    function priceChanged(size, price) {
        form.setValue(
            `selections.${cls.componentUid}-${size}.basePrice`,
            price,
        );
        form.setValue(
            `selections.${cls.componentUid}-${size}.salesPrice`,
            cls.calculateSales(price),
        );
    }

    return {
        form,
        priceChanged,
        removeSelection,
        cls,
        swapDoor,
        priceModel,
        nextStep,
        pickMore,
        sizeList: sList,
        routeConfig,
        openPriceForm,
        togglePriceForm(uid) {
            setOpenPriceForm((prev) => {
                console.log({ prev });
                const newState = {
                    [uid]: !prev?.[uid],
                };
                Object.entries({ ...prev }).map(([k, v]) => {
                    if (k != uid) newState[k] = false;
                });

                return newState;
            });
        },
    };
}
