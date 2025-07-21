import { createContext, useContext, useEffect } from "react";
import { getTakeOffForm } from "@/actions/get-take-off-form";
import Button from "@/components/common/button";
import { useFieldArray, useForm } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";

import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";

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
        const resp = await getTakeOffForm(salesId);

        return resp;
    }, [salesId, refreshToken]);
    const form = useForm({
        defaultValues: {
            list: takeOffData?.takeOff?.list,
        },
    });
    const w = form.watch();
    const listArray = useFieldArray({
        control: form.control,
        keyName: "_id",
        name: "list",
    });
    // useEffect(() => {
    //     const last = listArray.fields.at(-1);
    //     if (last?.title || last?.components.some((c) => c.itemUid)) return;

    //     listArray.append({
    //         components: [],
    //         index: listArray.fields.length,
    //         title: "",
    //     });
    // }, [listArray]);
    useEffect(() => {
        const timer = setTimeout(() => {
            const last: any = listArray.fields.at(-1);

            const isLastEmpty =
                last &&
                (!last.title || last.components.some((c) => !c.itemUid));

            if (!isLastEmpty) {
                listArray.append({
                    components: [],
                    index: listArray.fields.length,
                    title: "",
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [w, listArray.fields]);

    // useEffect(() => {
    //     setTimeout(() => {
    //         if (
    //             !listArray.fields.some(
    //                 (f) => !f.title || f.components.some((c) => !c.itemUid),
    //             )
    //         )
    //             listArray.append({
    //                 components: [],
    //                 index: listArray.fields.length,
    //                 title: "",
    //             });
    //     }, 1000);
    // }, [w, listArray]);
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
                <div className="space-y-2">
                    {ctx?.list?.map((_, i) => (
                        <TakeOffSection index={i} key={i} />
                    ))}
                    {/* <TakeOffSection index={-1} /> */}
                    <Button className="w-full">
                        <Icons.Add className="size-4" />
                        Add
                    </Button>
                </div>
            </Form>
        </Context.Provider>
    );
}
