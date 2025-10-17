import { SalesMetaForm } from "./sales-meta-form";

export function SalesFormSidebar({ onClose = null }) {
    return (
        <div className="w-full lg:w-96 h-full lg:mb-4 lg:mt-20 lg:h-[calc(100vh-6rem)] lg:fixed lg:right-0 lg:top-0 bg-white border lg:rounded-lg border-gray-200 overflow-y-auto scrollbar-hide lg:mr-2 lg:shadow-lg">
            <div className="p-6 min-h-screen pb-28 space-y-6">
                <SalesMetaForm />
            </div>
        </div>
    );
}

