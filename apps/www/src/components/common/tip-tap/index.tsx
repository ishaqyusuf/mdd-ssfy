"use client";

import Document from "@tiptap/extension-document";
import Mention from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import suggestion from "./suggestion";

import "./style.scss";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Controller,
    ControllerProps,
    FieldPath,
    FieldValues,
    useFormContext,
} from "react-hook-form";

import { Label } from "@gnd/ui/label";

interface Props {
    mentions?: any;
    value?;
    onChange?;
    readOnly?: boolean;
    label?: string;
    className?: string;
}
function Tiptap<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
    TOptionType = any,
>({
    mentions,
    value: _value,
    className,
    onChange: _onChange,
    label,
    readOnly,
    control,
    name,
}: Partial<ControllerProps<TFieldValues, TName>> & Props) {
    function Render({ value, onChange }) {
        useEffect(() => {
            if (value != editor?.getHTML()) {
                editor?.commands.setContent(value);
            }
        }, [value]);
        const editor = useEditor({
            onUpdate(props) {
                let text = props.editor.getHTML();

                onChange && onChange(text);
                // form && name && form.setValue(name, text as any);
            },
            editable: !readOnly,
            extensions: [
                StarterKit,
                Document,
                Paragraph,
                Text,
                mentions &&
                    Mention.configure({
                        HTMLAttributes: {
                            class: "mention",
                        },
                        suggestion: suggestion(mentions),
                    }),
                // CharacterCount.configure({
                //   limit,
                // }),
            ],
            content: value,
            editorProps: {
                attributes: {
                    class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl smx-auto focus:outline-none h-full flex-1",
                },
            },
        });
        return (
            <div className="grid gap-4">
                {label && <Label>{label}</Label>}
                <EditorContent
                    className={cn(
                        "mx-1 rounded-lg border px-3 py-2",
                        "flex h-[30vh]  flex-col overflow-auto",
                        className,
                        editor?.isFocused &&
                            "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                    editor={editor}
                />
            </div>
        );
    }
    if (control && name)
        return (
            <Controller
                name={name}
                control={control}
                render={({ field }) => <Render {...field} />}
            />
        );
    return <Render value={_value} onChange={_onChange} />;
}

export default Tiptap;
