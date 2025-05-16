import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import Portal from "@/components/_v1/portal";

export function FormWatcher({}) {
    const z = useFormDataStore();
    if (z.metaData?.pricing?.grandTotal === z?.oldGrandTotal) return null;
    return (
        <Portal nodeId={"pageTab"}>
            <div className="bg-red-300 text-center w-full">
                <span className="">data not saved</span>
            </div>
        </Portal>
    );
}
