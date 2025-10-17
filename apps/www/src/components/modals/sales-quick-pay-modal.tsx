import { CustomModal, CustomModalContent } from "./custom-modal";
import { useSalesQuickPay } from "@/hooks/use-sales-quick-pay";
import { SalesQuickPayment } from "../widgets/sales-quick-payment";

export function SalesQuickPayModal({}) {
    const qpCtx = useSalesQuickPay();
    const opened = !!qpCtx?.params?.quickPaySalesId;

    const close = () => {
        qpCtx.setParams(null);
    };
    return (
        <CustomModal
            size="sm"
            title="Payment"
            open={opened}
            onOpenChange={close}
        >
            <CustomModalContent>
                <SalesQuickPayment />
            </CustomModalContent>
        </CustomModal>
    );
}

