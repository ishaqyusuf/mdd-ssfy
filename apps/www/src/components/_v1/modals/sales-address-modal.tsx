import * as React from "react";
import { findAddressAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-address";
import { saveSalesAddressAction } from "@/app/(v2)/(loggedIn)/sales/_actions/save-sales-address";
import { deepCopy } from "@/lib/deep-copy";
import { useLoader } from "@/lib/use-loader";
import { cn } from "@/lib/utils";
import { AddressType, ISalesAddressForm, ISalesOrderForm } from "@/types/sales";
import { Edit2, MapPin, Phone, User } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { OkImpl } from "ts-results";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { ScrollArea } from "@gnd/ui/scroll-area";
import AutoComplete2 from "../auto-complete-tw";
import Btn from "../btn";

export function SalesCustomerModal({
    form,
    profiles,
}: {
    profiles;
    form: ISalesOrderForm;
}) {
    const [tab, setTab] = React.useState<AddressType>("billingAddress");
    const defaultValues: any = {
        sameAddress: false,
        profile: {},
    };
    const addressForm = useForm<ISalesAddressForm>({
        defaultValues,
    });
    // const watch

    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
        const { billingAddress, shippingAddress, customer } = form.getValues();
        // console.log(billingAddress, shippingAddress);
        addressForm.reset({
            billingAddress: billingAddress as any,
            customer: customer as any,
            shippingAddress: shippingAddress as any,
        });
        setChecked(shippingAddress?.id == billingAddress?.id);
    }, [open]);
    const [checked, setChecked] = React.useState<boolean>(true);
    const loader = useLoader();
    const submit = () => {
        loader.action(async () => {
            const {
                billingAddress, //: ,
                shippingAddress, //: { customerId: scid, ...siad },
                customer,
                ...formData
            } = deepCopy<any>(addressForm.getValues());
            if (!billingAddress?.name || !billingAddress.phoneNo) {
                toast.error("Name and Phone is required");
                return;
            }
            const { customerId, search, ...biad } = billingAddress || {};
            const {
                customerId: scid,
                search: ssea,
                ...siad
            } = shippingAddress || {};
            const _form = {
                ...formData,
                shippingAddress: siad,
                billingAddress: biad,
                sameAddress: checked as any,
                customer,
            };
            console.log({ _form });
            const resp = await saveSalesAddressAction(_form as any);

            console.log({ resp });

            if (resp) {
                const { profile, ...ext } = resp;
                Object.entries(ext).map(([k, v]) => {
                    form.setValue(k as any, v, { shouldDirty: true });
                });
                setOpen(false);
            } else {
                console.log(resp);
            }
        });
    };
    function getAddressLine(type: AddressType) {
        const { getValues } = form;
        const phone2 = getValues(`${type}.phoneNo2`);
        return {
            name:
                getValues(`customer.businessName`) || getValues(`${type}.name`),
            phoneNo: `${getValues(`${type}.phoneNo`)} ${
                phone2 ? `(${phone2})` : ""
            }`,
            // phoneNo2: ,
            address: getValues([
                `${type}.address1`,
                `${type}.city`,
                `${type}.state`,
                `${type}.meta.zip_code`,
            ])
                .filter(Boolean)
                .join(","),
        }; //.filter(Boolean);
    }
    return (
        <Dialog
            onOpenChange={(e) => {
                if (!e) setOpen(e);
                else {
                    // const [title, coefficient] = form.getValues([
                    //     "meta.sales_profile",
                    //     "meta.sales_percentage",
                    // ]);
                    // addressForm.setValue("profile", {
                    //     coefficient,
                    //     title,
                    // } as any);
                    setTab("billingAddress");
                }
            }}
            open={open}
        >
            <DialogTrigger
                onClick={() => setOpen(true)}
                asChild
                className="cursor-pointer"
            >
                <div className="group relative grid h-full w-full grid-cols-2 gap-x-4 rounded border border-slate-300 p-2 text-start hover:bg-slate-100 hover:shadow">
                    <div className="absolute right-0   opacity-0 group-hover:opacity-100">
                        <Button size="sm" variant="secondary" className="h-8">
                            <Edit2 className="h-3.5 w-3.5 " />
                        </Button>
                    </div>
                    {[
                        getAddressLine("billingAddress"),
                        getAddressLine("shippingAddress"),
                    ].map((v, i) => (
                        <div key={i} className="space-y-2">
                            <Label className="text-muted-foreground">
                                {i == 0 ? "Billing" : "Shipping"} Address
                            </Label>
                            <div className="  space-y-2 text-sm">
                                {["name", "phoneNo", "address"].map((k, i) => {
                                    const Icon =
                                        i == 2 ? MapPin : i == 1 ? Phone : User;
                                    return (
                                        <div
                                            key={i}
                                            className={`flex  space-x-2 ${
                                                i == 0 && "uppercase"
                                            }`}
                                        >
                                            <div>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span
                                                className={`leading-tight ${
                                                    i == 2 && "line-clamp-2"
                                                }`}
                                            >
                                                {v[k] ?? "-"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Customer Info</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue={tab} className="">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            onClick={() => setTab("billingAddress")}
                            value="billingAddress"
                        >
                            Billing
                        </TabsTrigger>
                        <TabsTrigger
                            disabled={checked}
                            onClick={() => setTab("shippingAddress")}
                            value="shippingAddress"
                        >
                            Shipping
                        </TabsTrigger>
                    </TabsList>
                    {(
                        ["billingAddress", "shippingAddress"] as AddressType[]
                    ).map((t, i) => (
                        <TabsContent value={t} key={i}>
                            <OrderAddress
                                profiles={profiles}
                                checked={i == 1 ? null : checked}
                                setChecked={i == 1 ? null : setChecked}
                                type={t}
                                form={addressForm}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
                <DialogFooter>
                    <div className="flex w-full justify-between space-x-4">
                        {tab == "billingAddress" && (
                            <div className="grid gap-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sameAddress"
                                        checked={checked}
                                        onCheckedChange={(e) => {
                                            setChecked(e as any);
                                        }}
                                    />
                                    <label
                                        htmlFor="sameAddress"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Same as Shipping
                                    </label>
                                </div>
                            </div>
                        )}
                        <div className="flex-1"></div>
                        <Btn
                            size="sm"
                            isLoading={loader.isLoading}
                            onClick={submit}
                            type="submit"
                        >
                            Save changes
                        </Btn>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
function OrderAddress({
    type,
    form,
    profiles,
}: {
    checked?;
    setChecked?;
    type: AddressType;
    form: UseFormReturn<ISalesAddressForm>;
    profiles;
}) {
    // const { register } = form;
    const { register, handleSubmit } = form;

    const profile = form.watch("profile.title");
    return (
        <ScrollArea className="-mx-4 -mr-6  h-[400px] px-4">
            <div className="grid grid-cols-2 gap-4 py-4 pb-10 ">
                <div className="col-span-2 grid gap-2">
                    <div className="col-span-3 ">
                        <AutoComplete2
                            placeholder={"Search"}
                            // form={form}
                            // formKey={`${type}.name`}
                            searchAction={findAddressAction}
                            allowCreate
                            itemText="search"
                            itemValue="search"
                            onSelect={(e) => {
                                const { data: address } =
                                    (e as any) || ({} as any);
                                console.log(address);
                                if (typeof address === "object") {
                                    const {
                                        customer,
                                        businessName,
                                        search,
                                        ..._address
                                    } = address;
                                    form.setValue(type, _address as any);

                                    if (
                                        customer?.profile &&
                                        type == "billingAddress"
                                    )
                                        form.setValue(
                                            "profile",
                                            customer.profile,
                                        );
                                }
                            }}
                            Item={({ data: address }) => (
                                <div
                                    key={address.id}
                                    className="teamaspace-y-1 flex w-full flex-col items-start px-4 py-1 "
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
                                </div>
                            )}
                        />
                        {/* <Input id="name" {...register(`${type}.name`)} className="h-8" /> */}
                        {/* <AddressSearchPop form={form} type={type} /> */}
                    </div>
                </div>
                <div
                    className={cn(
                        "col-span-2 grid gap-2",
                        type != "billingAddress" && "hidden",
                    )}
                >
                    <Label htmlFor="name" className="">
                        Business Name
                    </Label>
                    <Input
                        id="businessName"
                        {...register(`customer.businessName`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="col-span-2 grid gap-2">
                    <Label htmlFor="name" className="">
                        Name
                    </Label>
                    <Input
                        id="name"
                        {...register(`${type}.name`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone" className="whitespace-nowrap">
                        Phone (primary)
                    </Label>
                    <Input
                        id="phone"
                        {...register(`${type}.phoneNo`)}
                        className="col-span-3 h-8"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email" className="">
                        Email
                    </Label>
                    <Input
                        id="email"
                        {...register(`${type}.email`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="col-span-2 grid gap-2">
                    <Label htmlFor="address" className="">
                        Address
                    </Label>
                    <Input
                        id="address"
                        {...register(`${type}.address1`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone2" className="whitespace-nowrap">
                        Phone (secondary)
                    </Label>
                    <Input
                        id="phone2"
                        {...register(`${type}.phoneNo2`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="city" className="">
                        City
                    </Label>
                    <Input
                        id="city"
                        {...register(`${type}.city`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="state" className="">
                        State
                    </Label>
                    <Input
                        id="state"
                        {...register(`${type}.state`)}
                        className="col-span-3 h-8"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="zipCode" className="">
                        Zip Code
                    </Label>
                    <Input
                        id="zipCode"
                        {...register(`${type}.meta.zip_code`)}
                        className="col-span-3 h-8"
                    />
                </div>

                <div className="grid hidden gap-2">
                    <Label htmlFor="profile" className="">
                        Profile
                    </Label>
                    <Select
                        value={profile}
                        disabled={type != "billingAddress"}
                        onValueChange={(value) => {
                            const selection = profiles.find(
                                (profile) => profile.title == value,
                            );
                            if (selection) {
                                form.setValue("profile.title", value);
                                form.setValue(
                                    "profile.coefficient",
                                    selection.coefficient,
                                );
                                form.setValue("profile.id", selection.id);
                            }
                        }}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select Profile" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {profiles?.map((profile, _) => (
                                    <SelectItem key={_} value={profile.title}>
                                        {profile.title}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </ScrollArea>
    );
}
