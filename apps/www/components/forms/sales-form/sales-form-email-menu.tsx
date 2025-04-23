import { useMemo } from "react";
import { PrintMenuAction } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet/footer/print.menu.action";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { Menu } from "@/components/(clean-code)/menu";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";

export function SalesFormEmailMenu({}) {
    const zus = useFormDataStore();

    return (
        <SalesEmailMenuItem
            salesId={zus?.metaData?.id}
            salesType={zus.metaData.type}
        />
    );

    return null;
}
