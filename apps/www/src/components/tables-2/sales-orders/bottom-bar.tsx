"use client";

import { BottomBar as CoreBottomBar } from "@/components/tables-2/core";
import { Button } from "@gnd/ui/button";

type Props = {
    selectedCount: number;
    onDeselect: () => void;
};

export function BottomBar({ selectedCount, onDeselect }: Props) {
    return (
        <CoreBottomBar selectedCount={selectedCount} onDeselect={onDeselect}>
            <Button variant="outline" size="sm" disabled>
                Bulk actions
            </Button>
        </CoreBottomBar>
    );
}
