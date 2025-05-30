"use client";

import {
    getSalesLaborCost,
    saveSalesLaborCost,
} from "@/actions/sales-labor-cost";
import { useLaborCostModal } from "@/hooks/use-labor-cost-modal";
import { Dialog, DialogContent, DialogTitle } from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";
import FormInput from "../common/controls/form-input";
import { FormActionButton } from "../form-action-button";
import { useAction } from "next-safe-action/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveSalesLaborCostSchema } from "@/actions/schema";

export function LaborCostModal() {
    const { params } = useLaborCostModal();

    if (!params.laborCostModal) return null;
    return <Content />;
}
function Content() {
    const data = useAsyncMemo(async () => {
        return await getSalesLaborCost();
    }, []);
    const form = useForm({
        resolver: zodResolver(saveSalesLaborCostSchema),
        defaultValues: {
            rate: null,
        },
    });
    useEffect(() => {
        if (data) {
            form.reset({
                rate: data.rate,
            });
        }
    }, [data]);
    const { params, setParams } = useLaborCostModal();

    const save = useAction(saveSalesLaborCost, {
        onSuccess(args) {
            const rate = args.input.rate;
            setParams({
                laborCostModal: null,
                costUpdate: {
                    id: args.data?.id,
                    rate: args.data?.rate,
                },
            });
        },
    });
    return (
        <Dialog
            onOpenChange={(e) => {
                setParams(null);
            }}
            open={params.laborCostModal}
        >
            <DialogContent className="min-w-max max-w-lg">
                <DialogTitle>Labor Cost</DialogTitle>
                <Form {...form}>
                    <FormInput
                        control={form.control}
                        label={"Labor Cost"}
                        name="rate"
                        type="number"
                    />
                    <FormActionButton action={save} />
                </Form>
            </DialogContent>
        </Dialog>
    );
}
