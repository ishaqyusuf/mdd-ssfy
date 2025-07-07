import { useCustomerProfiles } from "@/_v2/hooks/use-static-data";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { useAppSelector } from "@/store";
import { ISalesSetting } from "@/types/post";
import { UseFormReturn } from "react-hook-form";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";

export default function GeneralSettings({
    form,
}: {
    form: UseFormReturn<ISalesSetting>;
}) {
    const profiles = useCustomerProfiles();
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">General Info</h3>
                <p className="text-sm text-muted-foreground">
                    Configure how you receive notifications.
                </p>
            </div>
            <Separator />
            <Form {...form}>
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        type="number"
                        control={form.control}
                        name="meta.tax_percentage"
                        label="Tax Percentage (%)"
                    />
                    <FormInput
                        type="number"
                        control={form.control}
                        name="meta.ccc"
                        label="C.C.C (%)"
                    />
                    <FormSelect
                        options={[
                            { id: null, title: "None" },
                            ...(profiles?.data || []),
                        ]}
                        titleKey="title"
                        valueKey="id"
                        control={form.control}
                        name="meta.salesProfileId"
                        label="Default Customer Profile"
                    />
                </div>
            </Form>
        </div>
    );
}
