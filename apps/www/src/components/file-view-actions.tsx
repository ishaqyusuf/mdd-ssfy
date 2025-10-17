import { useFilePreviewParams } from "@/hooks/use-file-preview-params";
import { openLink } from "@/lib/open-link";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";

export function FileViewActions() {
    const { params, apiPath } = useFilePreviewParams();
    return (
        <div className="flex flex-row">
            <Button
                onClick={(e) => {
                    openLink(apiPath, null, true);
                }}
            >
                <Icons.print className="size-4" />
            </Button>
        </div>
    );
}
