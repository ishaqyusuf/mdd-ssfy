import { useFilePreviewParams } from "@/hooks/use-file-preview-params";
import { Sheet, SheetContent, SheetHeader } from "@gnd/ui/sheet";
import { FileViewer } from "../file-viewer";
import { FileViewActions } from "../file-view-actions";

export function FileViewSheet() {
    const { params, apiPath, setParams } = useFilePreviewParams();

    const isOpen = Boolean(params.filePath || params.documentId);

    return (
        <Sheet
            open={isOpen}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <SheetContent style={{ maxWidth: 647 }}>
                <div className="flex flex-col flex-grow min-h-0 relative h-full w-full">
                    <SheetHeader className="mb-4 flex justify-between items-center flex-row">
                        <div className="min-w-0 flex-1 max-w-[70%] flex flex-row gap-2 items-end">
                            <h2 className="text-lg truncate flex-0">
                                {/* {data?.title ?? data?.name?.split("/").at(-1)} */}
                            </h2>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {/* @sts-expect-error - size is not typed (JSONB) */}
                                {/* {data?.metadata?.size &&
                                    formatSize(data?.metadata?.size)} */}
                            </span>
                        </div>
                        <FileViewActions />
                        <span>acbn</span>
                        {/* <DocumentActions showDelete={fullView} filePath={data?.pathTokens} /> */}
                    </SheetHeader>

                    <div className="h-full max-h-[763px] p-0 pb-4 overflow-x-auto scrollbar-hide">
                        <div className="flex flex-col flex-grow min-h-0 relative h-full w-full items-center justify-center">
                            <FileViewer
                                // url={`/api/proxy?filePath=vault/${data?.pathTokens?.join("/")}`}
                                url={apiPath}
                                //**// @ts-expect-error - mimetype is not typed (JSONB) */
                                mimeType={params?.mimeType}
                                // mimeType={data?.metadata?.mimetype}
                                maxWidth={565}
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

