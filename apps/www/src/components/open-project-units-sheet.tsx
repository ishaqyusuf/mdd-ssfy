import { useHomeModal } from "@/app/(v1)/(loggedIn)/community/units/home-modal";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenProjectUnitSheet() {
    const { setParams } = useProjectUnitParams();
    const x = useHomeModal();
    return (
        <div>
            <Button
                onClick={
                    () => x.open(null)
                    // setParams({
                    //     openProjectUnitId: -1,
                    // })
                }
            >
                <Icons.Add />
                New
            </Button>
        </div>
    );
}

