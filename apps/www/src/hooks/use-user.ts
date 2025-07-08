import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUserProfileUpdate() {
    const trp = useTRPC();
    const queryClient = useQueryClient();
    // return useMutation(
    //     trpc.
    // )
}
