import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SalesMenu } from "@/components/sales-menu";

export function SalesFormEmailMenu({}) {
    const zus = useFormDataStore();

    return (
        <SalesMenu
            id={zus?.metaData?.id}
            type={zus.metaData.type}
        >
            <SalesMenu.Notifications />
            <SalesMenu.PaymentNotifications />
        </SalesMenu>
    );
}
