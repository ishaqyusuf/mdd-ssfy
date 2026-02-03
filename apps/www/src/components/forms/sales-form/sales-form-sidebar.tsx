import { Sidebar } from "@gnd/ui/composite";
import { SalesMetaForm } from "./sales-meta-form";
import { useSidebar } from "@gnd/ui/sidebar";
import { Footer } from "@/components/forms/sales-form/footer";
export function SalesFormSidebar({ onClose = null }) {
    const sb = useSidebar();

    return (
        <Sidebar
            side="right"
            hidden={!sb.open}
            // collapsible="none"
            className="top-(--header-height) h-[calc(100svh-var(--header-height))]! stickys top-0s hidden h-svhs border-l lg:flex"
        >
            <Sidebar.Content className="w-sm">
                {/* <span>abc</span> */}
                <SalesMetaForm />
            </Sidebar.Content>
            <Sidebar.Footer>
                <Footer />
            </Sidebar.Footer>
        </Sidebar>
    );
    // return (
    //     <div className="w-full lg:w-96 h-full lg:mb-4 lg:mt-20 lg:h-[calc(100vh-6rem)] lg:fixed lg:right-0 lg:top-0 bg-white border lg:rounded-lg border-gray-200 overflow-y-auto scrollbar-hide lg:mr-2 lg:shadow-lg">
    //         <div className="p-6 min-h-screen pb-28 space-y-6">
    //             <SalesMetaForm />
    //         </div>
    //     </div>
    // );
}

