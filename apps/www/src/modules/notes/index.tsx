import { NoteTagStatus, NoteTagTypes } from "@gnd/utils/constants";
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
    readonOnly?: boolean;
}
export default function Note(props: NoteProps) {
    const ctx = useNoteContext(props);
    const { notes } = ctx;

    return (
        <NoteProvider value={ctx}>
            <div className="">
                {!notes?.length && !props.readonOnly ? (
                    <div className="flex items-center justify-center gap-4 py-2">
                        {/* <div>No Note</div> */}
                        <NoteForm />
                    </div>
                ) : (
                    <>
                        {props.readonOnly || (
                            <div className="flex items-center justify-end gap-4 py-2">
                                {/* <div>No Note</div> */}
                                <NoteForm />
                            </div>
                        )}
                        {notes?.map((note) => (
                            <NoteLine key={note.id} note={note} />
                        ))}
                    </>
                )}
            </div>
        </NoteProvider>
    );
}
