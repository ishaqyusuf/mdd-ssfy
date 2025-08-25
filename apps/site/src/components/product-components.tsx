import { useDebugConsole } from "@/hooks/use-debug-console";
import { useProduct } from "@/hooks/use-product";
import { useProductFilterParams } from "@/hooks/use-product-filter-params";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gnd/ui/accordion";
import { Badge } from "@gnd/ui/badge";
import { Label } from "@gnd/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import NumberFlow from "@number-flow/react";
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
  const product = useProduct();
  const { addonComponent } = product;
  // const n = useQuery(
  //   trpc.inventories.getStoreAddonComponentForm.queryOptions({
  //     variantId: _.filter.variantId,
  //   })
  // );

  return (
    <div className="flex flex-col">
      {/* {JSON.stringify([
        product?.componentsProducts?.data,
        product.inventoryIds,
        product.addonComponent,
      ])}
      <span>....</span> */}
      <div className="p-4">
        <Accordion type="single" collapsible className="">
          {addonComponent?.subComponentInventory?.subComponents?.map(
            (sc, sci) => <Component subComponent={sc} key={sc.id} index={sci} />
          )}
        </Accordion>
      </div>
    </div>
  );
}
function Component({
  subComponent,
  index,
}: {
  subComponent: RouterOutputs["inventories"]["getStoreAddonComponentForm"]["subComponentInventory"]["subComponents"][number];
  index;
}) {
  const prod = useProduct();
  const { filter } = useProductFilterParams();
  const current = filter.subComponent?.[subComponent.inventoryCategory?.id];
  const component = prod.componentsProducts?.data?.find(
    (i) => i?.id === current?.inventoryId || subComponent?.defaultInventoryId
  );
  return (
    <AccordionItem value={`component-${index}`}>
      <AccordionTrigger className="flex gap-4 items-center">
        <div className="flex items-center flex-1 gap-2">
          <Label>{subComponent?.inventoryCategory?.title}:</Label>
          <span className="text-sm">{component?.title || "Value"}</span>
          <div className="flex-1"></div>
          <Badge variant="destructive">
            <NumberFlow value={10} prefix="+$" />
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ComponentProductsSelect catId={subComponent.inventoryCategory?.id} />
      </AccordionContent>
    </AccordionItem>
  );
}
function ComponentProductsSelect({ catId }) {
  return (
    <div>
      <p>{catId}</p>
    </div>
  );
}
