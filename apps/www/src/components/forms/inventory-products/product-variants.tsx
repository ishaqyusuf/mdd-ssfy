import FormInput from "@/components/common/controls/form-input";
import { useDebugConsole } from "@/hooks/use-debug-console";
import { useTRPC } from "@/trpc/client";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useProduct } from "./context";
import { useZodForm } from "@/hooks/use-zod-form";
import { variantFormSchema } from "@sales/schema";

export function ProductVariants({ inventoryId }) {
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.inventories.inventoryVariants.queryOptions(
            {
                id: inventoryId,
            },
            {
                enabled: !!inventoryId,
            },
        ),
    );
    return <div></div>;
}

