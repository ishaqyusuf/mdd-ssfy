import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCommunityProjectSheet() {
  const { setParams } = useCommunityProjectParams();

  return (
    <div>
      <Button variant="outline" size="icon" onClick={() => setParams({})}>
        <Icons.Add />
      </Button>
    </div>
  );
}
