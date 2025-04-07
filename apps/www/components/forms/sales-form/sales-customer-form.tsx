import { useEffect, useMemo, useState } from "react";
import {
    CustomersListData,
    getCustomersAction,
} from "@/actions/cache/get-customers";
import { findCustomerIdFromBilling } from "@/actions/find-customer-id-from-billing";
import { getCustomerFormAction } from "@/actions/get-customer-form";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { Icons } from "@/components/_v1/icons";
import Button from "@/components/common/button";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";

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
            if (md.customer?.id) onCustomerSelect(md?.customer?.id, false);
            else {
                if (md.bad) {
                    findCustomerIdFromBilling(md.bad).then((customerId) => {
                        console.log(customerId);
                        // return;
                        if (customerId) onCustomerSelect(customerId, false);
                    });
                }
            }
        }, 250);
    }, []);
    const [customer, setCustomer] = useState<CustomerFormData>(null);
    const onCustomerSelect = (customerId, resetSalesData = true) => {
        getCustomerFormAction(customerId).then((resp) => {
            setCustomer(resp);
            zus.dotUpdate("metaData.customer.id", customerId);
            zus.dotUpdate("metaData.billing.id", resp?.addressId);
            if (resetSalesData) {
                zus.dotUpdate("metaData.shipping.id", resp?.addressId);
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
                        onSelect={(e) => onCustomerSelect(e.customerId)}
                    ></SelectCustomer>
                ) : (
                    <div className="relative text-sm text-muted-foreground">
                        <div className="">
                            <span>Customer Data</span>
                        </div>
                        <p>{customer?.name}</p>
                        <p>{customer?.phoneNo}</p>
                        <p>
                            {customer?.address1} {customer.zip_code}
                        </p>
                        <p>{customer?.email}</p>
                        <p>{/* {customer?.} */}</p>
                        <div className="absolute right-0 top-0 -mr-5 flex items-center">
                            <SelectCustomer
                                onSelect={(e) => onCustomerSelect(e.customerId)}
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
                                <Icons.edit className="size-3" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
function SelectBilling({ children, onSelect }) {}
function SelectCustomer({ textTrigger = false, onSelect }) {
    const [q, setSearch] = useState("");
    const debouncedQuery = useDebounce(q, 800);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<CustomersListData[]>([]);
    useEffect(() => {
        if (debouncedQuery)
            getCustomersAction(debouncedQuery).then((res) => {
                setResult(res || []);
            });
    }, [debouncedQuery]);
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
