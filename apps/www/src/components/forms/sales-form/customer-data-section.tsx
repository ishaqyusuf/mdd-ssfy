import { useEffect, useMemo, useState } from "react";
import { getCustomerAddress } from "@/actions/cache/get-customer-address";

import { getSalesCustomerData } from "@/actions/get-sales-customer-data";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { Icons } from "@/components/_v1/icons";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";
import { timeout } from "@/lib/timeout";
import { generateRandomString } from "@/lib/utils";
import { AsyncFnType } from "@/types";
import { dotCompare } from "@/utils/compare";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Command, CommandInput, CommandList } from "@gnd/ui/command";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { motion } from "framer-motion";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
export function CustomerDataSection() {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const query = useCreateCustomerParams();

    useEffect(() => {
        if (query?.params?.payload) {
            let data = query.params.payload;
            let metaData = { ...md };
            if (!data?.address) {
                metaData.customer.id = data.customerId;
                metaData.billing.id = data.addressId;
            } else {
                metaData.customer.id = data.customerId;
                if (data.address == "bad") metaData.billing.id = data.addressId;
                else metaData.shipping.id = data.addressId;
                if (
                    data?.address == "bad" &&
                    (md.shipping.id == md.billing.id || !md.shipping.id)
                )
                    metaData.shipping.id = data.addressId;

                // metaData[data?.address] = data.addressId;
            }
            if (
                dotCompare(
                    metaData,
                    md,
                    "billing.id",
                    "shipping.id",
                    "customer.id",
                )
            ) {
                metaData.dataRefreshToken = generateRandomString();
            }
            metaData.profileChangedToken = data.address
                ? null
                : generateRandomString();
            zus.dotUpdate("metaData", metaData);
            query.setParams(null);
        }
    }, [query, md, zus]);
    const data = useAsyncMemo(async () => {
        await timeout(100);
        const promise = async () =>
            getSalesCustomerData({
                billingId: md.billing.id,
                customerId: md.customer.id,
                shippingId: md.shipping.id,
            });

        const resp: AsyncFnType<typeof promise> = !!md?.customer.id
            ? await promise()
            : ({} as any);

        return {
            ...resp,
            profileChangedToken: md.profileChangedToken,
        };
    }, [
        md.shipping.id,
        md.customer.id,
        md.billing.id,
        md.dataRefreshToken,
        md.profileChangedToken,
    ]);
    const setting = useMemo(() => new SettingsClass(), []);
    useEffect(() => {
        if (!data || !md) return;
        const patch: typeof md = {
            ...md,
            billing: {
                id: data.billingId,
                customerId: data.customerId,
            },
            shipping: {
                id: data.shippingId,
                customerId: data.customerId,
            },
            customer: {
                id: data.customerId,
            },
        };
        // patch.profileChangedToken = null;
        if (data.profileChangedToken) {
            patch.tax.taxCode = data?.taxCode;
            patch.salesProfileId = data.profileId;
            patch.paymentTerm = data.netTerm as any;
        }

        zus.dotUpdate("metaData", patch);
        // zus.dotUpdate("metaData", patch);
        if (data.profileChangedToken) {
            setting.taxCodeChanged();
            setting.salesProfileChanged();
            setTimeout(() => {
                setting.calculateTotalPrice();
            }, 100);
        }
    }, [data]);

    return (
        <motion.div className="divide-y groups ease-in transition-transform">
            <DataCard label="Customer">
                <Lines lines={data?.customerData} />
            </DataCard>

            <DataCard
                className={cn(
                    !data?.customerId ? "hidden" : "shidden group-hover:block",
                )}
                label="Bill To"
                address="bad"
            >
                <Lines lines={data?.billing?.lines} />
            </DataCard>
            <DataCard
                className={cn(
                    !data?.customerId ? "hidden" : "shidden group-hover:block",
                )}
                label="Ship To"
                address="sad"
            >
                <Lines lines={data?.shipping?.lines} />
            </DataCard>
        </motion.div>
    );
}

interface EditBtnProps {
    address?: "bad" | "sad";
}
function EditBtn({ address }: EditBtnProps) {
    const { params, setParams } = useCreateCustomerParams();
    const zus = useFormDataStore();
    const md = zus.metaData;
    const id = !address
        ? md?.customer?.id
        : address == "sad"
          ? md?.shipping?.id
          : md?.billing?.id;
    return (
        <Button
            disabled={
                !id || (address == "sad" && md?.shipping?.id == md?.billing?.id)
            }
            onClick={(e) => {
                setParams({
                    customerId: md.customer.id,
                    customerForm: true,
                    addressId: !address
                        ? null
                        : address == "bad"
                          ? md?.billing?.id
                          : md?.shipping?.id,
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
        <div
            className={cn("group relative space-y-2 p-2 px-4", props.className)}
        >
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
                    "absolute right-0 top-0  gap-2 flex",
                    // searching ? "flex" : "hidden group-hover:flex",
                )}
            >
                <EditBtn address={props.address} />
                <AddressDataSearch
                    address={props.address}
                    onSelect={({ addressId, customerId }) => {
                        const metaData = {
                            ...md,
                        };
                        if (!props.address) {
                            metaData.customer.id = customerId;
                            if (!md.shipping.id)
                                metaData.shipping.id = addressId;
                            if (!md.billing.id) metaData.billing.id = addressId;
                        } else {
                            if (props.address == "bad")
                                metaData.billing.id = addressId;
                            else metaData.shipping.id = addressId;
                        }
                        metaData.profileChangedToken = generateRandomString();

                        zus.dotUpdate("metaData", metaData);
                    }}
                    searching={searching}
                    setSearching={setSearching}
                    customerId={props.address ? md?.customer.id : undefined}
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
    const zus = useFormDataStore();
    const md = zus.metaData;
    const trpc = useTRPC();
    const { data: searchResult } = useQuery(
        trpc.customers.customerInfoSearch.queryOptions(
            {
                type: customerId ? "customer" : "address",
                customerId,
                q: debouncedQuery,
            },
            {
                // enabled:
            },
        ),
    );

    const { params, setParams } = useCreateCustomerParams();
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
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
                                    e.preventDefault();
                                    setParams({
                                        customerForm: true,
                                        search: q,
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
                                {(address == "bad" && md?.billing?.id) || (
                                    <button
                                        onClick={(e) => {
                                            zus.dotUpdate(
                                                "metaData.shipping.id",
                                                md.billing.id,
                                            );
                                            zus.dotUpdate(
                                                "metaData.dataRefreshToken",
                                                generateRandomString(),
                                            );
                                            setOpen(false);
                                        }}
                                        className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <Label className="truncate text-sm font-medium text-primary">
                                            Same as billing
                                        </Label>
                                        <div className="truncate text-xs text-muted-foreground">
                                            same with billing address
                                        </div>
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        const data = {
                                            customerForm: true,
                                            address,
                                            customerId,
                                        };

                                        setParams(data);
                                        setOpen(false);
                                    }}
                                    className="w-full space-y-1 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                                >
                                    <Label className="truncate text-sm font-medium text-primary">
                                        Create Address
                                    </Label>
                                    <div className="truncate text-xs text-muted-foreground">
                                        create a new customer address
                                    </div>
                                </button>
                            </>
                        )}
                        {searchResult?.map((address, key) => (
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
