"use client";

import React, { useEffect, useState } from "react";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import FormSelect from "@/components/common/controls/form-select";
import { useModal } from "@/components/common/modal/provider";
import { DykeShelfCategories } from "@/db";
import { cn } from "@/lib/utils";
// import { ArrowDown } from "lucide-react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@gnd/ui/command";
import { Form, FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { _getShelfCategories } from "../../../../_action/get-shelf-categories";
import { getShelfProducts } from "../../../../_action/get-shelf-products.actions";
import useShelfItem, { IUseShelfItem } from "../../../../_hooks/use-shelf-item";
import ShelfItemModal from "../../../modals/shelf-item-modal";

interface Props {
    shelfIndex;
    deleteItem;
}

export default function ShelfItemsBlock({ shelfIndex, deleteItem }: Props) {
    const shelf = useShelfItem(shelfIndex);
    const {
        form,
        item,
        catArray: { fields: categories },
        categoryForm,
        shelfItemKey,
    } = shelf;

    async function getProducts(parentCategoryId, categoryId) {
        const { subCategoriesCount, products } = await getShelfProducts(
            parentCategoryId,
            categoryId,
        );

        if (subCategoriesCount) {
            // append({ cid: -1 });
        }
    }
    const modal = useModal();
    function shelfItemForm(index?) {
        const catArray = categoryForm.getValues("ids");

        const categoryIds = catArray?.map((c) => c.id);

        const generatedProd: any = shelf.prodArray.fields[index];
        const prodId = generatedProd?.item?.id;
        let prod = shelf.products?.find(
            (p) => p.id == generatedProd?.item?.productId,
        );
        if (!prod && index) {
            toast.error("Something went wrong editing product");
            return;
        }
        if (!prod)
            prod = {
                categoryId: categoryIds?.slice(-1)?.[0],
                parentCategoryId: categoryIds?.[0],
                meta: {
                    categoryIds,
                },
            } as any;

        // console.log({ index, categoryIds, prod, generatedProd })
        modal.openModal(
            <ShelfItemModal
                onCreate={(prod) => shelf.productUpdated(prod, index)}
                prod={prod}
                categoryIds={categoryIds}
            />,
        );
        // shelf.prodArray.remove(index);
    }
    if (!shelf.categoryForm) return <></>;

    return (
        <Form {...categoryForm}>
            <TableRow>
                <TableCell className="flex" valign="top">
                    {shelfIndex + 1}
                </TableCell>
                <TableCell className="" valign="top">
                    <div className="">
                        {categories.map((field, index) => (
                            <div className="" key={index}>
                                <ShelfCategory
                                    field={field as any}
                                    index={index}
                                    shelf={shelf}
                                />
                                {categories.length - 1 > index && (
                                    <div className="flex justify-center">
                                        {"|"}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </TableCell>
                <TableCell className="flex w-full flex-col  items-start space-y-2">
                    {shelf.products && (
                        <>
                            {shelf.prodArray.fields.map(
                                (prodField, prodIndex) => (
                                    <ShellProductCells
                                        onDelete={(index) => {
                                            shelf.prodArray.remove(index);
                                        }}
                                        shelfItemForm={shelfItemForm}
                                        key={prodField._id}
                                        index={prodIndex}
                                        field={prodField}
                                        shelf={shelf}
                                    />
                                ),
                            )}
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => {
                                        shelf.prodArray.append({
                                            item: {
                                                totalPrice: 0,
                                            },
                                        });
                                    }}
                                    className="mt-2 w-full"
                                    size="sm"
                                >
                                    <Icons.add className="mr-4 size-4" />
                                    Add Product
                                </Button>
                                <Button
                                    onClick={() => {
                                        shelfItemForm();
                                    }}
                                    className="mt-2 w-full"
                                    size="sm"
                                >
                                    <Icons.add className="mr-4 size-4" />
                                    Create
                                </Button>
                            </div>
                        </>
                    )}
                </TableCell>
                <TableCell className="">
                    <Button
                        onClick={deleteItem}
                        size="icon"
                        variant={"destructive"}
                    >
                        <Icons.trash className="size-4" />
                    </Button>
                </TableCell>
            </TableRow>
            {/* </TableBody>
            </Table> */}
        </Form>
    );
}
interface ShellProductCells {
    shelf: IUseShelfItem;
    index;
    field?;
    onDelete;
    shelfItemForm;
}
function ShellProductCells({
    shelf,
    field: f,
    onDelete,
    index,
    shelfItemForm,
}: ShellProductCells) {
    const [unitPrice, totalPrice] = shelf.watchProductEstimate(index);
    // useEffect(() => {
    //     shelf.prodArray.update(index, {});
    // }, []);

    // if (!shelf.products?.length) return <></>;
    return (
        <div className="flex w-full items-center space-x-4">
            <div className="flex-1">
                <ShelfSelect
                    control={shelf.categoryForm.control}
                    keyName={`${shelf.shelfItemKey}.productArray.${index}.item.productId`}
                    onValueChange={(productId) => {
                        // const productId = Number(v) || null;
                        // f.onChange(productId);

                        shelf.productSelected(productId, index);
                    }}
                    defaultValue={f.item?.productId}
                    placeholder={"Select Product"}
                    items={shelf.products?.map(
                        ({ title: label, id: value }) => ({
                            label,
                            value: value.toString(),
                        }),
                    )}
                />
                {/* {index == shelf.prodArray.fields.length - 1 && (
                    <Button
                        onClick={() => {
                            shelf.prodArray.append({});
                        }}
                        className="w-full mt-2"
                        size="sm"
                    >
                        <Icons.add className="size-4 mr-4" />
                        Add Product
                    </Button>
                )} */}
            </div>
            <div className="w-20">
                <FormField
                    control={shelf.categoryForm.control}
                    name={
                        `${shelf.shelfItemKey}.productArray.${index}.item.qty` as any
                    }
                    // name={`${shelf.getProdFormKey(index, "qty")}` as any}
                    render={({ field }) => (
                        <Input
                            className="w-full"
                            type="number"
                            // {...field}
                            defaultValue={f.item?.qty?.toString()}
                            onChange={(e) => {
                                field.onChange(+e.target.value);
                                shelf.updateProductPrice(
                                    index,
                                    null,
                                    +e.target.value,
                                );
                            }}
                        />
                    )}
                />
            </div>
            <div className="w-24 text-right">
                <Money value={unitPrice} />
            </div>
            <div className="w-24 text-right">
                <Money value={totalPrice} />
            </div>
            <div className="flex w-12 gap-2">
                <Button
                    onClick={() => {
                        shelfItemForm(index);
                    }}
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                >
                    <Icons.edit className="size-4" />
                </Button>
                <Button
                    onClick={() => {
                        // shelfItemForm(index);
                        onDelete(index);
                    }}
                    className="h-8 w-8"
                    size="icon"
                    variant="ghost"
                >
                    <Icons.trash className="size-4" />
                </Button>
            </div>
        </div>
    );
}
interface ShelfCategoryProps {
    shelf: IUseShelfItem;
    index;
    field;
}
function ShelfCategory({ index, shelf, field }: ShelfCategoryProps) {
    const [categories, setCategories] = useState<DykeShelfCategories[]>([]);
    useEffect(() => {
        (async () => {
            const cids = shelf.shelfCategoryIds(index);

            const c = await _getShelfCategories(cids);
            setCategories(c);
        })();
    }, [index, shelf.catArray.fields]);
    if (!shelf.categoryForm) return <></>;

    return (
        <div>
            <ShelfSelect
                control={shelf.categoryForm.control}
                keyName={`ids.${index}.id`}
                defaultValue={field.id}
                onValueChange={(v) => {
                    // const value = Number(v) || null;
                    // field.onChange(value);
                    shelf.categorySelected(index, v);
                    shelf.clearEstimates();
                }}
                placeholder={"Category"}
                items={categories.map(({ name: label, id: value }) => ({
                    label,
                    value: value.toString(),
                }))}
            />
        </div>
    );
}
interface ShelfSelectProps {
    control;
    keyName;
    onValueChange;
    placeholder;
    items;
    defaultValue?;
}
function ShelfSelect({
    control,
    keyName,
    onValueChange,
    placeholder,
    items,
    defaultValue,
}: ShelfSelectProps) {
    return (
        <FormField
            control={control}
            name={keyName}
            render={({ field }) => (
                <>
                    <ComboboxDemo
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        options={items}
                        transformValue={(v) => (v ? Number(v) : null)}
                        onSelect={(value) => {
                            onValueChange(value);
                        }}
                    />
                </>
            )}
        />
    );

    // return (
    //     <FormSelect
    //         control={control}
    //         name={keyName}
    //         options={items}
    //         type="combo"
    //         titleKey={"label"}
    //         valueKey="value"
    //         transformValue={(v) => (v ? Number(v) : null)}
    //         onSelect={(value) => {
    //             onValueChange(value);
    //         }}
    //     />
    // );
    return (
        <FormField
            control={control}
            name={keyName}
            render={({ field }) => (
                <>
                    <Select
                        defaultValue={defaultValue?.toString()}
                        onValueChange={(value) => {
                            onValueChange(field, value);
                        }}
                    >
                        <SelectTrigger className="h-10">
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {items.map((item, index) => (
                                    <SelectItem
                                        key={index}
                                        value={item.value?.toString()}
                                    >
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </>
            )}
        />
    );
}

interface ComboboxDemoProps {
    options;
    transformValue;
    placeholder;
    onSelect;
    defaultValue;
}
function ComboboxDemo({
    options,
    onSelect,
    transformValue,
    placeholder,
    defaultValue,
}: ComboboxDemoProps) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(defaultValue?.toString());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    {value
                        ? options.find((framework) => framework.value === value)
                              ?.label
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>No framework found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((framework) => (
                                <CommandItem
                                    key={framework.value}
                                    value={framework.value}
                                    onSelect={(currentValue) => {
                                        setValue(
                                            currentValue === value
                                                ? ""
                                                : currentValue,
                                        );
                                        setOpen(false);
                                        onSelect(currentValue);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === framework.value
                                                ? "opacity-100"
                                                : "opacity-0",
                                        )}
                                    />
                                    {framework.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
