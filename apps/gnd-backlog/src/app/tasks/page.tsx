import { loadSortParams } from "@/hooks/use-sort-params";
import { loadTaskFilterParams } from "@/hooks/use-task-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { Button } from "@gnd/ui/button";
export default async function Page(props) {
  // const searchParams = await props.searchParams;
  // const filter = loadTaskFilterParams(searchParams);
  // const { sort } = loadSortParams(searchParams);
  // batchPrefetch([
  //   trpc.tasks.get.infiniteQueryOptions({
  //     ...filter,
  //     sort,
  //   }),
  // ]);
  // return (
  //   <div>
  //     <Button>Submit</Button>
  //     <DataTable></DataTable>
  //   </div>
  // );
}
