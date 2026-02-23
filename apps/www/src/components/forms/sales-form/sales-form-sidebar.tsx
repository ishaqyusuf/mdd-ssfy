import { Sidebar } from "@gnd/ui/namespace";
import { SalesMetaForm } from "./sales-meta-form";
import { useSidebar } from "@gnd/ui/sidebar";
import { Footer } from "@/components/forms/sales-form/footer";
import { cn } from "@gnd/ui/cn";
import { ComponentProps } from "react";
interface Props extends ComponentProps<typeof Sidebar> {
    opened?: boolean;
}
export function SalesFormSidebar({
    className = "",
    opened = false,
    ...props
}: Props) {
    const sb = useSidebar();

    return (
        <Sidebar
            side="right"
            hidden={!sb.open && !opened}
            className={cn(
                "top-[var(--header-height)] h-[calc(100svh-var(--header-height))] border-l",
                className,
            )}
            {...props}
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

