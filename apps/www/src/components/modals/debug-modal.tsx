import { useDebuggerParams } from "@/hooks/use-debug-params";
import { CustomModal, CustomModalContent } from "./custom-modal";

export let openDebugToast: any = null;
export function DebugModal() {
    const { opened, open, debugTitle, debugContent, setParams } =
        useDebuggerParams();
    openDebugToast = open;
    return (
        <CustomModal
            size="2xl"
            title={debugTitle}
            open={opened}
            onOpenChange={() => setParams(null)}
        >
            <CustomModalContent>
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded bg-muted p-4 text-sm">
                    {debugContent}
                </pre>
            </CustomModalContent>
        </CustomModal>
    );
}

