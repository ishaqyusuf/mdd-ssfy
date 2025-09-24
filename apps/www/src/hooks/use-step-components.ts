import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

interface Props {}

export function useStepComponents(props: Props) {
    const trpc = useTRPC();
    const { data: components } = useSuspenseQuery(
        trpc.sales.getStepComponents.queryOptions(
            {},
            {
                enabled: false,
            },
        ),
    );
}
