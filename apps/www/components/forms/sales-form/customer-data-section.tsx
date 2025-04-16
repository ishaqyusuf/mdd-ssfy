import { useEffect, useState } from "react";
import { getCustomerAddress } from "@/actions/cache/get-customer-address";
import {
    CustomersListData,
    getCustomersAction,
} from "@/actions/cache/get-customers";
import { getSalesCustomerData } from "@/actions/get-sales-customer-data";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { Icons } from "@/components/_v1/icons";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";
import { timeout } from "@/lib/timeout";
import { AsyncFnType } from "@/types";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Command, CommandInput, CommandList } from "@gnd/ui/command";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { ScrollArea } from "@gnd/ui/scroll-area";

export function CustomerDataSection() {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const query = useCreateCustomerParams();
    useEffect(() => {
        if (query?.params?.payload) {
            let data = query.params.payload;
            console.log({ data });
            let metaData = { ...md };
            if (!data?.address) {
                metaData[data.address] = data.addressId;
            } else {
                metaData.cad = data.customerId;
                if (data?.address == "bad" && (md.sad == md.bad || !md.sad))
                    md.sad = data.addressId;
                metaData[data?.address] = data.addressId;
            }
            zus.dotUpdate("metaData", metaData);
            query.setParams(null);
        }
    }, [query, md, zus]);
    const [refreshToken, setRefreshToken] = useState(null);
    const data = useAsyncMemo(async () => {
        await timeout(100);
        const promise = async () =>
            getSalesCustomerData({
                billingId: md.bad,
                customerId: md.cad,
                shippingId: md.sad,
            });

        const resp: AsyncFnType<typeof promise> = !!md?.cad
            ? await promise()
            : ({} as any);

        return resp;
    }, [md.sad, md.cad, md.bad, refreshToken]);
    useEffect(() => {
        if (!data || !md) return;
        const patch: typeof md = {
            ...md,
            bad: data.billingId,
            sad: data.shippingId,
            cad: data.customerId,
        };
        const changes = !![
            patch.bad != md.bad,
            patch.sad != md.sad,
            patch.cad != md.cad,
        ]?.filter(Boolean)?.length;
        if (changes) {
            console.log("META CHANGED", patch);
            // zus.dotUpdate('metaData',patch)
        }
    }, [data, md]);
    return (
        <div className="divide-y">
            <DataCard label="Customer">
                <Lines lines={data?.customerData} />
            </DataCard>

            <DataCard
                className={cn(!data?.customerId && "hidden")}
                label="Bill To"
                address="bad"
            >
                <Lines lines={data?.billing?.lines} />
            </DataCard>
            <DataCard
                className={cn(!data?.customerId && "hidden")}
                label="Ship To"
                address="sad"
            >
                <Lines lines={data?.shipping?.lines} />
            </DataCard>
        </div>
    );
}

interface EditBtnProps {
    address?: "bad" | "sad";
}
function EditBtn({ address }: EditBtnProps) {
    const { params, setParams } = useCreateCustomerParams();
    const zus = useFormDataStore();
    const md = zus.metaData;
    return (
        <Button
            onClick={() => {
                setParams({
                    customerId: md.cad,
                    customerForm: true,
                    addressId:
                        address == "sad" && md.sad == md.bad
                            ? null
                            : md?.[address],
                    address,
                });
            }}
            size="xs"
            variant="outline"
        >
            <Icons.edit2 className="size-4" />
        </Button>
    );
}
function Lines({ lines }) {
    return <>{lines?.map((line, pi) => <p key={pi}>{line}</p>)}</>;
}
interface DataCardProps {
    label: string;
    children?;
    className?: string;
    address?: EditBtnProps["address"];
}
function DataCard(props: DataCardProps) {
    const [searching, setSearching] = useState(false);
    const zus = useFormDataStore();
    const md = zus.metaData;
    return (
        <div className="group relative space-y-2 p-2 px-4">
            <div className="font-mono">
                <div className="text-xs font-bold uppercase">
                    <span>{props.label}</span>
                </div>
            </div>
            <div className="font-mono text-sm font-medium text-muted-foreground">
                {props.children}
            </div>
            <div
                className={cn(
                    "absolute right-0 top-0  gap-2 ",
                    searching ? "flex" : "hidden group-hover:flex",
                )}
            >
                <EditBtn address={props.address} />
                <AddressDataSearch
                    onSelect={({ addressId, customerId }) => {
                        const metaData = {
                            ...md,
                        };
                        if (!props.address) {
                            metaData.cad = customerId;
                            if (!md.sad) metaData.sad = addressId;
                            if (!md.bad) metaData.bad = addressId;
                        } else {
                            metaData[props.address] = addressId;
                        }
                        zus.dotUpdate("metaData", metaData);
                    }}
                    searching={searching}
                    setSearching={setSearching}
                    customerId={props.address ? md?.cad : undefined}
                />
            </div>
        </div>
    );
}
interface SelectCustomerProps {
    textTrigger?: boolean;
    onSelect?;
    customerId?;
    searching?;
    setSearching;
    address?: EditBtnProps["address"];
}
function AddressDataSearch({
    textTrigger = false,
    onSelect,
    customerId,
    searching: open,
    setSearching: setOpen,
    address,
}: SelectCustomerProps) {
    const [q, setSearch] = useState("");
    const debouncedQuery = useDebounce(q, 800);
    // const [open, setOpen] = useState(false);
    const [result, setResult] = useState<CustomersListData[]>([]);
    useEffect(() => {
        const prom = customerId
            ? getCustomerAddress(debouncedQuery, customerId)
            : getCustomersAction(debouncedQuery);

        prom.then((res) => {
            setResult(res || []);
        });
    }, [debouncedQuery, customerId]);
    const { params, setParams } = useCreateCustomerParams();
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                {!textTrigger ? (
                    <Button size="xs" variant="secondary">
                        <Icons.Search className="size-4" />
                    </Button>
                ) : (
                    <Button variant="ghost" className="cursor-pointer">
                        Select Customer...
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="p-0" align="end">
                <Command shouldFilter={false}>
                    <CommandInput
                        value={q}
                        onValueChange={(v) => {
                            setSearch(v);
                        }}
                        placeholder="Search Address..."
                    />
                    <CommandList></CommandList>
                </Command>
                <ScrollArea className="max-h-[30vh] max-w-[400px] overflow-auto">
                    <div className="divide-y">
                        {!customerId ? (
                            <button
                                onClick={(e) => {
                                    setParams({
                                        customerForm: true,
                                    });
                                }}
                                className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                            >
                                <Label className="truncate text-sm font-medium text-primary">
                                    Create Customer
                                </Label>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => {
                                        setParams({
                                            customerForm: true,
                                        });
                                    }}
                                    className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                >
                                    <Label className="truncate text-sm font-medium text-primary">
                                        Same as billing
                                    </Label>
                                </button>
                                <button
                                    onClick={(e) => {
                                        setParams({
                                            customerForm: true,
                                            address,
                                            customerId,
                                        });
                                    }}
                                    className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                >
                                    <Label className="truncate text-sm font-medium text-primary">
                                        Create Address
                                    </Label>
                                </button>
                            </>
                        )}
                        {result?.map((address, key) => (
                            <button
                                key={key}
                                onClick={() => {
                                    onSelect(address);
                                    setOpen(false);
                                }}
                                className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                            >
                                <Label className="truncate text-sm font-medium text-primary">
                                    {address.name}
                                </Label>
                                <div className="truncate text-xs text-muted-foreground">
                                    {address.phone}
                                    {address.address}
                                </div>
                                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                                    {address.taxName && (
                                        <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
                                            {address.taxName}
                                        </span>
                                    )}
                                    {address.profileName && (
                                        <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
                                            {address.profileName}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
