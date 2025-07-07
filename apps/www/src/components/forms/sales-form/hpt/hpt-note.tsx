import { doorItemControlUid } from "@/app/(clean-code)/(sales)/_common/utils/item-control-utils";
import { useHpt, useHptLine } from "../context";
import { noteTagFilter } from "@/modules/notes/utils";
import { TableCell, TableRow } from "@gnd/ui/table";
import Note from "@/modules/notes";

export function HptNote({}) {
    const ctx = useHptLine();
    const { hpt, itemForm, isSlab, showNote, config } = useHpt();
    const { size, sizeForm } = ctx;
    const salesId = hpt?.zus?.metaData?.id;
    const itemId = itemForm?.id;
    const controlUid = doorItemControlUid(sizeForm?.doorId, size.size);
    const __noteTagFilter =
        salesId && itemId && sizeForm?.doorId
            ? [
                  noteTagFilter("itemControlUID", controlUid),
                  noteTagFilter("salesItemId", itemId),
                  noteTagFilter("salesId", salesId),
              ]
            : null;
    const colSpan =
        6 +
        (isSlab ? 1 : 0) +
        (config.hasSwing ? 1 : 0) +
        (config.noHandle ? 1 : 2);
    return (
        <>
            {!showNote || (
                <TableRow className="hover:bg-white">
                    <TableCell colSpan={colSpan} className="">
                        {__noteTagFilter ? (
                            <Note
                                admin
                                subject={"Production Note"}
                                headline=""
                                statusFilters={["public"]}
                                typeFilters={["production", "general"]}
                                tagFilters={__noteTagFilter}
                            />
                        ) : (
                            <div className="flex text-center font-mono p-2 items-center text-red-600">
                                <span>
                                    To access item note, you need to first save
                                    your invoice
                                </span>
                            </div>
                        )}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
