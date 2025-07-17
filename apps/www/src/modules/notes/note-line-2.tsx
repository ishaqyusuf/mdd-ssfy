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
import Image from "next/image";
import { env } from "@/env.mjs";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import Button from "@/components/common/button";
import { Colors, colorsObject, hexToRgba } from "@gnd/utils/colors";

export function NoteLine({ note }: { note: GetNotes[number] }) {
    const event = note?.events?.[0];
    const ctx = useNote();
    const [_note, _setNote] = useState(note);
    const pills = [note.subject, note.headline]?.filter(Boolean);
    const attachments = note?.tags
        ?.filter((t) => t.tagName === "attachment")
        .map((a) => a.tagValue);
    async function deleteNote() {
        await deleteNoteAction(note.id);
        ctx.deleteNote(note.id);
        toast.success("Note Deleted!");
    }
    const colors = ["red", "blue", "kuCrimson", "default"] as Colors[];
    const color = colorsObject[_note.color];
    async function changeColor(color: string) {
        await updateNoteAction(note.id, { color });
        _setNote((on) => ({ ...on, color }));
    }
    return (
        <div
            className={cn(
                "cursor-default flex flex-col items-start gap-s2 rounded-lg border p-3 text-left text-sm transition-all my-1.5",
            )}
            style={{
                backgroundColor: hexToRgba(color, 0.5),
            }}
        >
            <div className="flex w-full flex-col gap-1">
                <div className="flex items-center">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold">
                            {note.senderContact?.name}
                        </div>
                        <span className="flex h-2 w-2 rounded-full"></span>
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
                        "line-clamp-2 text-base py-1 text-muted-foreground font-semibold uppercase",
                    )}
                    style={{
                        color: color ? "black" : "inherit",
                    }}
                >
                    {note.note}
                </span>
            </div>
            <div className="">
                {attachments?.map((pathname, ai) => (
                    <Attachment key={ai} pathname={pathname} />
                ))}
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
                                                className={cn("size-4 rounded")}
                                                style={{
                                                    backgroundColor:
                                                        colorsObject?.[color],
                                                }}
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
function Attachment({ pathname }) {
    const [opened, setOpened] = useState(false);
    return (
        <AlertDialog open={opened} onOpenChange={setOpened}>
            <AlertDialogTrigger asChild>
                <Button
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpened(!opened);
                    }}
                    size="sm"
                    variant="ghost"
                    className="flex p-0 rounded-lg items-center space-x-2 hover:bg-secondary flex-1 size-[56px]"
                >
                    {/* <Icons.Notifications className="size-3.5" />
                            <span>Remind</span> */}
                    <div>
                        <Image
                            className="aspect-square"
                            src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
                            alt={pathname}
                            width={56}
                            height={56}
                        />
                        {/* <div className="sflex hidden gap-4">
                            <ConfirmBtn
                                trash
                                onClick={(e) => {
                                    // del(a.pathname)
                                    //     .then((e) => {
                                    //         console.log(e);
                                    //         attachments.remove(ai);
                                    //     })
                                    //     .catch((e) => {
                                    //         console.log(e);
                                    //     });
                                }}
                                type="button"
                            />
                        </div> */}
                    </div>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Attachment</AlertDialogTitle>
                    {/* <AlertDialogDescription>
                        Are you sure you want to send a reminder for this
                        invoice?
                    </AlertDialogDescription> */}
                </AlertDialogHeader>
                <div className="">
                    <Image
                        src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${pathname}`}
                        alt={pathname}
                        width={250}
                        height={250}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                    {/* <AlertDialogAction
                        onClick={() => {
                            // sendReminderMutation.mutate({
                            //     id,
                            //     date: new Date().toISOString(),
                            // });
                        }}
                        // disabled={sendReminderMutation.isPending}
                    >
                        Send Reminder
                    </AlertDialogAction> */}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
