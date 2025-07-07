import { useMemo } from "react";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";

import { Label } from "@gnd/ui/label";

import { useFormDataStore } from "../../_common/_stores/form-data-store";
import { SettingsClass } from "../../_utils/helpers/zus/settings-class";
import { Input, LineSwitch, Select } from "./line-input";

export function FormDataPage({}) {
    const zus = useFormDataStore();
    const setting = useMemo(() => new SettingsClass(), []);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    return (
        <div className="lg:max-w-5xl xl:max-w-4xl">
            <div className="grid grid-cols-2 gap-4 p-4 sm:gap-6">
                <div className="">
                    <Input label="Q.B Order #" name="metaData.qb" />
                </div>
                <div className="">
                    <Input label="P.O No" name="metaData.po" />
                </div>
                <div className="">
                    <Select
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
                        label="Delivery"
                        name="metaData.deliveryMode"
                        options={salesData.deliveryModes}
                        titleKey="text"
                        valueKey="value"
                    />
                </div>
                <Select
                    label="Tax Profile"
                    name="metaData.tax.taxCode"
                    options={taxList}
                    titleKey="title"
                    valueKey="taxCode"
                    onSelect={(e) => {
                        setting.taxCodeChanged();
                    }}
                />
                <Select
                    label="Payment Method"
                    name="metaData.paymentMethod"
                    options={salesData.paymentOptions}
                    onSelect={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                {/* <div className="col-span-2"></div> */}
                <Input
                    label="Sales Discount ($)"
                    type="number"
                    name="metaData.pricing.discount"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Input
                    label="Labor Cost ($)"
                    type="number"
                    name="metaData.pricing.labour"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Input
                    label="Delivery Cost ($)"
                    type="number"
                    name="metaData.pricing.delivery"
                    onChange={(e) => {
                        setting.calculateTotalPrice();
                    }}
                />
                <Select
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
