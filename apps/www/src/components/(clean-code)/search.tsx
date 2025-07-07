import React, { createContext, ReactNode, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { useCombobox } from "downshift";

import { Input, InputProps } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

// Type alias for Item component
type Item<T> = ({ item }: { item: T }) => React.ReactNode;

// Props interface with generic
interface Props<T> {
    items: T[];
    children?: ReactNode; // Define children type correctly
    Item?: Item<T>;
    itemKey: keyof T;
    searchText: (item: T) => string;
}

// BaseSearch component with generic
function BaseSearch<T>(props: Props<T>) {
    const { children } = props; // Destructure children from props
    const baseCtx = useBaseSearchCtx(props); // Initialize the context
    return (
        <SearchContext.Provider value={baseCtx}>
            {children} {/* Use the children prop */}
        </SearchContext.Provider>
    );
}

// Generic function declaration for useBaseSearchCtx
const useBaseSearchCtx = <T,>(props: Props<T>) => {
    const [items, setItems] = useState(props.items);
    function getFilter(inputValue) {
        const lowerCasedInputValue = inputValue.toLowerCase();

        return function filter(item) {
            return (
                !inputValue ||
                props
                    .searchText(item)
                    .toLowerCase()
                    .includes(lowerCasedInputValue)
            );
        };
    }
    const {
        isOpen,
        getToggleButtonProps,
        getLabelProps,
        getMenuProps,
        getInputProps,
        highlightedIndex,
        getItemProps,
        selectedItem,
    } = useCombobox({
        onInputValueChange({ inputValue }) {
            setItems(props.items.filter(getFilter(inputValue)));
        },
        items,
        itemToString(item) {
            return item ? String(item[props.itemKey]) : "";
        },
    });
    return {
        props,
        getInputProps,
        items,
    };
};

// Fix SearchContext initialization by setting a correct initial value or type
const SearchContext = createContext<ReturnType<
    typeof useBaseSearchCtx<any>
> | null>(null);

// Hook to use SearchContext
const useSearchContext = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error(
            "useSearchContext must be used within a SearchProvider",
        );
    }
    return context;
};

// SearchInput component
interface SearchInputProps extends InputProps {
    label?: string;
}
function SearchInput({ className, label, ...inputProps }: SearchInputProps) {
    const ctx = useSearchContext(); // Use context safely
    // Handle SearchInput logic here
    return (
        <div className={cn()}>
            {label && <Label>{label}</Label>}
            <Input
                {...inputProps}
                {...ctx.getInputProps()}
                className={cn("", className)}
            />
        </div>
    );
}
function RenderItem() {
    const ctx = useSearchContext();
    if (!ctx.props.Item) throw Error("Item cannot be rendered");
    // return <>{ctx.items?.length}</>;
    return (
        <>
            {ctx.items?.map((item, index) => (
                <ctx.props.Item key={index} item={item} />
            ))}
        </>
    );
}
// Assign SearchInput to BaseSearch
export const Search = Object.assign(BaseSearch, {
    SearchInput,
    RenderItem,
});
