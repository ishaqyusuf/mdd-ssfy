import { useDebugConsole } from "@/hooks/use-debug-console";
import { useProduct } from "@/hooks/use-product";
import { useProductFilterParams } from "@/hooks/use-product-filter-params";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export function ProductComponents() {
  const prod = useProduct();

  return (
    <Tabs>
      <TabsList className="w-full flex" defaultValue={"slab"}>
        <TabsTrigger className="flex-1 text-center" value="slab">
          Door Slab Only
        </TabsTrigger>

        <TabsTrigger className="flex-1 text-center" value="door-component">
          Add Components
        </TabsTrigger>
      </TabsList>
      <TabsContent value="door-component">
        <ComponentBuilder />
      </TabsContent>
    </Tabs>
  );
}
function ComponentBuilder() {
  const trpc = useTRPC();
  const _ = useProductFilterParams();
  const n = useQuery(
    trpc.inventories.getStoreAddonComponentForm.queryOptions({
      variantId: _.filter.variantId,
    })
  );
  useDebugConsole(n.data);
  return (
    <div className="flex flex-col">
      <div className="p-4 bg-red-400"></div>
    </div>
  );
}
