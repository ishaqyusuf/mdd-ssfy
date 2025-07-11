"use client";

import { useEffect, useRef, useState } from "react";
import JsonSearch from "@/_v2/lib/json-search";
import useStaticDataLoader from "@/lib/static-data-loader";
import { cn, listFilter, uniqueBy } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cva, VariantProps } from "class-variance-authority";
import { useCombobox } from "downshift";

import { Input } from "@gnd/ui/input";

import { Label } from "@gnd/ui/label";

// import JsonSearch from "search-array";
export interface AutoCompleteProps {
    options?: any[];
    value?: any;
    onChange?;
    Item?;
    itemText?;
    itemValue?;
    label?;
    transformValue?;
    disabled?;
    transformText?;
    searchAction?;
    searchFn?;
    allowCreate?;
    formKey?;
    perPage?;
    uppercase?: boolean;
    hideEmpty?: boolean;
    virt?: boolean;
    fuzzy?: boolean;
    placeholder?;
    form?;
    loader?;
}
const inputVariants = cva(
    "relative w-full ring-offset-background cursor-default overflow-hidden  bg-whites text-left  sm:text-sm border border-input",
    {
        variants: {
            size: {
                default: "h-10 rounded-lg",
                sm: "h-8 px-3 rounded-md",
                xs: "h-6 px-2 rounded",
            },
        },
        defaultVariants: {
            size: "default",
        },
    },
);
export default function AutoComplete({
    options,
    value,
    onChange,
    virt,
    disabled,
    label,
    searchAction,
    allowCreate,
    itemText = "name",
    itemValue = "id",
    className,
    Item,
    hideEmpty,
    searchFn,
    form,
    placeholder,
    formKey,
    uppercase,
    onSelect,
    fuzzy,
    perPage = 500,
    loader,
    ...props
}: AutoCompleteProps & PrimitiveDivProps & VariantProps<typeof inputVariants>) {
    const transformedOptions = transformItems(
        options || [],
        itemText,
        itemValue,
    );
    useEffect(() => {
        resetOptions(options);
    }, [options]);
    function resetOptions(_opts) {
        const transformedOptions = transformItems(
            _opts || [],
            itemText,
            itemValue,
        );
        setItems(transformedOptions);
        setAllItems(transformedOptions);
        return transformedOptions;
    }
    const [allItems, setAllItems] = useState(transformedOptions);
    const [items, setItems] = useState(transformedOptions);
    const [modelValue, setModelValue] = useState("");
    // useEffect(() => {
    //     if (props.id == "unit") {
    //         // console.log([allItems.length, value]);
    //         if (!allowCreate && itemText != itemValue) {
    //             let v = allItems.find((item) => item.value == value);
    //             // selectItem(v);
    //             // console.log([props.id, v]);
    //             // setInputValue(v?.title);
    //             // selectItem(null);
    //         }
    //     }
    // }, [options]);
    const dataLoader = useStaticDataLoader(loader, {
        onSuccess(ls) {
            const list = resetOptions(ls);

            init(list);
        },
    });
    function init(list?) {
        let text = value;
        if (itemText != itemValue) {
            const ls = list || allItems;
            // console.log(ls);

            let v = ls.find(
                (item) =>
                    String(item.value)?.toLowerCase() ==
                    String(text)?.toLowerCase(),
            );
            if (!v && !allowCreate) text = "";
            else text = v?.title;
            // if (props.id == "unit") console.log([v, text]);
        }
        // console.log(text);

        setInputValue(text);
    }
    useEffect(() => {
        if (!loader) init();
    }, []);
    const {
        isOpen,
        highlightedIndex,
        getInputProps,
        getMenuProps,
        getItemProps,
        selectedItem,
        setInputValue,
        selectItem,
    } = useCombobox({
        items,
        // inputValue: "lorem",
        initialInputValue: modelValue,

        onSelectedItemChange(c) {
            // console.log(c);
            onSelect && onSelect(c.selectedItem as any);
            onChange && onChange((c.selectedItem as any)?.value);
        },
        onInputValueChange({ inputValue }) {
            setItems(
                listFilter(
                    transformItems(
                        dataLoader.items || options || [],
                        itemText,
                        itemValue,
                    ),
                    inputValue,
                    fuzzy,
                ),
            );
            let value = items.find((item) => item.title == inputValue);
            // console.log(value);
            if (allowCreate)
                onChange && onChange(value ? value.value : inputValue);
        },
        stateReducer: (state, actionAndChanges) => {
            const { changes, type } = actionAndChanges;
            switch (type) {
                // case useCombobox.stateChangeTypes.
                case useCombobox.stateChangeTypes.InputBlur:
                    // console.log(changes.inputValue);
                    // onChange && onChange(changes.inputValue);
                    return {
                        ...changes,
                    };
            }
            return {
                ...changes,
            };
        },
        itemToString(item) {
            return item ? (item as any).title : "";
        },
        onIsOpenChange(changes) {
            if (changes.isOpen) {
                setItems(
                    listFilter(
                        transformItems(
                            dataLoader.items || options || [],
                            itemText,
                            itemValue,
                        ),
                        // changes.inputValue
                        "",
                        fuzzy,
                    ),
                );
            } else {
                // changes.
                // console.log(changes.selectedItem);
                let value = items.find(
                    (item) => item.title == changes.inputValue,
                );
                // console.log([value, changes.selectedItem]);
                const opt: any = value?.value ? value : changes.selectedItem;
                if (!allowCreate) {
                    const id = opt?.value;
                    onChange && onChange(id);
                    // setValue(id);
                    if (changes.inputValue != opt?.title) {
                        setInputValue(opt?.title);
                    }
                }
            }
        },
    });
    const listRef = useRef<HTMLDivElement>(undefined);
    const rowVirtualizer = useVirtualizer({
        count: items.length,
        // parentRef: listRef,
        getScrollElement: () => listRef.current as any,
        estimateSize: (index) => 40,
        // overscan: 2,
    });
    const inputRef = useRef<HTMLInputElement>(undefined);
    return (
        <div>
            <div className="relative grid gap-2">
                {label && <Label>{label}</Label>}

                <div className="flex">
                    <Input
                        className={cn(
                            inputVariants(props),
                            uppercase && "uppercase",
                            className,
                        )}
                        {...getInputProps({ ref: inputRef as any })}
                    />
                </div>
            </div>
            {/* {isOpen && */}
            {/* `opened ${JSON.stringify(inputRef.current?.clientWidth)}`} */}
            <ul
                style={{
                    width: `${inputRef.current?.clientWidth}px`,
                }}
                className={cn(
                    "absolute z-[999] mt-1 max-h-80 w-full overflow-scroll border bg-white p-0 shadow-md dark:bg-accent",
                    !(isOpen && items.length) && "hidden",
                    "min-w-[150px]",
                )}
                {...getMenuProps({ ref: listRef as any })}
            >
                {isOpen && (
                    <>
                        {items
                            .filter((item, index) => index < perPage)
                            .map((item, index) => (
                                <li
                                    className={cn(
                                        highlightedIndex === index &&
                                            "bg-primary text-accent",
                                        selectedItem === item &&
                                            "bg-accent text-accent-foreground",
                                        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                                    )}
                                    key={index}
                                    {...getItemProps({
                                        item: item,
                                        index,
                                    })}
                                >
                                    <span
                                        className={cn(
                                            uppercase && "uppercase",
                                            "line-clamp-1",
                                        )}
                                    >
                                        {item?.title}
                                    </span>
                                </li>
                            ))}
                    </>
                )}
                {isOpen && virt && (
                    <>
                        <li
                            key="total-size"
                            style={{ height: rowVirtualizer.getTotalSize() }}
                        />
                        {rowVirtualizer.getVirtualItems().map((vi, index) => (
                            <li
                                className={cn(
                                    highlightedIndex === index && "bg-blue-300",
                                    selectedItem === items[vi.index] &&
                                        "font-bold",
                                    "flex cursor-default flex-col px-3 py-2 shadow-sm",
                                    uppercase && "uppercase",
                                )}
                                key={index}
                                {...getItemProps({
                                    item: items[vi.index],
                                    index,
                                })}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: vi.size,
                                    transform: `translateY(${vi.start}px)`,
                                }}
                            >
                                <span
                                    className={cn(
                                        uppercase && "uppercase",
                                        "line-clamp-1",
                                    )}
                                >
                                    {items[vi.index]?.title}
                                </span>
                            </li>
                        ))}
                    </>
                )}
            </ul>
        </div>
    );
}

function transformItems(items, itemText, itemValue) {
    return items
        ?.map((item) => {
            return typeof item == "string"
                ? { title: item, value: item, data: item }
                : {
                      title: item?.[itemText],
                      value: item?.[itemValue],
                      data: item,
                  };
        })
        .filter((item) => item.title);
}
