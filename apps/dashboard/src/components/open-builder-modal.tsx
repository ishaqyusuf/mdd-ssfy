import { useBuilderParams } from "@/hooks/use-builder-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenBuilderModal() {
    const { setParams } = useBuilderParams();

    return (
        <div>
            <Button
                variant="outline"
                size="icon"
                onClick={() =>
                    setParams({
                        openBuilderId: -1,
                    })
                }
            >
                <Icons.Add />
            </Button>
        </div>
    );
}

