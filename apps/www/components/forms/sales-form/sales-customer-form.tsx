import { useEffect, useMemo, useState } from "react";
import { getCustomerAddress } from "@/actions/cache/get-customer-address";
import {
    CustomersListData,
    getCustomersAction,
} from "@/actions/cache/get-customers";
import { findCustomerIdFromBilling } from "@/actions/find-customer-id-from-billing";
import { getCustomerAddressForm } from "@/actions/get-customer-adddress-form";
import { getCustomerFormAction } from "@/actions/get-customer-form";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { Icons } from "@/components/_v1/icons";
import Button from "@/components/common/button";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";

import { cn } from "@gnd/ui/cn";
import { Command, CommandInput, CommandList } from "@gnd/ui/command";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { ScrollArea } from "@gnd/ui/scroll-area";

import {
    CustomerFormData,
    customerFormStaticCallbacks,
} from "../customer-form/customer-form";

export function SalesCustomerForm() {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const setting = useMemo(() => new SettingsClass(), []);
    useEffect(() => {
        setTimeout(() => {
            if (md.customer?.id)
                onCustomerSelect(md?.customer?.id, md?.shipping?.id, false);
            else {
                if (md.billing?.id) {
                    findCustomerIdFromBilling(md.billing?.id).then(
                        (customerId) => {
                            console.log(customerId);
                            // return;
                            if (customerId)
                                onCustomerSelect(
                                    customerId,
                                    md.shipping?.id,
                                    false,
                                );
                        },
                    );
                }
            }
        }, 250);
    }, []);
    const [customer, setCustomer] = useState<
        CustomerFormData & {
            shipping?: CustomerFormData;
        }
    >(null);
    const onCustomerSelect = (
        customerId,
        shippingId?,
        resetSalesData = true,
    ) => {
        console.log({ customerId, shippingId });
        Promise.all([
            getCustomerFormAction(customerId),
            getCustomerAddressForm(shippingId),
        ]).then(([resp, shipping]) => {
            setCustomer({
                ...resp,
                shipping,
            });
            zus.dotUpdate("metaData.customer.id", customerId);
            zus.dotUpdate("metaData.billing.id", resp?.addressId);
            zus.dotUpdate("metaData.bad", resp?.addressId);
            if (resetSalesData) {
                zus.dotUpdate("metaData.shipping.id", shipping?.id);
                zus.dotUpdate("metaData.sad", shipping?.id);
                zus.dotUpdate(
                    "metaData.salesProfileId",
                    Number(resp?.profileId),
                );
                zus.dotUpdate("metaData.tax.taxCode", resp?.taxCode);
                zus.dotUpdate("metaData.paymentTerm", resp?.netTerm);
                setting.taxCodeChanged();
                setting.salesProfileChanged();
                setTimeout(() => {
                    setting.calculateTotalPrice();
                }, 100);
            }
        });
    };
    customerFormStaticCallbacks.created = onCustomerSelect;
    const { params, setParams } = useCreateCustomerParams();
    return (
        <div className="grid gap-4 font-mono sm:grid-cols-2 sm:gap-8">
            <div className="col-span-2 p-4">
                {!customer ? (
                    <SelectCustomer
                        textTrigger
                        onSelect={(e) =>
                            onCustomerSelect(e.customerId, e.addressId)
                        }
                    ></SelectCustomer>
                ) : (
                    <div className="relative text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="mb-2 uppercase">
                                <span>Bill To</span>
                            </div>
                            <div className="flex-1"></div>
                            <SelectCustomer
                                onSelect={(e) =>
                                    onCustomerSelect(e.customerId, e.addressId)
                                }
                            ></SelectCustomer>
                            <Button
                                onClick={() => {
                                    setParams({
                                        customerId: customer.id,
                                        customerForm: true,
                                    });
                                }}
                                size="xs"
                                variant="link"
                            >
                                <Icons.edit2 className="size-4" />
                            </Button>
                        </div>
                        <p>{customer?.name}</p>
                        <p>{customer?.phoneNo}</p>
                        <p>
                            {customer?.address1} {customer.zip_code}
                        </p>
                        <p>{customer?.email}</p>
                        <p>{/* {customer?.} */}</p>

                        <div
                            className={cn("mt-4", !md.shipping?.id && "hidden")}
                        >
                            <div className="flex items-center gap-2">
                                <div className="uppercase">
                                    <span>Ship To</span>
                                </div>
                                <div className="flex-1"></div>

                                <SelectCustomer
                                    onSelect={(e) =>
                                        onCustomerSelect(
                                            e.customerId,
                                            e.addressId,
                                        )
                                    }
                                    customerId={md.customer?.id}
                                ></SelectCustomer>
                                <Button
                                    onClick={() => {
                                        setParams({
                                            customerId: customer.id,
                                            addressOnly: true,
                                            addressId: md.cad,
                                            customerForm: true,
                                        });
                                    }}
                                    size="xs"
                                    variant="link"
                                >
                                    <Icons.edit2 className="size-4" />
                                </Button>
                            </div>
                            <div className="">
                                <p>{customer?.shipping?.name}</p>
                                <p>{customer?.shipping?.phoneNo}</p>
                                <p>
                                    {customer?.shipping?.address1}{" "}
                                    {customer.shipping?.city}
                                    {customer.shipping?.state}
                                    {customer.shipping?.zip_code}
                                </p>
                                <p>{customer?.shipping?.email}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
interface SelectCustomerProps {
    textTrigger?: boolean;
    onSelect?;
    customerId?;
}
function SelectCustomer({
    textTrigger = false,
    onSelect,
    customerId,
}: SelectCustomerProps) {
    const [q, setSearch] = useState("");
    const debouncedQuery = useDebounce(q, 800);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<CustomersListData[]>([]);
    useEffect(() => {
        const prom = customerId
            ? getCustomerAddress(debouncedQuery, customerId)
            : getCustomersAction(debouncedQuery);
        // if(debouncedQuery)
        prom.then((res) => {
            setResult(res || []);
        });
    }, [debouncedQuery, customerId]);
    const { params, setParams } = useCreateCustomerParams();
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                {!textTrigger ? (
                    <Button size="xs" variant="link">
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
