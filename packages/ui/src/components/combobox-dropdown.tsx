"use client";

import { Icons } from "@gnd/ui/icons";

import * as React from "react";
import { CommandList } from "cmdk";
import { cn } from "../utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export interface ComboboxItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps<T> {
  placeholder?: React.ReactNode;
  searchPlaceholder?: string;
  items: T[];
  onSelect: (item: T) => void;
  selectedItem?: T;
  renderSelectedItem?: (selectedItem: T) => React.ReactNode;
  renderOnCreate?: (value: string) => React.ReactNode;
  renderListItem?: (listItem: {
    isChecked: boolean;
    item: T;
  }) => React.ReactNode;
  emptyResults?: React.ReactNode;
  popoverProps?: React.ComponentProps<typeof PopoverContent>;
  disabled?: boolean;
  onCreate?: (value: string) => void;
  headless?: boolean;
  noSearch?: boolean;
  className?: string;
  listClassName?: string;
  pageSize?: number;
  valueKey?: string;
  openChanged?;
  onSearch?: (value: string) => void;
  Trigger?: React.ReactNode;
  showCreateWhenMatches?: boolean;
  renderActions?: (context: {
    inputValue: string;
    close: () => void;
  }) => React.ReactNode;
}
export function ComboboxDropdown<T extends ComboboxItem>({
  headless,
  placeholder,
  searchPlaceholder,
  items,
  onSelect,
  selectedItem: incomingSelectedItem,
  renderSelectedItem = (item) => item.label,
  renderListItem,
  renderOnCreate,
  emptyResults,
  popoverProps,
  disabled,
  onCreate,
  className,
  listClassName,
  pageSize = 20,
  onSearch,
  noSearch,
  openChanged,
  Trigger,
  showCreateWhenMatches,
  renderActions,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [internalSelectedItem, setInternalSelectedItem] = React.useState<
    T | undefined
  >();

  const selectedItem = incomingSelectedItem ?? internalSelectedItem;

  const [inputValue, setInputValue] = React.useState("");
  const filteredItems =
    items?.filter((item) =>
      item.label?.toLowerCase().includes(inputValue.toLowerCase()),
    ) || [];
  const [cursor, setCusor] = React.useState(0);
  React.useEffect(() => {
    setCusor(0);
  }, [inputValue]);
  const { __items, hasMore } = React.useMemo(() => {
    // const PAGE_SIZE = 10;
    const paginatedItems = filteredItems.slice(0, cursor + pageSize);
    const hasMoreItems = paginatedItems.length < filteredItems.length;

    return {
      __items: paginatedItems,
      hasMore: hasMoreItems,
    };
  }, [filteredItems, cursor, pageSize]);
  const showCreate =
    onCreate &&
    Boolean(inputValue) &&
    (showCreateWhenMatches || !filteredItems.length);

  const Component = (
    <Command loop shouldFilter={false}>
      {noSearch || (
        <CommandInput
          value={inputValue}
          onValueChange={(e) => {
            setInputValue(e);
            onSearch?.(e);
          }}
          placeholder={searchPlaceholder ?? "Search item..."}
          className="px-3"
          disabled={disabled}
        />
      )}

      <CommandGroup>
        <CommandList className={cn("")}>
          <div className={cn("max-h-56.25 overflow-auto", listClassName)}>
            {__items.map((item, itemIndex) => {
              let value = item.id;
              if (typeof value !== "string") value = String(item.id);
              const isChecked = selectedItem?.id === item.id;

              return (
                <CommandItem
                  disabled={item.disabled}
                  className={cn(
                    item.disabled
                      ? "text-muted-foreground cursor-not-allowed"
                      : "cursor-pointer",

                    className,
                  )}
                  key={itemIndex}
                  value={value}
                  onSelect={(id) => {
                    // console.log({ id, id2: id?.toUpperCase(), filteredItems });
                    const foundItem = filteredItems?.find(
                      (item) =>
                        String(item.id)?.trim().toUpperCase() ===
                        id?.trim()?.toUpperCase(),
                    );
                    if (!foundItem) {
                      return;
                    }

                    onSelect(foundItem);
                    setInternalSelectedItem(foundItem);
                    setOpen(false);
                  }}
                >
                  {renderListItem ? (
                    renderListItem({ isChecked, item })
                  ) : (
                    <>
                      <Icons.Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isChecked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {item.label}
                    </>
                  )}
                </CommandItem>
              );
            })}
            <CommandEmpty>{emptyResults ?? "No item found"}</CommandEmpty>
            {showCreate && (
              <CommandItem
                key={inputValue}
                value={inputValue}
                onSelect={() => {
                  onCreate(inputValue);
                  setOpen(false);
                  setInputValue("");
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {renderOnCreate ? renderOnCreate(inputValue) : null}
              </CommandItem>
            )}
            {renderActions
              ? renderActions({
                  inputValue,
                  close: () => {
                    setOpen(false);
                    setInputValue("");
                  },
                })
              : null}
          </div>
        </CommandList>
      </CommandGroup>
    </Command>
  );

  if (headless) {
    return Component;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(e) => {
        setOpen(e);
        openChanged?.(e);
      }}
      modal
    >
      <PopoverTrigger asChild disabled={disabled} className="w-full">
        {Trigger ? (
          Trigger
        ) : (
          <Button
            variant="outline"
            aria-expanded={open}
            className="relative w-full justify-between"
          >
            <span className="truncate text-ellipsis pr-3">
              {selectedItem ? (
                renderSelectedItem ? (
                  <span className="  flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
                    {renderSelectedItem?.(selectedItem)}
                  </span>
                ) : (
                  selectedItem.label
                )
              ) : (
                (placeholder ?? "Select item...")
              )}
            </span>
            <Icons.ChevronsUpDown className="absolute right-2 size-4 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        {...popoverProps}
        style={{
          width: "var(--radix-popover-trigger-width)",
          ...popoverProps?.style,
        }}
      >
        {Component}
      </PopoverContent>
    </Popover>
  );
}
