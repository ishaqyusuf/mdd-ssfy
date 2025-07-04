"use client";

import { useEffect } from "react";
import RenderForm from "@/_v2/components/common/render-form";
import {
    LegacyDykeFormContext,
    useLegacyDykeFormContext,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy-hooks";
import { Icons } from "@/components/_v1/icons";

import { Button } from "@gnd/ui/button";

import { addDoorUnitAction } from "../_action/add-door-unit";
import SalesAddressSection from "../../../sales/edit/components/sales-address-section";
import DykeSalesFooterSection from "./dyke-sales-footer-section";
import HeaderSection from "./dyke-sales-header-section";
import { DykeInvoiceItemSection } from "./item-section/item-section";
import SalesMetaData from "./sales-meta-data";

interface Props {
    defaultValues: any;
}
export default function SalesFormComponent({ defaultValues }: Props) {
    const ctx = useLegacyDykeFormContext(defaultValues);
    const { form, dealerMode, itemArray } = ctx;
    useEffect(() => {
        console.log({ defaultValues });
    }, []);

    return (
        <LegacyDykeFormContext.Provider value={ctx}>
            <RenderForm {...form}>
                <HeaderSection />
                <section
                    id="detailsSection"
                    className="my-2 grid gap-4 gap-x-8 border-y py-1 md:grid-cols-2 xl:grid-cols-5"
                >
                    {!dealerMode && <SalesMetaData />}
                    <SalesAddressSection />
                </section>
                {itemArray.fields.map((field, index) => (
                    <DykeInvoiceItemSection key={field.id} rowIndex={index} />
                ))}
                <div className="mt-2 flex justify-end space-x-2">
                    <Button
                        className=""
                        onClick={async () => {
                            const doorUnit = await addDoorUnitAction();
                            itemArray.append(doorUnit as any);
                        }}
                    >
                        <Icons.add className="mr-2 size-4" />
                        <span>Add Item</span>
                    </Button>
                </div>
                <DykeSalesFooterSection />
            </RenderForm>
        </LegacyDykeFormContext.Provider>
    );
}
