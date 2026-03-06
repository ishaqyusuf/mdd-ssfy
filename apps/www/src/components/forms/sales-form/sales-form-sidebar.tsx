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
                "top-[var(--header-height)] h-[calc(100vh_-_var(--header-height))] border-l border-slate-200/80 bg-white/95 backdrop-blur",
                className,
            )}
            {...props}
        >
            <Sidebar.Content className="flex w-[22rem] min-h-0 flex-col overflow-hidden">
                <div className="border-b border-slate-200/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Sales Panel
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                        Summary And Actions
                    </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                    <SalesMetaForm />
                </div>
            </Sidebar.Content>
            <Sidebar.Footer className="border-t border-slate-200/80 bg-white/95 px-4 py-3">
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

