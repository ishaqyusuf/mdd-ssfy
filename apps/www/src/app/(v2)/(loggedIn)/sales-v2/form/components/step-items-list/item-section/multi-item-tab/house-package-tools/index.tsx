import { useEffect } from "react";
import DoorsModal from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/doors-modal";
import {
    LegacyDoorHPTContext,
    useLegacyDoorHPTContext,
} from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import Money from "@/components/_v1/money";
import { _modal, useModal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";

import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { getDykeStepDoorByProductId } from "../../../../../_action/get-dyke-step-doors";
import { useDykeCtx } from "../../../../../_hooks/form-context";
import { useDoorSizes } from "../../../../../_hooks/use-door-size";
import { useMultiComponentItem } from "../../../../../_hooks/use-multi-component-item";
import HousePackageSizeLineItem from "./size-line-item";

export default function HousePackageTool({ componentTitle }) {
    const ctx = useDykeCtx();
    const componentItem = useMultiComponentItem(componentTitle);
    const { item, form, _setSizeList, doorConfig } = componentItem;

    useEffect(() => {
        componentItem.initializeSizes();
    }, []);
    const hptCtx = useLegacyDoorHPTContext(componentTitle);

    const { sizes, isType } = useDoorSizes(form, item.rowIndex, componentTitle);
    async function editSize() {
        const i = item.get.data();
        const formStep = i.item.formStepArray.find(
            (s) => s.step.title == "Door",
        );
        const dykeProductId = i.item.housePackageTool.dykeDoorId;

        const stepProd = await getDykeStepDoorByProductId(
            formStep.step.id,
            dykeProductId,
        );

        // modal.openModal(
        //     <SelectDoorHeightsModal
        //         form={form}
        //         rowIndex={item.rowIndex}
        //         stepProd={stepProd}
        //         productTitle={componentTitle}
        //         onSubmit={_setSizeList}
        //         superAdmin={ctx.superAdmin}
        //     />
        // );
    }

    return (
        <LegacyDoorHPTContext.Provider value={hptCtx}>
            <div className="flex justify-end gap-4">
                <Button
                    size="sm"
                    onClick={() => {
                        _modal.openModal(<DoorsModal hptCtx={hptCtx} />);
                    }}
                >
                    Change Selection
                </Button>
            </div>
            <Table className="" id="housePackageTable">
                <TableHeader>
                    <TableHead>Dimension</TableHead>
                    {componentItem.isComponent.hasSwing && (
                        <TableHead className="sm:w-[100px]">Swing</TableHead>
                    )}
                    {!componentItem.isComponent.multiHandles ? (
                        <>
                            <TableHead className="sm:w-[100px]">Qty</TableHead>
                        </>
                    ) : (
                        <>
                            <TableHead className="sm:w-[100px]">LH</TableHead>
                            <TableHead className="sm:w-[100px]">RH</TableHead>
                        </>
                    )}
                    {componentItem.calculatedPriceMode ? (
                        <>
                            <TableHead className="shidden lg:table-cell">
                                Estimate
                            </TableHead>
                            <TableHead
                                className={cn(ctx.dealerMode && "hidden")}
                            >
                                Addon/Qty
                            </TableHead>
                        </>
                    ) : (
                        <>
                            <TableHead className="shidden lg:table-cell">
                                Price
                            </TableHead>
                        </>
                    )}
                    <TableHead className="shidden lg:table-cell">
                        Line Total
                    </TableHead>
                    <TableHead></TableHead>
                </TableHeader>
                <TableBody>
                    {sizes
                        // .filter((row) => row.price)
                        .map((row) => (
                            <HousePackageSizeLineItem
                                size={row}
                                componentItem={componentItem}
                                key={row.dim}
                            ></HousePackageSizeLineItem>
                        ))}
                    <TableRow>
                        <TableCell
                            className="shidden lg:table-cell"
                            colSpan={doorConfig.singleHandle ? 4 : 5}
                        ></TableCell>
                        {/* <TableCell
                            className="lg:hidden"
                            colSpan={doorConfig.singleHandle ? 3 : 4}
                        ></TableCell> */}
                        <TableCell>
                            {/* <Money value={componentItem.unitPrice} /> */}
                        </TableCell>
                        <TableCell>
                            <Money value={componentItem.doorTotalPrice} />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            {/* <div className="flex justify-end gap-4">
                <Button onClick={editSize} type="button" variant={"outline"}>
                    Edit Size
                </Button>
            </div> */}
        </LegacyDoorHPTContext.Provider>
    );
}
