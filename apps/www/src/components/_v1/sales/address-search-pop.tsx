import React, { useEffect } from "react";
import { findAddressAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-address";
import { useDebounce } from "@/hooks/use-debounce";
import { AddressType, IAddressBook, ISalesAddressForm } from "@/types/sales";
import { Search } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Command, CommandInput, CommandList } from "@gnd/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

export default function AddressSearchPop({
    type,
    form,
}: {
    type: AddressType;
    form: UseFormReturn<ISalesAddressForm>;
}) {
    const [addressList, setAddressList] = React.useState({
        list: [] as IAddressBook[],
        q: "",
    });
    async function loadAddress() {
        const ls = await findAddressAction({ q });

        setAddressList({
            ...addressList,
            list: ls as any,
        });
    }
    const [q, setQ] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const debouncedQuery = useDebounce(q, 800);
    function selectAddress(address: IAddressBook) {
        setOpen(false);
        const { customer, ..._address } = address;
        form.setValue(type, _address as any);
        if (customer?.profile && type == "billingAddress")
            form.setValue("profile", customer.profile);
    }
    useEffect(() => {
        loadAddress();
    }, [debouncedQuery]);
    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        aria-expanded={open}
                        size="sm"
                        variant="outline"
                        className="h-8"
                    >
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                    <Command shouldFilter={false}>
                        <CommandInput
                            value={q}
                            onValueChange={(v) => {
                                setQ(v);
                            }}
                            placeholder="Search Address..."
                        />
                        <CommandList></CommandList>
                    </Command>
                    {addressList.list.map((address, key) => (
                        <button
                            key={key}
                            onClick={() => selectAddress(address)}
                            className="teamaspace-y-1 flex w-full flex-col items-start px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                        >
                            <div className="flex w-full items-center justify-between">
                                <p>{address.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {address.phoneNo}
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground ">
                                {address.address1}
                            </p>
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
        </>
    );
}
