"use client";

import React, { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { _useAsync } from "@/lib/use-async";
import Btn from "../btn";
import BaseModal from "./base-modal";
import { closeModal } from "@/lib/modal";
import { toast } from "sonner";

import { Label } from "@gnd/ui/label";

import { ExtendedHome } from "@/types/community";
import { DatePicker } from "../date-range-picker";
import { activateHomeProductionAction } from "@/app/(v1)/_actions/community/activate-production";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import { ScrollArea } from "@gnd/ui/scroll-area";

export default function ActivateProductionModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();

    const [checkedIds, setCheckedIds] = useState<any>({});
    const [dueDate, setDueDate] = useState<any>();

    async function submit() {
        startTransition(async () => {
            // if(!form.getValues)
            try {
                const ids: number[] = [];
                Object.entries(checkedIds).map(
                    ([k, v]) => v && ids.push(Number(k)),
                );
                // console.log(ids);
                await activateHomeProductionAction(ids, dueDate);

                // await saveProject({
                //   ...form.getValues(),
                // });
                closeModal();
                toast.message("Units sent to production");
                route.refresh();
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    function checkHome(id, state) {
        setCheckedIds({
            ...checkedIds,
            [id]: state,
        });
    }
    return (
        <BaseModal<ExtendedHome[] | undefined>
            className="sm:max-w-[450px]"
            onOpen={(data) => {
                setDueDate(null);
                // setCheckedIds({});
                let checkedIDs = {};
                data?.map((h) => (checkedIDs[h.id] = true));
                setCheckedIds(checkedIDs);
            }}
            onClose={() => {}}
            modalName="activateProduction"
            Title={({ data }) => <div>Activate Unit Production</div>}
            Content={({ data }) => (
                <div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Due Date</Label>
                            <DatePicker
                                className="w-auto h-7"
                                setValue={(e) => setDueDate(e)}
                                value={dueDate}
                            />
                        </div>
                        <div className="col-span-2 flex flex-col">
                            <ScrollArea className="min-h-max max-h-[50vh]">
                                <Table>
                                    <TableBody>
                                        {data?.map((home) => (
                                            <TableRow key={home.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={
                                                            checkedIds[home.id]
                                                        }
                                                        onCheckedChange={(e) =>
                                                            checkHome(
                                                                home.id,
                                                                e,
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <PrimaryCellContent>
                                                        {home.project?.title}
                                                    </PrimaryCellContent>
                                                    <SecondaryCellContent>
                                                        {
                                                            home.project
                                                                ?.builder?.name
                                                        }
                                                    </SecondaryCellContent>
                                                </TableCell>
                                                <TableCell>
                                                    <PrimaryCellContent>
                                                        {home.modelName}
                                                    </PrimaryCellContent>
                                                    <SecondaryCellContent>
                                                        {home.lot}
                                                        {"/"}
                                                        {home.block}
                                                    </SecondaryCellContent>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            )}
            Footer={({ data }) => (
                <Btn
                    isLoading={isSaving}
                    onClick={() => submit()}
                    size="sm"
                    type="submit"
                >
                    Activate
                </Btn>
            )}
        />
    );
}
