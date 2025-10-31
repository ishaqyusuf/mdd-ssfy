"use client";

import { useEffect, useState } from "react";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { DykeShelfCategories } from "@/db";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";

import { Form } from "@gnd/ui/form";

import { _getShelfCategories } from "../../../form/_action/get-shelf-categories";
import { IDykeShelfProducts, IDykeShelfProductsForm } from "../../../type";

interface Props {
    data?: IDykeShelfProductsForm;
}
export default function ShelfItemFormModal({
    data = {
        meta: {
            categoryIds: [-1],
        },
    } as any,
}: Props) {
    data._meta = {
        categories: data.meta.categoryIds?.map((id) => ({ id })),
    } as any;
    const parentCategoryId = data._meta.categories?.[0]?.id;
    if (parentCategoryId && parentCategoryId > 0)
        data._meta.parentCategoryId = parentCategoryId;

    const form = useForm<IDykeShelfProductsForm>({
        defaultValues: data,
    });
    const cats = useFieldArray({
        control: form.control,
        name: "_meta.categories",
        keyName: "_id",
    });
    return (
        <Form {...form}>
            <Modal.Content>
                <Modal.Header title="Shelf Item" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <FormInput
                            control={form.control}
                            name="title"
                            label="Product Title"
                        />
                    </div>
                    <FormInput
                        control={form.control}
                        name="unitPrice"
                        type="number"
                        label="Price"
                    />
                    <div className=""></div>
                    {cats.fields.map((cat, index) => (
                        <div key={cat._id}>
                            <ShelfCategory
                                index={index}
                                field={cat}
                                fields={cats.fields}
                            />
                        </div>
                    ))}
                </div>
            </Modal.Content>
        </Form>
    );
}
function ShelfCategory({ index, fields, field }) {
    const [categories, setCategories] = useState<DykeShelfCategories[]>([]);
    const form = useFormContext<IDykeShelfProductsForm>();
    // const parentCategoryId = form.watch("_meta.parentCategoryId");
    useEffect(() => {}, [field]);
    useEffect(() => {
        (async () => {
            const c = await _getShelfCategories({
                categoryId: field.value || null,
            });

            setCategories(c);
        })();
    }, [index, fields, field]);
    // if (!shelf.categoryForm) return <></>;

    return (
        <div>
            <FormSelect
                label={index == 0 ? "Category" : "Sub Category"}
                control={form.control}
                name={`_meta.categories.${index}.id`}
                defaultValue={field.id}
                // onValueChange={(field, v) => {
                //     const value = Number(v) || null;
                //     field.onChange(value);
                //     shelf.categorySelected(index, value);
                //     shelf.clearEstimates();
                // }}
                placeholder={"Category"}
                options={categories.map(({ name: label, id: value }) => ({
                    label,
                    value: value.toString(),
                }))}
                titleKey={"label"}
                valueKey="value"
            />
        </div>
    );
}
