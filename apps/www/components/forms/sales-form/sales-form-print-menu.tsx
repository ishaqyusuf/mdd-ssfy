import { useMemo } from "react";
import { PrintMenuAction } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet/footer/print.menu.action";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";

export function SalesFormPrintMenu({}) {
    const zus = useFormDataStore();
    const printData = useMemo(() => {
        return zus.metaData.id
            ? {
                  item: {
                      type: zus.metaData.type,
                      slug: zus.metaData.salesId,
                      dispatchList: [],
                  },
                  overview: {
                      type: zus.metaData.type,
                      orderId: zus.metaData.salesId,
                  },
              }
            : null;
    }, [zus.metaData]);
    if (printData)
        return (
            <>
                <PrintMenuAction data={printData} />
                <PrintMenuAction pdf data={printData} />
            </>
        );

    return null;
}
