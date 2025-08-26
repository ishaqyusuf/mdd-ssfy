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
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { generateRandomNumber, sum } from "@gnd/utils";
import NumberFlow from "@number-flow/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Grid, List } from "lucide-react";
import { useMemo } from "react";
import { PlaceholderImage } from "./placeholder-image";
import Image from "next/image";

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
        <FinalEstimate />
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
  const current = useMemo(() => {
    return filter.subComponent?.[subComponent.inventoryCategory?.id];
  }, [filter.subComponent, subComponent.inventoryCategory?.id]);
  const component = prod.componentsProducts?.data?.find(
    (i) => i?.id === current?.inventoryId || subComponent?.defaultInventoryId
  );

  return (
    <AccordionItem value={`component-${index}`}>
      <AccordionTrigger className="flex gap-4 items-center">
        <div className="flex items-center flex-1 gap-2">
          <Label>{subComponent?.inventoryCategory?.title}:</Label>
          <span className="text-sm">
            {component?.title || "click to select"}
          </span>
          <div className="flex-1"></div>
          {!current?.price || (
            <Badge variant="destructive">
              <NumberFlow value={current?.price} prefix="+$" />
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ComponentProductsSelect
          selectedVariantId={current?.variantId}
          catId={subComponent.inventoryCategory?.id}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
function ComponentProductsSelect({ catId, selectedVariantId }) {
  const { filter, setFilter } = useProductFilterParams();
  const trpc = useTRPC();
  const { data: products, isPending } = useQuery(
    trpc.storefront.getComponentsListing.queryOptions({
      categoryId: catId,
      // TODO:  pull all attributes and add to componentListing for correct variant matching!
      attributes: [],
    })
  );
  const product = useProduct();
  const prodSubCategories = product?.product?.subCategories;
  const result = useMemo(() => {
    const list = products?.list?.map((l) => {
      const active = l.subCategories
        .map((a) => {
          const m = prodSubCategories.find((ps) => ps.id === a.id);
          if (m) {
            return m.items.some((i) => a.items.some((ai) => ai.id === i.id));
          }
          return true;
        })
        .every(Boolean);
      return {
        ...l,
        active,
      };
    });
    return {
      list,
    };
  }, [products, prodSubCategories]);
  useDebugConsole({ products });
  // TODO: before getting sub components, check each sub components categories, pull category variant attributes, compare to the main product page category attributes and subcomponents, if not available, add as part of sub components, if multiple variant available for a component, and it's attribute is not yet picked (other sub components), then make it not pickable until it's attribute is picked.
  const grid = product.showSubComponentImage;
  const Render = isPending ? (
    <>
      {[...Array(3)].map((a, i) => (
        <Skeleton
          key={i}
          style={{
            width: `calc(${generateRandomNumber(2)}%)`,
          }}
          className={cn("h-8")}
        ></Skeleton>
      ))}
    </>
  ) : (
    <>
      {result?.list?.map((p) => (
        <div className={cn(!p?.active && "hidden")} key={p.id}>
          <Button
            onClick={(e) => {
              const value = {
                ...filter.subComponent,
              };
              if (value[catId]?.inventoryId === p.id) {
                delete value[catId];
              } else
                value[catId] = {
                  inventoryId: p.id,
                  qty: 1,
                  variantId: p.variantId,
                  price: p.price,
                };
              setFilter({
                subComponent: value,
              });
              console.log(value);
            }}
            size="sm"
            className={cn("relative  p-0 flex  gap-2", grid && "w-full h-auto")}
            variant={selectedVariantId == p.variantId ? "default" : "secondary"}
          >
            <div className="flex w-full flex-col">
              <div
                className={cn(
                  !grid ? "hidden" : "h-36 flex flex-col bg-white border",
                  selectedVariantId == p.variantId && "bg-muted"
                )}
              >
                <AspectRatio ratio={1.5}>
                  {!p.image ? (
                    <PlaceholderImage className="rounded-none" asChild />
                  ) : (
                    <Image
                      src={p.image}
                      alt={p.name}
                      className="w-full h-64 object-contain scale-90 group-hover:scale-105 transition-transform  duration-300"
                      // sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, (min-width: 475px) 50vw, 100vw"
                      // fill
                      sizes="(min-width: 1024px) 10vw"
                      fill
                      loading="lazy"
                    />
                  )}
                </AspectRatio>
              </div>
              <div
                className={cn(
                  "flex min-h-8 justify-between items-center text-start",
                  !p.price ? "px-2" : ""
                )}
              >
                <div className="flex-1 py-2 px-2">{p.name}</div>
                {!p.price || (
                  <div className="bg-destructive py-2 min-w-12 justify-center font-semibold right-0 h-full flex items-center px-1 text-destructive-foreground">
                    <NumberFlow value={p.price} prefix="+$" />
                  </div>
                )}
              </div>
            </div>
          </Button>
        </div>
      ))}
    </>
  );

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <div className="flex border rounded-md">
          <Button
            variant={product.showSubComponentImage ? "default" : "ghost"}
            size="sm"
            className="rounded-l-md"
            onClick={() => product.setShowSubComponentImage(true)}
          >
            <Grid className="size-3" />
          </Button>
          <Button
            variant={!product.showSubComponentImage ? "default" : "ghost"}
            size="sm"
            onClick={() => product.setShowSubComponentImage(false)}
            className="rounded-r-md"
          >
            <List className="size-3" />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          product.showSubComponentImage
            ? "grid grid-cols-2 gap-4"
            : "flex gap-4 flex-wrap"
        )}
      >
        {Render}
      </div>
    </div>
  );
}
function FinalEstimate() {
  const ctx = useProduct();
  const { setFilter, filter } = useProductFilterParams();
  const total = useMemo(() => {
    const qty = filter?.qty || 1;
    const doorPrice = ctx?.variant?.price;
    const componentTotal = sum(
      Object.entries(filter.subComponent || {}).map(([a, ai]) =>
        sum([ai.price * ai.qty])
      )
    );
    return sum([doorPrice * qty, sum([componentTotal * qty])]);
  }, [filter, ctx.variant]);
  return (
    <>
      <div className="text-3xl font-bold text-gray-900">
        <NumberFlow prefix="$ " value={total} />
      </div>
    </>
  );
}
