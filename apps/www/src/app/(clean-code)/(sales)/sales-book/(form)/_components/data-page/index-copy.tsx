import { useMemo } from "react";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";

import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { SettingsClass } from "../../_utils/helpers/zus/settings-class";
import { Input, Select } from "./line-input";

export function FormDataPage({}) {
    const zus = useFormDataStore();
    const setting = useMemo(() => new SettingsClass(), []);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    return (
        <div className="lg:max-w-5xl xl:max-w-4xl">
            <div className="sgrid-cols-2 grid gap-4 p-4 sm:gap-6">
                <div className="">
                    <Input midday label="Q.B Order #" name="metaData.qb" />
                </div>
                <div className="">
                    <Input midday label="P.O No" name="metaData.po" />
                </div>
                <div className="">
                    <Select
                        midday
                        label={"Profile"}
                        onSelect={(e) => {
                            setting.salesProfileChanged();
                        }}
                        name="metaData.salesProfileId"
                        options={profiles}
                        titleKey="title"
                        valueKey="id"
                    />
                </div>
                <div className="">
                    <Select
                        midday
                        label="Delivery"
                        name="metaData.deliveryMode"
                        placeholder="Select Delivery Mode..."
                        options={salesData.deliveryModes}
                        titleKey="text"
                        valueKey="value"
                    />
                </div>
                <Select
                    midday
                    label="Tax Profile"
                    name="metaData.tax.taxCode"
                    options={taxList}
                    titleKey="title"
                    placeholder="Select Tax Profile..."
                    valueKey="taxCode"
                    onSelect={(e) => {
                        setting.taxCodeChanged();
                    }}
                />
                <Select
                    midday
                    label="Payment Method"
                    name="metaData.paymentMethod"
                    placeholder="Select Payment Method..."
                    options={salesData.paymentOptions}
                    onSelect={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                {/* <div className="col-span-2"></div> */}
                <Input
                    midday
                    currency
                    label="Sales Discount ($)"
                    type="number"
                    name="metaData.pricing.discount"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Input
                    midday
                    currency
                    label="Labor Cost ($)"
                    type="number"
                    name="metaData.pricing.labour"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Input
                    midday
                    label="Delivery Cost ($)"
                    type="number"
                    currency
                    name="metaData.pricing.delivery"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Select
                    midday
                    label="Net Term"
                    name="metaData.paymentTerm"
                    options={salesData.paymentTerms}
                    valueKey={"value"}
                    titleKey={"text"}
                    onSelect={(e) => {}}
                />
            </div>
        </div>
    );
}
