import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenProjectUnitSheet() {
    const { setParams } = useProjectUnitParams();

    return (
        <div>
            <Button
                variant="outline"
                size="icon"
                onClick={() =>
                    setParams({
                        openProjectUnitId: -1,
                    })
                }
            >
                <Icons.Add />
            </Button>
        </div>
    );
}

