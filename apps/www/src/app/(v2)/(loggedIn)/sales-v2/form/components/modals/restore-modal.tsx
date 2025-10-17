import { useEffect, useState } from "react";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import { Icons } from "@/components/_v1/icons";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import Modal from "@/components/common/modal";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { saveStepProduct } from "../../_action/save-step-product";
import { IStepProducts } from "../step-items-list/item-section/step-products";
import {
    getDykeStepState,
    getFormSteps,
} from "../step-items-list/item-section/step-products/init-step-components";
import { ProductImage } from "../step-items-list/item-section/step-products/product";

interface Props {
    // products: IStepProducts;
    // setStepProducts;
    // invoiceForm;
    // lineItemIndex;
    // stepIndex;
    // stepForm;
    stepCtx: LegacyDykeFormStepType;
}
export default function RestoreComponentsModal({
    // products,
    // invoiceForm,
    // lineItemIndex,
    // stepIndex,
    // stepForm,
    stepCtx,
}: Props) {
    const { step: stepForm, stepIndex, deletedComponents } = stepCtx;
    const [sortedProds, setSortedProds] = useState(
        deletedComponents.sort((a, b) =>
            a.product.title?.localeCompare(b.product.title),
        ),
    );
    const form = useForm({
        defaultValues: {
            deleteSelections: {},
            // deletables: {},
            show: {},
        },
    });
    const [restoredUids, setRestoredUids] = useState({});
    const [components, setComponents] = useState<
        ReturnType<typeof getDykeStepState>
    >([]);
    useEffect(() => {
        const formArray = stepCtx.itemCtx.formSteps();
        const _depFormSteps = getFormSteps(formArray, stepIndex);
        const stateDeps = getDykeStepState(_depFormSteps, stepForm);
        setComponents(stateDeps);
    }, []);
    async function _restore(item: IStepProducts[number]) {
        const d = form.getValues("show");
        let _show = item.meta.show || {};
        let _deleted = item.meta.deleted || {};
        let valid = false;
        Object.entries(d).map(([k, v]) => {
            if (!v) delete _show[k];
            else {
                (_show[k] = true) && (valid = true);
                delete _deleted[k];
            }
        });
        if (Object.values(_show).filter(Boolean).length == 0) {
            toast.error("Select component deps first!.");
            return;
        }
        item.meta.show = _show;
        // item.meta.deleted = _deleted;
        item.meta.deleted = {
            xZTAn: true,
        };

        const reps = await saveStepProduct(item);

        stepCtx.reloadComponents();
        toast.success("Restored");
    }
    return (
        <Modal.Content size="lg">
            <Modal.Header
                title="Restore"
                subtitle={"select component dependencies to start restore."}
            />
            <Form {...form}>
                <div className="flex flex-wrap gap-4">
                    {components?.map((d, i) => (
                        <div key={i}>
                            <FormCheckbox
                                control={form.control}
                                name={`show.${d.key}` as any}
                                label={d.steps.map((s) => s.value).join(" & ")}
                            />
                        </div>
                    ))}
                </div>
            </Form>
            <ScrollArea className="h-[70vh] p-4">
                <div className="grid grid-cols-3 gap-4">
                    {sortedProds?.map((item) => (
                        <button
                            onClick={() => {
                                _restore(item);
                            }}
                            key={item.id}
                            className={cn(
                                "relative flex min-h-[200px] flex-col items-center justify-center border hover:shadow-sm",
                            )}
                        >
                            <div className="absolute left-0 top-0 -m-4">
                                {item.productCode && (
                                    <Badge variant="outline">
                                        #{item.productCode}
                                    </Badge>
                                )}
                            </div>

                            <PriceInfo prod={item} />
                            <div className="h-16s w-2/3 overflow-hidden">
                                <ProductImage aspectRatio={1 / 1} item={item} />
                            </div>
                            <div className="">
                                <span className=" text-sm">
                                    {item.product.title}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
            <Modal.Footer />
        </Modal.Content>
    );
}
function PriceInfo({ prod }: { prod: IStepProducts[number] }) {
    let priceLen = Object.values(prod.door?.meta?.doorPrice || {}).filter(
        Boolean,
    ).length;
    if (priceLen)
        return (
            <div id="" className="absolute right-0 top-0 flex ">
                <Label>{priceLen}</Label>
                <Icons.dollar className="size-4 text-muted-foreground" />
            </div>
        );
    return null;
}
