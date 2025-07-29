import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { PackingProgress } from "./packing-progress";
import { PackingItem } from "./packing-item";
import { PackingItemProvider, usePacking } from "@/hooks/use-sales-packing";
import { PackingItemForm } from "./packing-item-form";
import { PackingItemListings } from "./packing-item-listings";

export function PackingItemsList() {
    const { data, packItemUid } = usePacking();
    return (
        <Card>
            <CardHeader className="bg-muted/20">
                <div className="space-y-3">
                    <CardTitle className="text-lg">Packing Items</CardTitle>
                    <PackingProgress />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-4">
                    {data?.dispatchItems.map((item, index) => (
                        <PackingItemProvider
                            args={[
                                {
                                    item,
                                },
                            ]}
                            key={item.uid}
                        >
                            <Card className="">
                                {/* <AccordionItem value={item?.uid}>
                                    <AccordionContent>
                                        <PackingItemForm />
                                        <PackingItemListings />
                                    </AccordionContent>
                                </AccordionItem> */}
                                <PackingItem />
                                {item.uid != packItemUid || (
                                    <>
                                        <PackingItemForm />
                                        <PackingItemListings />
                                    </>
                                )}
                            </Card>
                        </PackingItemProvider>
                    ))}
                </div>
                {/* </AccordionItem> */}
            </CardContent>
        </Card>
    );
}

