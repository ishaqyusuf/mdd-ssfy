"use client";

import { useEffect } from "react";
import { Icons } from "@/components/_v1/icons";
import { SalesFormClient } from "@/components/forms/sales-form/sales-form";
import CustomerProfileUpdateModal from "@/components/modals/customer-profile-update-modal";
import { useSalesFormFeatureParams } from "@/hooks/use-sales-form-feature-params";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";

import { useFormDataStore } from "../_common/_stores/form-data-store";
import { useSticky } from "../_hooks/use-sticky";
import {
    zhAddItem,
    zhInitializeState,
} from "../_utils/helpers/zus/zus-form-helper";
import { GetSalesBookForm } from "../../../_common/use-case/sales-book-form-use-case";
import { FormDataPage } from "./data-page";
import { FormFooter } from "./form-footer";
import { FormHeader } from "./form-header";
import ItemSection from "./item-section";

interface FormClientProps {
    data: GetSalesBookForm;
}

export function FormClient({ data }) {
    const zus = useFormDataStore();
    useEffect(() => {
        zus.init(zhInitializeState(data));
    }, []);
    const feature = useSalesFormFeatureParams();

    const Component = !feature?.params?.legacyMode
        ? SalesFormClient
        : FormClientOld;

    return <Component key="component" data={data} />;
    // return <FormClientOld data={data} />;
}
function FormClientOld({ data }: FormClientProps) {
    const zus = useFormDataStore();

    const sticky = useSticky((bv, pv, { top, bottom }) => {
        return top < 100;
    });
    if (!zus.formStatus) return <></>;
    return (
        <div className="mb-28 bg-white">
            <FormHeader sticky={sticky} />
            <div
                ref={sticky.containerRef}
                className={cn(
                    sticky.isFixed && "mt-10 xl:mt-24",
                    "min-h-screen",
                )}
            >
                <div
                    className={cn(
                        zus.currentTab != "info" &&
                            zus.currentTab &&
                            "z-0 h-0 w-0 overflow-hidden opacity-0",
                        "lg:flex lg:gap-4",
                    )}
                >
                    <FormDataPage />
                </div>

                <div
                    className={cn(
                        !(zus.currentTab == "invoice") &&
                            "z-0 h-0 w-0 overflow-hidden opacity-0",
                    )}
                >
                    {zus.sequence?.formItem?.map((uid) => (
                        <ItemSection key={uid} uid={uid} />
                    ))}
                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={() => {
                                zhAddItem();
                            }}
                        >
                            <Icons.add className="mr-2 size-4" />
                            <span>Add</span>
                        </Button>
                    </div>
                </div>
            </div>
            <FormFooter />
            <CustomerProfileUpdateModal
                phoneNo={zus.metaData.primaryPhone}
                profileId={zus.metaData.salesProfileId}
            />
        </div>
    );
}
