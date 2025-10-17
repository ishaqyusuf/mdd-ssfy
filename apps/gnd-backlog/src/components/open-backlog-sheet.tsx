import { useBacklogParams } from "@/hooks/use-backlog-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenBacklogSheet() {
  const { setParams } = useBacklogParams();

  return (
    <div>
      <Button variant="outline" size="icon" onClick={() => setParams({})}>
        <Icons.Add />
      </Button>
    </div>
  );
}
