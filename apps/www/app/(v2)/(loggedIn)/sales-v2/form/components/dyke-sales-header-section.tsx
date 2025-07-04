"use client";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";

import Btn from "@/components/_v1/btn";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { useModal } from "@/components/common/modal/provider";
import useScroll from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { ArchiveRestore } from "lucide-react";

import { Label } from "@gnd/ui/label";

import { useDykeCtx, useDykeForm } from "../_hooks/form-context";
import useDykeFormSaver from "../_hooks/useDykeFormSaver";
import PaymentModal from "../../_components/_payments-modal";
import SalesNoteModal from "../../_components/_sales-note/_modal";
import { SaveMode } from "../../type";
import Evaluator from "./evaluator";
import DykeSettingsModal from "./modals/dyke-settings";
import SaveErrorsModal from "./modals/save-errors-modal";

export default function HeaderSection({}) {
    const form = useDykeForm();
    const [orderId, id, type, slug, date] = form.getValues([
        "order.orderId",
        "order.id",
        "order.type",
        "order.slug",
        "order.createdAt",
    ]);
    const saver = useDykeFormSaver(form);
    const scroll = useScroll((scrollY) => scrollY > 200);
    const modal = useModal();
    const { dealerMode } = useDykeCtx();
    async function save(and: SaveMode = "default") {
        setTimeout(() => {
            form.handleSubmit((data) => saver.save(data, and))();
        }, 100);
    }
    function SaveBtn() {
        return (
            <Menu
                variant={"secondary"}
                disabled={saver.saving}
                label={"Save"}
                Icon={null}
            >
                <MenuItem onClick={() => save()} Icon={Icons.save}>
                    Save
                </MenuItem>
                <MenuItem
                    onClick={() => save("close")}
                    Icon={Icons.saveAndClose}
                >
                    Save & Close
                </MenuItem>
                <MenuItem onClick={() => save("new")} Icon={Icons.add}>
                    Save & New
                </MenuItem>
            </Menu>
        );
    }
    function restoreFailed() {
        modal.openSheet(<SaveErrorsModal />);
    }
    return (
        <div className="h-12">
            <div
                className={cn(
                    "flex h-12 items-center",
                    scroll.isScrolled &&
                        "fixed  left-0  right-0 top-0 z-10  grid lg:grid-cols-[240px_minmax(0,1fr)] ",
                )}
            >
                {scroll.isScrolled && <div></div>}
                <div
                    className={cn(
                        "flex flex-1 flex-col  justify-between sm:flex-row sm:items-center",
                        scroll.isScrolled &&
                            "border-b bg-accent   px-8 py-2 shadow-sm",
                    )}
                >
                    <div className="">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {orderId && id && type == "order"
                                ? "SALES #:"
                                : "QUOTE #:"}{" "}
                            {orderId || "New"}
                        </h2>
                    </div>
                    <div
                        className={cn(
                            dealerMode
                                ? "hidden"
                                : "flex items-center space-x-2",
                        )}
                    >
                        <div className="inline-flex items-center space-x-2">
                            <Label>Date:</Label>
                            <DatePicker
                                disabled={(date) => date > new Date()}
                                setValue={(e) =>
                                    form.setValue("order.createdAt", e)
                                }
                                className="h-8 w-auto"
                                value={date}
                            />
                        </div>
                        {id && type == "order" && (
                            <Btn
                                size="sm"
                                // variant={""}
                                onClick={() => {
                                    modal.openSheet(
                                        <PaymentModal
                                            id={id}
                                            orderId={orderId}
                                            form={form}
                                        />,
                                    );
                                }}
                            >
                                Payment
                            </Btn>
                        )}
                        <Btn
                            size="sm"
                            variant={"outline"}
                            onClick={() => {
                                modal.openSheet(
                                    <SalesNoteModal
                                        id={id}
                                        orderId={orderId}
                                    />,
                                );
                            }}
                        >
                            Notes
                        </Btn>
                        <SaveBtn />
                        <Evaluator />
                    </div>
                    <div className={cn(dealerMode ? "" : "hidden")}>
                        <SaveBtn />
                    </div>
                </div>
            </div>
        </div>
    );
}
