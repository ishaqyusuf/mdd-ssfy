import { useZodForm } from "@/hooks/use-zod-form";
import { inventoryCategoryFormSchema } from "@sales/schema";
import { useEffect } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { CustomerFormData } from "./customer-form";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomerSchema } from "@/actions/schema";

interface FormContextProps {
    children?;
    data?;
}
export function FormContext({ children, data }: FormContextProps) {
    const { params, setParams, actionTitle } = useCreateCustomerParams();
    const defaultValues = {
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
    };

    const form = useZodForm(createCustomerSchema, {
        defaultValues: {
            ...(defaultValues as any),
        },
    });
    useEffect(() => {
        if (data) {
            setParams({
                formSectionsTrigger: params?.address
                    ? ["address"]
                    : ["general", "address"],
            });
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
                    name: params.search,
                });
            }
        }
    }, [data, params?.address, params.search, , form]);

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useCustomerForm = () =>
    useFormContext<z.infer<typeof createCustomerSchema>>();

