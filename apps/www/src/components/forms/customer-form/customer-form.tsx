"use client";

import { useEffect, useState } from "react";
import { getCustomerProfilesAction } from "@/actions/cache/get-customer-profiles";
import { getTaxProfilesAction } from "@/actions/cache/get-tax-profiles";
import { createCustomerAction } from "@/actions/create-customer-action";
import { createCustomerAddressAction } from "@/actions/create-customer-address-action";
import { getSalesListAction } from "@/actions/get-sales-list";
import { createCustomerSchema } from "@/actions/schema";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import useEffectLoader from "@/lib/use-effect-loader";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import FormInput from "../../common/controls/form-input";
import FormSelect from "../../common/controls/form-select";
import { SubmitButton } from "../../submit-button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Form } from "@gnd/ui/form";
import { ExistingCustomerResolver } from "./existing-customer-resolver";
import AddressAutoComplete from "@/components/address-autocomplete";

export type CustomerFormData = z.infer<typeof createCustomerSchema>;
type Props = {
    data?: CustomerFormData;
};
export function CustomerForm({ data }: Props) {
    const [sections, setSections] = useState<string[]>(["general"]);

    const { params, setParams, actionTitle } = useCreateCustomerParams();
    const form = useForm<CustomerFormData>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            address1: undefined,
            formattedAddress: undefined,
            address2: undefined,
            addressId: undefined,
            businessName: undefined,
            city: undefined,
            country: undefined,
            email: undefined,
            id: undefined,
            name: undefined,
            route: undefined,
            netTerm: undefined,
            phoneNo: undefined,
            phoneNo2: undefined,
            profileId: undefined,
            state: undefined,
            zip_code: undefined,
            customerType: "Personal",
            addressOnly: !!params.address,
            addressMeta: {},
            // resolutionRequired: false,
        },
    });
    const resp = useEffectLoader(
        async () => {
            const re = {
                taxProfiles: await getTaxProfilesAction(),
                salesProfiles: await getCustomerProfilesAction(),
            };
            return re;
        },
        {
            wait: 120,
        },
    );
    const { taxProfiles, salesProfiles } = resp?.data || {};
    useEffect(() => {
        if (data) {
            setSections(params?.address ? ["address"] : ["general", "address"]);
            let formData = {};

            Object.entries(data).map(
                ([k, v]) => (formData[k] = v || undefined),
            );
            form.reset({
                ...formData,
                addressOnly: !!params.address,
            });
        } else {
            if (
                params.search
                //  &&
                // Number.isInteger(params.search?.replaceAll("-", "")?.trim())
            ) {
                form.reset({
                    phoneNo: params.search,
                });
            }
        }
    }, [data, form, params]);

    const [customerType] = form.watch(["customerType"]);
    const [resolutionRequired, setResolutionRequired] = useState(false);
    const lt = useLoadingToast();
    const createCustomerAddress = useAction(createCustomerAddressAction, {
        onSuccess: ({ data: resp }) => {
            toast.success(data?.id ? "Updated" : "Created");
            lt.display({
                variant: "success",
                title: "Saved",
            });
            setParams({
                payload: {
                    customerId: resp.customerId,
                    addressId: resp.addressId,
                    address: params.address as any,
                },
            });
            // if (resp) {
            // setParams(null);
            // }
        },
        onError(e) {
            lt.display({
                variant: "error",
                title: "Unable to complete",
            });
        },
    });
    const createCustomer = useAction(createCustomerAction, {
        onError() {},
        onSuccess: ({ data: resp }) => {
            toast.success(data?.id ? "Updated" : "Created");
            // customerFormStaticCallbacks?.created?.(
            //     resp.customerId,
            //     resp?.addressId,
            // );
            setParams({
                payload: {
                    customerId: resp.customerId,
                    addressId: resp.addressId,
                    address: params.address as any,
                },
            });
            // if (resp) {
            // }
        },
    });
    const addressId = form.watch("addressId");
    const [sales, setSales] = useState([]);
    useEffect(() => {
        setTimeout(() => {
            if (!addressId) {
                setSales([]);
            } else
                getSalesListAction({
                    "address.id": addressId,
                }).then(({ data: sales }) => {
                    setSales(sales);

                    setResolutionRequired(!!sales?.length);
                    // form.setValue("resolutionRequired", !!sales?.length);
                });
        }, 150);
    }, [addressId]);
    function handleCreateCopy() {}
    const [searchInput, setSearchInput] = useState("");
    return (
        <Form {...form}>
            <form
                // onSubmit={form.handleSubmit(__test)}
                onSubmit={form.handleSubmit(
                    params?.address
                        ? createCustomerAddress.execute
                        : createCustomer.execute,
                )}
                className="flex flex-col overflow-x-hidden pb-32"
            >
                <div className="">
                    <Accordion
                        key={sections.join("-")}
                        type="multiple"
                        defaultValue={sections}
                        className="space-y-6"
                    >
                        {params.address ? (
                            <></>
                        ) : (
                            <AccordionItem value="general">
                                <AccordionTrigger disabled={!!params.address}>
                                    General
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        <ExistingCustomerResolver />
                                        <FormSelect
                                            placeholder="Customer Type"
                                            control={form.control}
                                            name="customerType"
                                            label="Customer Type"
                                            size="sm"
                                            options={["Personal", "Business"]}
                                        />
                                        {customerType == "Business" ? (
                                            <FormInput
                                                control={form.control}
                                                name="businessName"
                                                label="Business Name"
                                                size="sm"
                                            />
                                        ) : (
                                            <FormInput
                                                control={form.control}
                                                name="name"
                                                label="Name"
                                                size="sm"
                                            />
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput
                                                control={form.control}
                                                name="phoneNo"
                                                label="Phone"
                                                size="sm"
                                            />
                                            <FormInput
                                                control={form.control}
                                                name="email"
                                                label="Email"
                                                size="sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormSelect
                                                control={form.control}
                                                name="profileId"
                                                label="Customer Profile"
                                                size="sm"
                                                titleKey="title"
                                                valueKey="id"
                                                options={salesProfiles?.map(
                                                    (s) => ({
                                                        ...s,
                                                        id: String(s.id),
                                                    }),
                                                )}
                                            />
                                            <FormSelect
                                                control={form.control}
                                                name="taxCode"
                                                label="Tax Profile"
                                                size="sm"
                                                titleKey="title"
                                                valueKey="taxCode"
                                                options={taxProfiles || []}
                                            />
                                            <FormSelect
                                                size="sm"
                                                label="Net Term"
                                                name="netTerm"
                                                control={form.control}
                                                options={salesData.paymentTerms}
                                                valueKey={"value"}
                                                titleKey={"text"}
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}

                        <AccordionItem value="address">
                            <AccordionTrigger>Address</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                    <AddressAutoComplete
                                        searchInput={searchInput}
                                        setSearchInput={setSearchInput}
                                        dialogTitle="Search Address"
                                        setAddress={(address) => {
                                            form.setValue(
                                                "formattedAddress",
                                                address.formattedAddress,
                                            );
                                            form.setValue(
                                                "address1",
                                                address.address1,
                                            );
                                            form.setValue(
                                                "address2",
                                                address.address2,
                                            );
                                            form.setValue("city", address.city);
                                            form.setValue(
                                                "state",
                                                address.region,
                                            );
                                            form.setValue(
                                                "zip_code",
                                                address.postalCode,
                                            );
                                            form.setValue(
                                                "country",
                                                address.country,
                                            );
                                            // form.setValue("country", address.);
                                            // form.setValue(
                                            //     "addressId",
                                            //     address.id,
                                            // );
                                        }}
                                    />
                                    {!params.address || (
                                        <>
                                            <FormInput
                                                control={form.control}
                                                name="name"
                                                label="Name"
                                                size="sm"
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormInput
                                                    control={form.control}
                                                    name="phoneNo"
                                                    label="Phone"
                                                    size="sm"
                                                />
                                                <FormInput
                                                    control={form.control}
                                                    name="email"
                                                    label="Email"
                                                    size="sm"
                                                />
                                            </div>
                                        </>
                                    )}
                                    <FormInput
                                        control={form.control}
                                        name="address1"
                                        label="Address Line 1"
                                        size="sm"
                                    />
                                    <FormInput
                                        control={form.control}
                                        name="route"
                                        label="Route"
                                        size="sm"
                                    />
                                    <FormInput
                                        control={form.control}
                                        name="address2"
                                        label="Address Line 2"
                                        size="sm"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput
                                            control={form.control}
                                            name="phoneNo2"
                                            label="Secondary Phone"
                                            size="sm"
                                        />
                                        <FormInput
                                            control={form.control}
                                            name="city"
                                            label="City"
                                            size="sm"
                                        />
                                        <FormInput
                                            control={form.control}
                                            name="state"
                                            label="State / Province"
                                            size="sm"
                                        />
                                        <FormInput
                                            control={form.control}
                                            name="zip_code"
                                            label="Zip Code / Postal Code"
                                            size="sm"
                                        />
                                    </div>
                                </div>
                                {!(sales?.length && resolutionRequired) || (
                                    <>
                                        <Alert className="mt-4 border-amber-500">
                                            <AlertTitle className="font-medium text-amber-800">
                                                Connected Sales Detected
                                            </AlertTitle>
                                            <AlertDescription className="mt-2">
                                                <p className="mb-3 text-sm text-amber-700">
                                                    The address you are editing
                                                    is connected to multiple (
                                                    {sales?.length}) sales, and
                                                    this will have all connected
                                                    sales address updated.
                                                </p>
                                                <div className="relative">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setResolutionRequired(
                                                                    false,
                                                                );
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            I know
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={
                                                                handleCreateCopy
                                                            }
                                                        >
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Create a copy
                                                        </Button>
                                                    </div>
                                                    <Accordion
                                                        type="single"
                                                        collapsible
                                                        className="mt-4s hidden"
                                                    >
                                                        <AccordionItem value="connected-sales">
                                                            <AccordionTrigger className="text-sm font-medium">
                                                                Connected Sales
                                                                ({sales.length})
                                                            </AccordionTrigger>
                                                            <AccordionContent>
                                                                <div className="space-y-3">
                                                                    {sales.map(
                                                                        (
                                                                            sale,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    sale.id
                                                                                }
                                                                                className="rounded-md border p-3 text-sm"
                                                                            >
                                                                                <div className="mb-2 flex items-start justify-between">
                                                                                    <div className="font-medium">
                                                                                        {
                                                                                            sale.id
                                                                                        }
                                                                                    </div>
                                                                                    <Badge
                                                                                        variant={
                                                                                            sale.status ===
                                                                                            "Completed"
                                                                                                ? "default"
                                                                                                : sale.status ===
                                                                                                    "Pending"
                                                                                                  ? "outline"
                                                                                                  : "destructive"
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            sale.status
                                                                                        }
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="text-muted-foreground">
                                                                                    <div>
                                                                                        Date:{" "}
                                                                                        {new Date(
                                                                                            sale.date,
                                                                                        ).toLocaleDateString()}
                                                                                    </div>
                                                                                    <div>
                                                                                        Sales
                                                                                        Rep:{" "}
                                                                                        {
                                                                                            sale.salesRep
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    </>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="lg:absolute bottom-0 left-0 right-0 bg-white pt-4 lg:pt-0 px-4">
                    <div className="mt-auto flex justify-end space-x-4">
                        <Button
                            variant="outline"
                            // onClick={() => setCustomerParams(null)}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <SubmitButton
                            isSubmitting={
                                createCustomer.isExecuting ||
                                createCustomerAddress.isExecuting
                            }
                            disabled={
                                createCustomer.isExecuting ||
                                createCustomerAddress.isExecuting ||
                                !form.formState.isValid ||
                                resolutionRequired
                            }
                        >
                            {actionTitle}
                        </SubmitButton>
                    </div>
                </div>
            </form>
        </Form>
    );
}
