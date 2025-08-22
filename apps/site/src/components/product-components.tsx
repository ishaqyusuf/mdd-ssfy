import { useProduct } from "@/hooks/use-product";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

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
        <span>Build Components</span>
      </TabsContent>
    </Tabs>
  );
}
