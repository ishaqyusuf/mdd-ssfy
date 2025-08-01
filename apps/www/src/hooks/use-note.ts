import { useTRPC } from "@/trpc/client";
import { noteTag } from "@gnd/utils/note";
import { useMutation } from "@tanstack/react-query";

export function useNote() {
    const trpc = useTRPC();

    const { mutate } = useMutation(
        trpc.notes.saveNote.mutationOptions({
            onSuccess(data, variables, context) {},
        }),
    );
    return {
        mutate,
        tag: noteTag,
    };
}

