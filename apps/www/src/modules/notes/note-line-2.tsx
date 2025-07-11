import { Menu } from "@/components/(clean-code)/menu";
import { GetNotes } from "./actions/get-notes-action";
import { Progress } from "@/components/(clean-code)/progress";
import { formatDate } from "@/lib/use-day";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { BellIcon } from "lucide-react";
import { deleteNoteAction } from "./actions/delete-note-action";
import { useNote } from "./context";
import { toast } from "sonner";
import { updateNoteAction } from "./actions/update-note-action";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Env } from "@/components/env";

const listVariant = cva(
    "cursor-default flex flex-col items-start gap-s2 rounded-lg border p-3 text-left text-sm transition-all my-1.5",
    {
        variants: {
            color: {
                default: "bg-white border-gray-300",
                green: "bg-green-300 border-green-300",
                orange: "bg-orange-300 border-orange-300",
                red: "bg-red-300 border-red-600",
                blue: "bg-blue-300 border-blue-300",
            },
        },
        defaultVariants: {},
    },
);
const noteColorListVariant = cva("size-4 rounded", {
    variants: {
        color: {
            red: "bg-red-500",
            blue: "bg-blue-500",
            green: "bg-green-500",
            orange: "bg-orange-500",
        },
    },
    defaultVariants: {},
});
const noteColorVariant = cva(
    "line-clamp-2 text-base py-1 text-muted-foreground font-semibold uppercase",
    {
        variants: {
            color: {
                red: "text-black",
                blue: "text-black",
                green: "text-black",
            },
        },
        defaultVariants: {},
    },
);
export function NoteLine({ note }: { note: GetNotes[number] }) {
    const event = note?.events?.[0];
    const ctx = useNote();
    const [_note, _setNote] = useState(note);
    const pills = [note.subject, note.headline]?.filter(Boolean);
    async function deleteNote() {
        await deleteNoteAction(note.id);
        ctx.deleteNote(note.id);
        toast.success("Note Deleted!");
    }
    const colors = ["red", "blue", "default"];
    async function changeColor(color: string) {
        await updateNoteAction(note.id, { color });
        _setNote((on) => ({ ...on, color }));
    }
    return (
        <div
            className={cn(
                listVariant({
                    color: _note.color as any,
                }),
            )}
        >
            <div className="flex w-full flex-col gap-1">
                <div className="flex items-center">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold">
                            {note.senderContact?.name}
                        </div>
                        <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                    </div>
                    <div className="ml-auto text-xs font-bold text-muted-foreground">
                        {formatDate(note.createdAt)}
                    </div>
                </div>
                {/* <div className="text-xs font-medium">
                    Re: Question about Budget
                </div> */}
            </div>
            <div className="flex">
                <span
                    className={cn(
                        noteColorVariant({ color: _note.color as any }),
                    )}
                >
                    {note.note}
                </span>
            </div>
            <div className="flex w-full items-center gap-2">
                {pills.map((p, i) => (
                    <div
                        className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 uppercase"
                        key={i}
                    >
                        {p}
                    </div>
                ))}
                {!event || (
                    <div className="flex gap-2 text-xs font-semibold border p-0.5 rounded shadow-sm bg-red-100 font-mono items-center">
                        <BellIcon className="size-4" />
                        <span>{formatDate(event.eventDate)}</span>
                    </div>
                )}
                <div className="flex-1"></div>
                <ConfirmBtn disabled={!ctx.admin} trash onClick={deleteNote} />
                <Menu
                    variant={note?.color ? "default" : "outline"}
                    disabled={!ctx.admin}
                >
                    <Menu.Item
                        SubMenu={
                            <>
                                {colors.map((color) => (
                                    <Menu.Item
                                        key={color}
                                        shortCut={
                                            <div
                                                className={cn(
                                                    noteColorListVariant({
                                                        color: color as any,
                                                    }),
                                                )}
                                            ></div>
                                        }
                                        onClick={() => changeColor(color)}
                                    >
                                        <span className="capitalize">
                                            {color}
                                        </span>
                                    </Menu.Item>
                                ))}
                            </>
                        }
                    >
                        Note Color
                    </Menu.Item>
                </Menu>
            </div>
        </div>
    );
}
function NoteTag({ tag, note }) {
    if (!tag?.tagValue) return null;
    return (
        <Menu
            Trigger={
                <Progress>
                    <Progress.Status noDot>{tag.tagValue}</Progress.Status>
                </Progress>
            }
        >
            <Menu.Item>Item 1</Menu.Item>
        </Menu>
    );
}
