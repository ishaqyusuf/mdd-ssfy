import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";

export function SalesFormEmailMenu({}) {
    const zus = useFormDataStore();

    return (
        <SalesEmailMenuItem
            salesId={zus?.metaData?.id}
            salesType={zus.metaData.type}
            orderNo={zus?.metaData?.salesId}
        />
    );
}
