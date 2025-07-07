"use client";

import { TableCol } from "@/components/common/data-table/table-cells";
import LinkableNode from "@/components/_v1/link-node";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { useModal } from "@/components/common/modal/provider";
import { DykeDoorTablePromiseProps } from "./dyke-doors-table";
import Image from "next/image";
import { env } from "@/env.mjs";

interface Props {
    item: DykeDoorTablePromiseProps["Item"];
}

function Door({ item }: Props) {
    return (
        <TableCol>
            <LinkableNode href={""}>
                <div className="flex gap-2">
                    <div className="">
                        <Image
                            className="cursor-pointer"
                            width={100}
                            height={100}
                            src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${item.img}`}
                            alt={""}
                        />
                    </div>
                    <div className="">
                        <TableCol.Primary>{item.title}</TableCol.Primary>
                        <TableCol.Secondary>{item.doorType}</TableCol.Secondary>
                    </div>
                </div>
            </LinkableNode>
        </TableCol>
    );
}

function Options({ item }: Props) {
    const modal = useModal();
    return (
        <Menu Icon={Icons.more}>
            <MenuItem
                Icon={Icons.calendar}
                onClick={() => {
                    // modal?.openModal(<DueDateModal item={item} />);
                }}
            >
                Due Date
            </MenuItem>
            <MenuItem
                onClick={() => {
                    // modal?.openSheet(
                    //     <SendEmailSheet
                    //         data={{
                    //             parentId: item.id,
                    //             to: item.customer?.email as any,
                    //             type: "sales",
                    //         }}
                    //         subtitle={`Payable | ${item.orderId}`}
                    //     />
                    // );
                }}
                Icon={Icons.Email}
            >
                Email
            </MenuItem>
        </Menu>
    );
}
export let DoorCells = Object.assign(() => <></>, {
    Door,
    Options,
});
