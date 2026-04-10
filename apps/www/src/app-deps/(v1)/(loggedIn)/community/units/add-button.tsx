"use client";

import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";

import { useHomeModal } from "./home-modal";

export default function AddHomeBtn() {
    const modal = useHomeModal();
    return (
        <>
            <Button
                onClick={() => {
                    modal.open();
                }}
                size="sm"
            >
                <Icons.add className="mr-2 size-4" />
                <span>Add</span>
            </Button>
        </>
    );
}
