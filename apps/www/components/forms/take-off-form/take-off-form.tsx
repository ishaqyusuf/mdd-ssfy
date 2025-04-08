import { createContext, useContext } from "react";
import { getTakeOffForm } from "@/actions/get-take-off-form";
import { useFieldArray, useForm } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { Form } from "@gnd/ui/form";

import { TakeOffSection } from "./take-off-section";

interface Props {
    salesId: number;
    refreshToken?: null;
}
const Context = createContext<ReturnType<typeof useTakeOffFormCtx>>(
    null as any,
);
const useTakeOffFormCtx = (salesId, refreshToken) => {
    const takeOffData = useAsyncMemo(async () => {
        return await getTakeOffForm(salesId);
    }, [salesId, refreshToken]);
    const form = useForm({
        defaultValues: {
            list: takeOffData?.takeOff?.list,
        },
    });
    const listArray = useFieldArray({
        control: form.control,
        keyName: "_id",
        name: "list",
    });
    return {
        form,
        list: listArray.fields,
        components: takeOffData?.items,
    };
};
export const useTakeOffForm = () => useContext(Context);
export function TakeOffForm({ salesId, refreshToken }: Props) {
    const ctx = useTakeOffFormCtx(salesId, refreshToken);

    return (
        <Context.Provider value={ctx}>
            <Form {...ctx.form}>
                <div>
                    {ctx?.list?.map((_, i) => (
                        <TakeOffSection index={i} key={i} />
                    ))}
                    <TakeOffSection index={-1} />
                </div>
            </Form>
        </Context.Provider>
    );
}
