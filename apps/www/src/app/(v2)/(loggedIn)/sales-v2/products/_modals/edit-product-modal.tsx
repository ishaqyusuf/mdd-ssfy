"use client";

import { useEffect } from "react";
import RenderForm from "@/_v2/components/common/render-form";
import Btn from "@/components/_v1/btn";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { useModal } from "@/components/common/modal/provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DialogFooter, DialogHeader, DialogTitle } from "@gnd/ui/dialog";

import { saveDykeProduct } from "../_actions/save-dyke-product";
import { IDykeProduct } from "../_components/products-table";
import { getDykeCategoriesList } from "../../_actions/dyke-categories-list";

interface Props {
    data?: IDykeProduct;
}
const Schema = z.object({
    id: z.number().nullable(),
    title: z.string().min(2),
    description: z.string(),
    noteRequired: z.boolean().default(false),
    price: z.number().nullable(),
    qty: z.number().nullable(),
    categoryId: z.number().nullable(),
    img: z.string().nullable(),
    value: z.string().nullable(),
});
export default function EditProductModal({ data }: Props) {
    // const defaultValues = {}
    const modal = useModal();
    const form = useForm<IDykeProduct>({
        resolver: zodResolver(Schema),
        defaultValues: {
            ...(data || {}),
        },
    });
    useEffect(() => {}, []);
    async function save(data) {
        await saveDykeProduct(data);
        modal.close();
        toast.success("Saved");
    }
    return (
        <RenderForm {...form}>
            <DialogHeader>
                <DialogTitle>
                    <span>Edit Product</span>
                </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
                <FormInput
                    control={form.control}
                    name="title"
                    label="Product Title"
                />
                <FormInput
                    control={form.control}
                    name="description"
                    type="textarea"
                    label="Product Description"
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        control={form.control}
                        name="qty"
                        type="number"
                        label="Qty"
                    />
                    <FormInput
                        control={form.control}
                        name="price"
                        type="number"
                        label="Price"
                    />

                    <FormSelect
                        control={form.control}
                        name="categoryId"
                        loader={getDykeCategoriesList}
                        label="Category"
                    />
                </div>
                <FormCheckbox
                    control={form.control}
                    name="noteRequired"
                    label="Custom Input Required"
                />
            </div>
            <DialogFooter>
                <div className="flex justify-end">
                    <Btn
                        onClick={() => form.handleSubmit(save)()}
                        isLoading={modal?.loading}
                    >
                        Save
                    </Btn>
                </div>
            </DialogFooter>
        </RenderForm>
    );
}
