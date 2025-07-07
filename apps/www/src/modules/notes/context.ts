import { createContext, useContext, useEffect, useState } from "react";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { NoteProps } from ".";
import { GetNotes, getNotesAction } from "./actions/get-notes-action";
import { NoteTagNames } from "@gnd/utils/constants";
import { timeout } from "@/lib/timeout";

export const noteContext = createContext<ReturnType<typeof useNoteContext>>(
    null as any,
);
export const NoteProvider = noteContext.Provider;
export const useNoteContext = (props: NoteProps) => {
    const [notes, setNotes] = useState<GetNotes>([]);
    useEffect(() => {
        const fn = async () => {
            await timeout(120);
            const tagQuery: SearchParamsType = {};
            ["status", "type"].map((s) => {
                if (!props.tagFilters.find((a) => a.tagName == s))
                    props.tagFilters.push({
                        tagName: s as any,
                        tagValue: "",
                    });
            });
            props.tagFilters.map((f) => {
                if (f.tagName == "type" || f.tagName == "status") return;
                tagQuery[`note.${f.tagName}` as any] = f.tagValue;
            });
            getNotesAction(tagQuery).then((result) => {
                console.log({ notes: result, tagQuery });

                setNotes(
                    result.filter((note) => {
                        let validations = [];
                        let status = note.tags.find(
                            (t) => t.tagName == "status",
                        )?.tagValue;
                        if (status)
                            validations.push(
                                props.statusFilters.includes(status as any),
                            );
                        let type = note.tags.find(
                            (t) => t.tagName == ("type" as NoteTagNames),
                        )?.tagValue;
                        if (type)
                            validations.push(
                                props.typeFilters.includes(type as any),
                            );
                        return validations.every(Boolean);
                    }),
                );
            });
        };
        fn();
    }, []);
    return {
        notes,
        props,
        ...props,
        setNotes,
        deleteNote(id) {
            setNotes((prev) => {
                return [...prev].filter((a) => a.id != id);
            });
        },
    };
};
export const useNote = () => useContext(noteContext);
