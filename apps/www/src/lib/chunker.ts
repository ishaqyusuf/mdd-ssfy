import { useLoadingToast } from "@/hooks/use-loading-toast";
import { toast } from "sonner";

interface Props {
    worker;
    list;
    chunkSize?;
    loadingToast?: ReturnType<typeof useLoadingToast>;
}
export function chunker({ worker, list, chunkSize = 50, loadingToast }: Props) {
    let index = 0;
    // const chunkSize = 50;
    let toastId;
    let cancel = false;

    function cancelProcessing() {
        cancel = true;
        toast.dismiss(toastId);
        if (loadingToast) loadingToast.error(`Processing cancelled`);
        else toast("Processing canceled.");
    }

    async function processNextChunk() {
        if (cancel) return;

        if (index >= list.length) {
            if (loadingToast) loadingToast.success("Processing Complete!");
            else {
                toast.dismiss(toastId);
                toast.success("Processing complete!");
            }
            return;
        }

        const chunk = list.slice(index, index + chunkSize);

        const resp = await worker(chunk);

        index += chunkSize;
        const text = `Processing items ${index - chunkSize + 1} to ${index} of ${
            list?.length
        }`;
        if (loadingToast) {
            loadingToast.display({
                title: "Processing",
                description: text,
                duration: Number.POSITIVE_INFINITY,
            });
        } else {
            toastId = toast(text, {
                action: {
                    label: "Cancel",
                    onClick: cancelProcessing,
                },
                duration: 2000,
            });
        }
        // await processNextChunk();
        setTimeout(processNextChunk, 1000); // Automatically process the next chunk
    }
    if (loadingToast) {
        processNextChunk();
        loadingToast.display({
            title: "Processing",
            description: `Processing started`,
            duration: Number.POSITIVE_INFINITY,
        });
    } else
        toast.promise(
            processNextChunk(),
            {
                loading: "Processing...",
                success: "Processing started...",
                error: "Error during processing!",
            },
            // { id: "chunk-toast" } // Ensures reuse of a single toast
        );
}
