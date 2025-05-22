"use client";

import React, { useRef, useTransition } from "react";
import { _createPickup } from "@/app/(v1)/(loggedIn)/sales/_actions/_sales-pickup";
import Modal from "@/components/common/modal";
import { closeModal } from "@/lib/modal";
import refresh from "@/lib/refresh";
import { _useAsync } from "@/lib/use-async";
import { ISalesOrder, ISalesPickup } from "@/types/sales";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

interface Props {
    order: ISalesOrder;
}
export default function PickupModal({ order }: Props) {
    const [isSaving, startTransition] = useTransition();
    const form = useForm<ISalesPickup>({
        defaultValues: {
            meta: {},
        },
    });
    async function submit() {
        startTransition(async () => {
            try {
                const sig = sigCanvas.current.toSVG();
                // console.log(sig);
                console.log(typeof sig);
                const data = form.getValues();
                console.log(data);
                data.meta.signature = sig;
                if (!data.pickupAt) data.pickupAt = new Date();
                await _createPickup(order.id, data);

                closeModal();
                toast.message("Saved!");
                refresh();
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }

    async function init(order: ISalesOrder, pickup?: ISalesPickup) {
        form.reset({
            pickupAt: new Date().toISOString() as any,
            pickupBy: order.customer?.name,
            meta: {},
        });
    }
    const sigCanvas = useRef<any>(undefined);
    return (
        <Modal.Content>
            <Modal.Header title="Pickup Form" />
            <Tabs defaultValue="items">
                <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="form">Pickup Form</TabsTrigger>
                </TabsList>
            </Tabs>
            {/* <Modal.Footer
                className=""
                submitText="Save"
                onSubmit={submit}
            ></Modal.Footer> */}
        </Modal.Content>
    );
    // return (
    //     <BaseModal<{ order: ISalesOrder; pickup?: ISalesPickup }>
    //         className="sm:max-w-[500px]"
    //         onOpen={(data) => {
    //             init(data.order, data.pickup);
    //         }}
    //         onClose={() => {}}
    //         modalName="pickup"
    //         Title={({ data: order }) => <div>Pickup Form</div>}
    //         Content={({ data: order }) => (
    //             <div>
    //                 <div className="grid md:grid-cols-2 gap-4">
    //                     <div className="grid gap-2 col-span-2">
    //                         <Label>Pickup By</Label>
    //                         <Input
    //                             placeholder=""
    //                             className="h-8"
    //                             {...form.register("pickupBy")}
    //                         />
    //                     </div>
    //                     <div className="grid gap-2">
    //                         <Label>Pickup Date</Label>
    //                         <DatePicker
    //                             format={"YYYY-MM-DD"}
    //                             className="flex-1 w-full h-8"
    //                             {...form.register("pickupAt")}
    //                         />
    //                     </div>
    //                     <div className="border col-span-2 grid gap-2">
    //                         <Label>Signature</Label>
    //                         <SignaturePad
    //                             ref={sigCanvas}
    //                             options={{
    //                                 minWidth: 5,
    //                                 maxWidth: 10,
    //                                 penColor: "rgb(66, 133, 244)",
    //                             }}
    //                         />
    //                     </div>
    //                 </div>
    //             </div>
    //         )}
    //         Footer={({ data }) => (
    //             <Btn
    //                 isLoading={isSaving}
    //                 onClick={() => submit(data?.order as any)}
    //                 size="sm"
    //                 type="submit"
    //             >
    //                 Save
    //             </Btn>
    //         )}
    //     />
    // );
}
