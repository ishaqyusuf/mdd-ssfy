import { useFieldArray, useForm } from "react-hook-form";
import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { createContext, useContext } from "react";
import { toast } from "sonner";
import { saveSalesSettingUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";

export function useSettingsContext() {
    const zus = useFormDataStore();
    const salesSetting = zus?.setting;

    const form = useForm({
        defaultValues: {
            data: salesSetting,
        },
    });
    const arr = useFieldArray({
        control: form.control,
        name: "data.sectionKeys",
        keyName: "_id",
    });
    function createSection(uid) {
        form.setValue(`data.setting.data.route.${uid}`, {
            routeSequence: [{ uid: "" }],
            externalRouteSequence: [],
            config: {
                noHandle: false,
                hasSwing: false,
                addonQty: false,
            },
        });
        arr.append({
            uid,
        });
    }
    return {
        createSection,
        arr,
        form,
        salesSetting,
        zus,
        steps: salesSetting.steps,
        async save() {
            const data = form.getValues();
            const meta = data.data.setting.data;
            const resp = await saveSalesSettingUseCase(meta);
            toast.success("Saved");
        },
    };
}
type Type = ReturnType<typeof useSettingsContext>;
export const Context = createContext<Type>(null as any);
export const useSettings = () => useContext(Context);
