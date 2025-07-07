import { useContext } from "react";
import { Icons } from "@/components/_v1/icons";
import { _modal } from "@/components/common/modal/provider";
import { openModal } from "@/lib/modal";
import { useForm, useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";

import AddressDisplay from "../../_components/address-display";
import { SalesFormContext } from "../ctx";
import { ISalesForm } from "../type";
import SalesAddressModal from "./sales-address-modal";

export default function SalesAddressSection() {
    const form = useFormContext<ISalesForm>();
    const [shipping, billing, customer, customerId] = form.watch([
        "shippingAddress",
        "billingAddress",
        "customer",
        "customerId",
    ]);
    return (
        <>
            <div
                onClick={() => {
                    _modal?.openModal(<SalesAddressModal form={form} />);
                }}
                className="group relative grid cursor-pointer grid-cols-2  rounded-lg p-2 hover:bg-accent-foreground hover:text-white hover:shadow-sm dark:hover:bg-accent xl:col-span-2"
            >
                <div className="absolute right-0 opacity-0 group-hover:opacity-100 ">
                    <Button size="sm" variant="secondary" className="h-8">
                        <Icons.edit className="h-3.5 w-3.5 " />
                    </Button>
                </div>
                <AddressDisplay address={billing} customer={customer} />
                <AddressDisplay
                    address={shipping}
                    type={"shipping"}
                    customer={customer}
                />
            </div>
        </>
    );
}
