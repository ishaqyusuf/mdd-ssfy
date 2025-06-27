import { batchPrefetch, trpc } from "@/trpc/server";
import { Button } from "@gnd/ui/button";
export default async function Page() {
  batchPrefetch([trpc.tasks.get.infiniteQueryOptions()]);
  return (
    <div>
      <Button>Submit</Button>
    </div>
  );
}
