"use client";

import { useParams } from "next/navigation";
import { Icons } from "@/components/_v1/icons";
import { useModal } from "@/components/common/modal/provider";

import { Button } from "@gnd/ui/button";

import DispatchModal from "../_dispatch-modal";

export default function PageAction() {
    const params = useParams();

    const modal = useModal();
    function newDispatch() {
        modal.openSheet(<DispatchModal type={params.type as any} />);
    }
    return (
        <>
            <Button onClick={newDispatch}>
                <Icons.add className="mr-2 size-4" />
                New
            </Button>
        </>
    );
}
