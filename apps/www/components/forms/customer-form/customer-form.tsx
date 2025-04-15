"use client";

import { useEffect, useState } from "react";
import { getCustomerProfilesAction } from "@/actions/cache/get-customer-profiles";
import { getTaxProfilesAction } from "@/actions/cache/get-tax-profiles";
import { createCustomerAction } from "@/actions/create-customer-action";
import { createCustomerAddressAction } from "@/actions/create-customer-address-action";
import { createCustomerSchema } from "@/actions/schema";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import useEffectLoader from "@/lib/use-effect-loader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@gnd/ui/button";

import FormInput from "../../common/controls/form-input";
import FormSelect from "../../common/controls/form-select";
import { SubmitButton } from "../../submit-button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../../ui/accordion";
import { Form } from "../../ui/form";
import { ExistingCustomerResolver } from "./existing-customer-resolver";

export type CustomerFormData = z.infer<typeof createCustomerSchema>;
type Props = {
    data?: CustomerFormData;
};
export const customerFormStaticCallbacks = {
    created: null,
};
export function CustomerForm({ data }: Props) {
    const [sections, setSections] = useState<string[]>(["general"]);

    const { params, setParams } = useCreateCustomerParams();
    const form = useForm<CustomerFormData>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            address1: undefined,
            address2: undefined,
            addressId: undefined,
            businessName: undefined,
            city: undefined,
            country: undefined,
            email: undefined,
            id: undefined,
            name: undefined,
            netTerm: undefined,
            phoneNo: undefined,
            phoneNo2: undefined,
            profileId: undefined,
            state: undefined,
            zip_code: undefined,
            customerType: "Personal",
            addressOnly: params.addressOnly,
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
            setSections(
                params?.addressOnly ? ["address"] : ["general", "address"],
            );
            let formData = {};
            Object.entries(data).map(
                ([k, v]) => (formData[k] = v || undefined),
            );
            form.reset({
                ...formData,
            });
        }
    }, [data, form, params]);

    const [customerType] = form.watch(["customerType"]);

    const createCustomerAddress = useAction(createCustomerAddressAction, {
        onSuccess: ({ data: resp }) => {
            toast.success(data?.id ? "Updated" : "Created");
            customerFormStaticCallbacks?.created?.(
                resp.customerId,
                resp?.addressId,
            );

            // if (resp) {
            setParams(null);
            // }
        },
    });
    const createCustomer = useAction(createCustomerAction, {
        onSuccess: ({ data: resp }) => {
            toast.success(data?.id ? "Updated" : "Created");
            customerFormStaticCallbacks?.created?.(
                resp.customerId,
                resp?.addressId,
            );
            // if (resp) {
            setParams(null);
            // }
        },
    });

    return (
        <Form {...form}>
            <form
                // onSubmit={form.handleSubmit(__test)}
                onSubmit={form.handleSubmit(
                    params?.addressOnly
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
                        {params.addressOnly ? (
                            <></>
                        ) : (
                            <AccordionItem value="general">
                                <AccordionTrigger disabled={params.addressOnly}>
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
                                    {!params.addressOnly || (
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
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                {JSON.stringify(form.formState)}
                <div className="absolute bottom-0 left-0 right-0 bg-white px-4">
                    <div className="mt-auto flex justify-end space-x-4">
                        <Button
                            variant="outline"
                            // onClick={() => setCustomerParams(null)}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <SubmitButton
                            isSubmitting={createCustomer.isExecuting}
                            disabled={
                                createCustomer.isExecuting ||
                                !form.formState.isValid
                            }
                        >
                            {data?.id ? "Update" : "Create"}
                        </SubmitButton>
                    </div>
                </div>
            </form>
        </Form>
    );
}
