"use client";

import StatusBadge from "@/components/_v1/status-badge";
import { TableCol } from "@/components/common/data-table/table-cells";
import { formatDate } from "@/lib/use-day";

import { Label } from "@gnd/ui/label";

interface Props {
    note?;
}
export default function Note({ note }: Props) {
    return (
        <div className="border-b py-2 text-sm" key={note.id}>
            <div className="flex justify-between space-x-4">
                <div className="">
                    <Label>{note.headline || note.status}</Label>
                    {"   "}
                    <StatusBadge sm>{note.type}</StatusBadge>
                </div>
                <TableCol.Secondary>
                    {formatDate(note.createdAt)}
                </TableCol.Secondary>
            </div>
            <TableCol.Secondary>
                {note.description || note.status}
            </TableCol.Secondary>
            <TableCol.Secondary>{note.item}</TableCol.Secondary>
            <div className="flex justify-end">
                - <TableCol.Secondary>{note?.user?.name}</TableCol.Secondary>
            </div>
        </div>
    );
}
