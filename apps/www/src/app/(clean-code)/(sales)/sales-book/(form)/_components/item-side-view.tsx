import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";

export default function ItemSideView({ itemUid }) {
    const zus = useFormDataStore();

    if (!zus.kvFormItem?.[itemUid]?.sideView) return null;
    return <div className="hidden lg:w-1/5 lg:block lg:border-l"></div>;
}
