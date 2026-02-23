import { cn, generateRandomString, inToFt, sum, toNumber } from "@/lib/utils";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { _modal } from "@/components/common/modal/provider";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { formatMoney } from "@/lib/use-number";
import { Door } from "../door-swap-modal";
import { ftToIn } from "@/app/(clean-code)/(sales)/_common/utils/sales-utils";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import createContextFactory from "@/utils/context-factory";
import { useFormDataStore } from "../../../_common/_stores/form-data-store";

interface Props {
    cls?: ComponentHelperClass;
    door?: Door;
}
export const { useContext: useCtx, Provider: DoorSizeSelectProvider } =
    createContextFactory((props: Props) => {
        const { cls, door } = props;
        const swapPaths = door?.sizeList?.map((s) => s.path);
        const supplierDep = useFormDataStore((s) => {
            const doorStep = Object.entries(s.kvStepForm).find(
                ([itemStepUid, stepForm]) =>
                    itemStepUid?.startsWith(`${cls.itemUid}-`) &&
                    stepForm?.title === "Door",
            )?.[1];
            return doorStep?.formStepMeta?.supplierUid || null;
        });

        const memoied = useMemo(
            () => composeDoor(cls, door),
            [cls, door, supplierDep],
        );
        const { selections, sizePriceList, priceModel, routeConfig } = memoied;
        const form = useForm({
            defaultValues: {
                selections,
            },
        });

        useEffect(() => {
            form.reset({
                selections,
            });
        }, [form, selections]);
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
            door,
            form,
            priceChanged,
            removeSelection,
            cls,
            swapDoor,
            priceModel,
            nextStep,
            pickMore,
            sizePriceList,
            routeConfig,
            openPriceForm,
            togglePriceForm(uid) {
                setOpenPriceForm((prev) => {
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
    });
