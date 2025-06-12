import { useEffect, useState } from "react";
import AutoComplete from "@/components/_v1/common/auto-complete";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Menu } from "@/components/(clean-code)/menu";
import { Progress } from "@/components/(clean-code)/progress";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { useEnterSubmit } from "@/hooks/use-enter-submit";
import { formatDate } from "@/lib/use-day";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";

import { createNoteAction } from "./actions/create-note-action";
import { getNoteSuggestionsAction } from "./actions/get-note-suggestions";
import { GetNotes, getNotesAction } from "./actions/get-notes-action";
import { NoteTagStatus, NoteTagTypes } from "./constants";
import { NoteProvider, useNoteContext } from "./context";
import { NoteForm } from "./note-form";
import { NoteLine } from "./note-line-2";
import { TagFilters } from "./utils";

export interface NoteProps {
    tagFilters: TagFilters[];
    subject: string;
    headline?: string;
    typeFilters?: NoteTagTypes[];
    statusFilters?: NoteTagStatus[];
    admin?: boolean;
}
export default function Note(props: NoteProps) {
    const ctx = useNoteContext(props);
    const { notes } = ctx;

    return (
        <NoteProvider value={ctx}>
            <div className="">
                {!notes?.length ? (
                    <div className="flex items-center justify-center gap-4 py-2">
                        {/* <div>No Note</div> */}
                        <NoteForm />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-end gap-4 py-2">
                            {/* <div>No Note</div> */}
                            <NoteForm />
                        </div>
                        {notes?.map((note) => (
                            <NoteLine key={note.id} note={note} />
                        ))}
                    </>
                )}
            </div>
        </NoteProvider>
    );
}
